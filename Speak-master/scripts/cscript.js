"use strict";

(function() {
    let showButton = true;
    let extensionEnabled = true;

    function loadSettings() {
        showButton = localStorage.getItem("showButton") !== "false";
        extensionEnabled = localStorage.getItem("extensionEnabled") !== "false";
        if (btn) {
            btn.style.display = (extensionEnabled && showButton) ? 'flex' : 'none';
        }
    }

    const styleId = 'tts-precise-v27-magnetic-field';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .tts-word { display: inline !important; position: relative !important; }
            .word-highlight { 
                background-color: #2ecc71 !important; 
                color: #000 !important; 
                font-weight: bold !important;
                border-radius: 2px !important;
                box-shadow: 0 0 5px #2ecc71;
            }
            #tts-global-play-btn {
                position: absolute !important;
                z-index: 2147483647 !important;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                background: #1a1a1a !important; 
                color: #ffffff !important;      
                border: 1px solid #444 !important; 
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 18px;
                line-height: 1;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                transition: transform 0.1s, background 0.3s;
                user-select: none;
                pointer-events: auto !important;
            }
            .tts-block-hover { 
                position: relative !important;
                outline: 2px dashed rgba(46, 204, 113, 0.3) !important;
            }
            .tts-block-hover::before {
                content: "";
                position: absolute;
                top: 0;
                bottom: 0;
                left: -70px;
                width: 70px;
                background: transparent;
                pointer-events: auto !important;
                z-index: 2147483646;
            }
            #tts-global-play-btn.loading {
                background: #2ecc71 !important;
                transform: scale(1.1);
            }
        `;
        document.documentElement.appendChild(style);
    }

    let btn = document.getElementById('tts-global-play-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'tts-global-play-btn';
        btn.innerHTML = '🔊';
        document.body.appendChild(btn);
    }

    let currentTarget = null;
    let hideTimer = null;
    let hoverActivateTimer = null;
    let wordSpans = [];

    const selectors = [
        '#content-text', 'yt-attributed-string', 'ytd-expander', 
        '.T286Pc', '.IaGLZe', '.dF3vjf', '.Y3BBE', '.HxTRcb', 
        '.postcolor', '.post_body', '.post_wrap', '.post', 'span.post',
        'p', 'article', 'section', '.VwiC3b', 'li', 'mark',
        '.postbody', 'table[id^="post_"]',
        'span[data-subtree]',
        'span.css-1jxf684',
        'h1[data-view-component="true"]'
    ];

    function getCleanText(el) {
        if (!el) return "";
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button, style, script, svg, img, small, [aria-hidden="true"], .txxDge, .signature, .gensmall, .vDOt8c, .pxxQye').forEach(n => n.remove());
        let text = clone.innerText.replace(/🔊/g, '').replace(/\s+/g, ' ').trim();
        text = text.replace(/^\s*\S+\s*<br>\s*/i, '').trim();
        return text;
    }

    function clearSpans() {
        wordSpans.forEach(span => {
            if (span.parentNode) span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
        });
        wordSpans = [];
    }

    function prepareWords(container) {
        clearSpans();
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let node, nodes = [];
        while (node = walker.nextNode()) {
            if (!node.parentElement.closest('script, style, button, svg, small')) nodes.push(node);
        }
        let offset = 0;
        nodes.forEach(textNode => {
            const parent = textNode.parentNode;
            const tokens = textNode.textContent.split(/(\s+)/);
            const fragment = document.createDocumentFragment();
            tokens.forEach(token => {
                if (token.trim().length > 0) {
                    const span = document.createElement('span');
                    span.className = 'tts-word';
                    span.textContent = token;
                    span.setAttribute('data-start', offset);
                    wordSpans.push(span);
                    fragment.appendChild(span);
                } else {
                    fragment.appendChild(document.createTextNode(token));
                }
                offset += token.length;
            });
            parent.replaceChild(fragment, textNode);
        });
    }

    function getFirstCharBounds(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (!node.parentElement.closest('style, script, #avatar, small, .post_edit')) {
                const text = node.textContent;
                for (let i = 0; i < text.length; i++) {
                    if (text[i].trim().length > 0) {
                        const range = document.createRange();
                        range.setStart(node, i);
                        range.setEnd(node, i + 1);
                        const rect = range.getBoundingClientRect();
                        if (rect.width > 0) return rect;
                    }
                }
            }
        }
        return null;
    }

    function showBtn(el) {
        if (!el || !extensionEnabled || !showButton) return;
        const firstCharRect = getFirstCharBounds(el);
        if (!firstCharRect) return;
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        btn.style.top = `${scrollY + firstCharRect.top}px`;
        btn.style.left = `${Math.max(5, scrollX + firstCharRect.left - 60)}px`;
        btn.style.display = 'flex';
        if (currentTarget && currentTarget !== el) {
            currentTarget.classList.remove('tts-block-hover');
        }
        currentTarget = el;
        currentTarget.classList.add('tts-block-hover');
    }

    function hideBtn() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (!btn.matches(':hover') && (!currentTarget || !currentTarget.matches(':hover'))) {
                btn.style.display = 'none';
                if (currentTarget) currentTarget.classList.remove('tts-block-hover');
            }
        }, 600);
    }

    document.addEventListener('mouseover', (e) => {
        if (!extensionEnabled) return;
        const el = e.target;
        if (el.closest('#tts-global-play-btn')) {
            if (hideTimer) clearTimeout(hideTimer);
            return;
        }
        let target = el.closest(selectors.join(', '));
        if (target && target.innerText.trim().length > 10) {
            if (hideTimer) clearTimeout(hideTimer);
            showBtn(target);
        } else {
            hideBtn();
        }
    }, true);

    btn.addEventListener('mouseenter', () => {
        if (!extensionEnabled) return;
        if (hideTimer) clearTimeout(hideTimer);
        btn.classList.add('loading');
        hoverActivateTimer = setTimeout(() => {
            if (currentTarget) {
                const text = getCleanText(currentTarget);
                if (text) {
                    prepareWords(currentTarget);
                    chrome.runtime.sendMessage({ method: "speak", text: text });
                }
            }
            btn.classList.remove('loading');
        }, 400);
    });

    btn.addEventListener('mouseleave', () => {
        if (hoverActivateTimer) clearTimeout(hoverActivateTimer);
        btn.classList.remove('loading');
        hideBtn();
    });

    window.addEventListener("mousedown", (e) => {
        if (!extensionEnabled) return;
        if (e.button === 1) {
            const target = e.target.closest(selectors.join(', '));
            const selection = window.getSelection().toString();
            const text = selection || (target ? getCleanText(target) : "");
            if (text.trim().length > 0) {
                e.preventDefault();
                if (target && !selection) prepareWords(target);
                chrome.runtime.sendMessage({ method: "speak", text: text.trim() });
            }
        }
    }, true);

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.method === "highlight_word") {
            const idx = msg.charIndex;
            wordSpans.forEach(span => {
                const start = parseInt(span.getAttribute('data-start'));
                if (idx >= start && idx < start + span.textContent.length) {
                    span.classList.add('word-highlight');
                } else {
                    span.classList.remove('word-highlight');
                }
            });
        }
        if (msg.method === "end_speech") {
            setTimeout(clearSpans, 1000);
        }
        if (msg.method === "updateSettings") {
            const settings = msg.settings;
            if (settings.showButton !== undefined) showButton = settings.showButton;
            if (settings.extensionEnabled !== undefined) {
                extensionEnabled = settings.extensionEnabled;
                if (!extensionEnabled) {
                    chrome.runtime.sendMessage({ method: "stopSpeech" });
                    clearSpans();
                    btn.style.display = 'none';
                    if (currentTarget) {
                        currentTarget.classList.remove('tts-block-hover');
                        currentTarget = null;
                    }
                } else {
                    btn.style.display = (showButton && extensionEnabled) ? 'flex' : 'none';
                }
            }
            if (!extensionEnabled) return;
            btn.style.display = (showButton && extensionEnabled) ? 'flex' : 'none';
        }
    });

    loadSettings();
    btn.style.display = (extensionEnabled && showButton) ? 'flex' : 'none';
})();
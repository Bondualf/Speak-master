"use strict";

let currentSpeakingText = "";
let isSpeaking = false;

function stopAll(tabId) {
    chrome.tts.stop();
    isSpeaking = false;
    currentSpeakingText = "";
    if (tabId) {
        chrome.tabs.sendMessage(tabId, { method: "end_speech" }).catch(() => {});
    }
}

function startSpeaking(text, tabId) {
    const enabled = localStorage.getItem("extensionEnabled") !== "false";
    if (!enabled) {
        return;
    }

    const cleanText = text.trim();
    
    if (isSpeaking && currentSpeakingText === cleanText) {
        stopAll(tabId);
        return;
    }

    chrome.tts.stop();
    currentSpeakingText = cleanText;

    if (!cleanText) return;

    const rawRate = parseFloat(localStorage.getItem("rateValue") || "1.0");
    const rawPitch = parseFloat(localStorage.getItem("pitch") || "4.0");
    const rawVolume = parseFloat(localStorage.getItem("volume") || "1.0");
    const voiceName = localStorage.getItem("voice");

    const options = {
        rate: Math.min(Math.max(rawRate, 0.1), 10.0),
        pitch: Math.min(Math.max(rawPitch / 4, 0), 2.0),
        volume: Math.min(Math.max(rawVolume, 0), 1.0),
        requiredEventTypes: ["word", "start", "end", "interrupted", "error"],
        onEvent: (ev) => {
            if (ev.type === 'start') {
                isSpeaking = true;
                chrome.tabs.sendMessage(tabId, { method: "start_speech" }).catch(() => {});
            } else if (ev.type === 'word') {
                chrome.tabs.sendMessage(tabId, { method: "highlight_word", charIndex: ev.charIndex }).catch(() => {});
            } else if (ev.type === 'end' || ev.type === 'interrupted' || ev.type === 'error') {
                if (currentSpeakingText === cleanText) {
                    isSpeaking = false;
                    currentSpeakingText = "";
                    chrome.tabs.sendMessage(tabId, { method: "end_speech" }).catch(() => {});
                }
            }
        }
    };

    if (voiceName) {
        options.voiceName = voiceName;
    }

    chrome.tts.speak(cleanText, options);
}

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.method === "speak") {
        startSpeaking(msg.text, sender.tab.id);
    }
    if (msg.method === "stopSpeech") {
        stopAll(sender.tab.id);
    }
});

chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
        id: "read-selection",
        title: "Прочитать выделенное",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "read-selection" && info.selectionText) {
        const enabled = localStorage.getItem("extensionEnabled") !== "false";
        if (enabled) {
            startSpeaking(info.selectionText, tab.id);
        }
    }
});
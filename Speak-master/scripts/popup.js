"use strict";

const calcWpm = (e) => Math.round(250 * e);
const setLocal = (key, val) => localStorage.setItem(key, val);
const getLocal = (key) => localStorage.getItem(key);

function Init() {
    if (!getLocal("rateValue")) setLocal("rateValue", "1.0");
    if (!getLocal("volume")) setLocal("volume", "1.0");
    if (!getLocal("pitch")) setLocal("pitch", "4.0");
    if (!getLocal("showButton")) setLocal("showButton", "true");
    if (!getLocal("extensionEnabled")) setLocal("extensionEnabled", "true");

    chrome.tts.getVoices(function (voices) {
        let savedVoice = getLocal("voice");
        const selectVoice = $("#voices-select");
        selectVoice.empty();

        voices.forEach((v, i) => {
            selectVoice.append($("<option>", {
                selected: savedVoice === v.voiceName,
                value: v.voiceName,
                text: `${i + 1}. ${v.voiceName.replace("Google", "").trim()} ${v.gender === "female" ? "👩" : "🚹"}`
            }));
        });
    });

    $("#toggle-button").prop("checked", getLocal("showButton") === "true");
    $("#toggle-extension").prop("checked", getLocal("extensionEnabled") === "true");
}

$(document).ready(function () {
    Init();

    const elements = {
        rateRange: $("#irate"),
        volumeRange: $("#volume-range"),
        pitchRange: $("#pitch-range"),
        selectVoice: $("#voices-select"),
        toggleButton: $("#toggle-button"),
        toggleExtension: $("#toggle-extension")
    };

    elements.rateRange.val(getLocal("rateValue"));
    elements.pitchRange.val(getLocal("pitch"));
    elements.volumeRange.val(getLocal("volume"));
    
    $("#iwords").text(calcWpm(elements.rateRange.val()));
    $("#pitch-value").text(elements.pitchRange.val());
    $("#volume-value").text(Math.round(elements.volumeRange.val() * 100));

    elements.rateRange.on("input", function() {
        $("#iwords").text(calcWpm($(this).val()));
        setLocal("rateValue", $(this).val());
    });

    elements.pitchRange.on("input", function() {
        $("#pitch-value").text($(this).val());
        setLocal("pitch", $(this).val());
    });

    elements.volumeRange.on("input", function() {
        $("#volume-value").text(Math.round($(this).val() * 100));
        setLocal("volume", $(this).val());
    });

    elements.selectVoice.on("change", function() {
        setLocal("voice", $(this).val());
    });

    function sendSettingsToTabs() {
        const settings = {
            showButton: getLocal("showButton") === "true",
            extensionEnabled: getLocal("extensionEnabled") === "true"
        };
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { method: "updateSettings", settings })
                    .catch(() => {});
            });
        });
    }

    elements.toggleButton.on("change", function() {
        const val = $(this).prop("checked") ? "true" : "false";
        setLocal("showButton", val);
        sendSettingsToTabs();
    });

    elements.toggleExtension.on("change", function() {
        const val = $(this).prop("checked") ? "true" : "false";
        setLocal("extensionEnabled", val);
        sendSettingsToTabs();

        if (val === "false") {
            chrome.runtime.sendMessage({ method: "stopSpeech" });
        }
    });
});
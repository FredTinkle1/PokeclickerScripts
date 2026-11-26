// ==UserScript==
// @name         TINKLE AUTOMATION
// @namespace    https://github.com/FredTinkle1/PokeclickerScripts/
// @version      0.7
// @description  Customized Pokeclicker automation with commit-pinned automatic updates
// @author       GARCIN David
// @match        https://www.pokeclicker.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pokeclicker.com
// @grant        none
// ==/UserScript==

(async function () {
    "use strict";

    const repository = "FredTinkle1/PokeclickerScripts";
    const branch = "master";
    const knownGood = "056afeb7a69925c034f7674401394d050bc8a24a";
    const forcedCommit = ""; // Optional: set a commit SHA for manual recovery.
    const disableFeaturesByDefault = false;
    const disableSettingsByDefault = false;
    const marker = "pokeclicker-automation-component-loader";
    const tag = "[TINKLE AUTOMATION]";
    const validSha = value => typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
    const baseUrl = sha => "https://raw.githubusercontent.com/" + repository + "/" + sha + "/";

    if (document.getElementById(marker)) return;

    async function request(url, json = false) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                cache: "no-store",
                signal: controller.signal
            });
            if (!response.ok) throw new Error("HTTP " + response.status);
            return await (json ? response.json() : response.text());
        } finally {
            clearTimeout(timeout);
        }
    }

    async function resolveCommit() {
        if (forcedCommit) {
            if (!validSha(forcedCommit)) throw new Error("Invalid forced commit SHA");
            return forcedCommit;
        }
        try {
            const data = await request(
                "https://api.github.com/repos/" + repository +
                "/commits/" + branch + "?t=" + Date.now(), true
            );
            if (!validSha(data.sha)) throw new Error("Invalid GitHub commit response");
            return data.sha;
        } catch (error) {
            console.warn(tag, "Latest commit lookup failed; using known working revision.", error);
            return knownGood;
        }
    }

    async function downloadLoader(sha) {
        const source = await request(baseUrl(sha) + "src/ComponentLoader.js");
        new Function(source);
        return source;
    }

    try {
        let commit = await resolveCommit();
        let source;
        try {
            source = await downloadLoader(commit);
        } catch (error) {
            if (forcedCommit || commit === knownGood) throw error;
            console.warn(tag, "Latest loader download failed; using known working revision.", error);
            commit = knownGood;
            source = await downloadLoader(commit);
        }

        if (document.getElementById(marker)) return;
        console.log(tag, "Userscript v0.7 — loading commit:", commit);
        const script = document.createElement("script");
        script.id = marker;
        script.textContent = source;
        document.head.appendChild(script);

        AutomationComponentLoader.loadFromUrl(
            baseUrl(commit),
            disableFeaturesByDefault,
            disableSettingsByDefault
        );
    } catch (error) {
        console.error(tag, "Startup failed:", error);
    }
})();

// ======================================================
// TAF — VERSION PRO+
// Chargement sécurisé, logs propres.
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON, updateStatusPanel } from "./helpers.js";

const IS_DEV = location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1");
const log = (...a) => IS_DEV && console.log("[TAF]", ...a);
const logErr = (...a) => console.error("[TAF ERROR]", ...a);

export async function safeLoadTaf() {
    try {
        await loadTaf();
        log("TAF chargé");
    } catch (err) {
        logErr("Erreur TAF :", err);
    }
}

export async function loadTaf() {
    const data = await fetchJSON(ENDPOINTS.taf);
    updateTafUI(data);
    updateStatusPanel("TAF", data);
}

export function updateTafUI(data) {
    const el = document.getElementById("taf");
    if (!el) return;

    if (!data || !data.data || !data.data[0] || !data.data[0].raw_text) {
        el.innerText = "TAF indisponible";
        return;
    }

    el.innerText = data.data[0].raw_text;
}

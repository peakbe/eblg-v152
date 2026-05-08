// ======================================================
// METAR — VERSION PRO+ (HARMONISÉE AVEC RUNWAYS PRO+)
// Chargement sécurisé, logs propres, UI robuste.
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON, updateStatusPanel } from "./helpers.js";
import { getRunwayFromWind, updateRunwayPanel, drawRunway, drawCorridor } from "./runways.js";

const IS_DEV = location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1");
const log = (...a) => IS_DEV && console.log("[METAR]", ...a);
const logErr = (...a) => console.error("[METAR ERROR]", ...a);

export async function safeLoadMetar() {
    try {
        await loadMetar();
        log("METAR chargé");
    } catch (err) {
        logErr("Erreur METAR :", err);
    }
}

export async function loadMetar() {
    const data = await fetchJSON(ENDPOINTS.metar);
    updateMetarUI(data);
    updateStatusPanel("METAR", data);
}

export function updateMetarUI(data) {
    const el = document.getElementById("metar");
    if (!el) return;

    if (!data || !data.data || !data.data[0] || !data.data[0].raw_text) {
        el.innerText = "METAR indisponible";
        drawRunway("22", window.runwayLayer);
        drawCorridor("22", window.corridorLayer);
        updateRunwayPanel("22", 0, 0, 0);
        return;
    }

    const metar = data.data[0];
    el.innerText = metar.raw_text;

    const windDir = metar.wind?.degrees ?? null;
    const windSpeed = metar.wind?.speed_kts ?? null;

    const runway = getRunwayFromWind(windDir);
    window._activeRunway = runway;
    updateRunwayPanel(runway, windDir, windSpeed);
    drawRunway(runway, window.runwayLayer);
    drawCorridor(runway, window.corridorLayer);
}

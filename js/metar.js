// ======================================================
// METAR PRO+++ — Cockpit IFR EBLG
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON, updateStatusPanel } from "./helpers.js";
import {
    getRunwayFromWind,
    computeCrosswind,
    updateRunwayPanel
} from "./runways.js";

import { drawRunwayDirection, drawNoiseCorridor } from "./map.js";
import { applyRunwayColoring } from "./sonometers.js";

const IS_DEV = location.hostname.includes("localhost");
const log = (...a) => IS_DEV && console.log("[METAR]", ...a);
const logErr = (...a) => console.error("[METAR ERROR]", ...a);

// ------------------------------------------------------
// Chargement sécurisé
// ------------------------------------------------------
export async function safeLoadMetar() {
    try {
        await loadMetar();
        log("METAR chargé");
    } catch (err) {
        logErr("Erreur METAR :", err);
    }
}

// ------------------------------------------------------
// Chargement brut
// ------------------------------------------------------
export async function loadMetar() {
    const data = await fetchJSON(ENDPOINTS.metar);
    updateMetarUI(data);
    updateStatusPanel("METAR", data);
}

// ------------------------------------------------------
// Mise à jour UI + piste + carte + sonomètres
// ------------------------------------------------------
export function updateMetarUI(data) {

    const el = document.getElementById("metar");
    if (!el) return;

    // METAR indisponible
    if (!data || !data.raw) {
        el.innerText = "METAR indisponible";
        window._activeRunway = null;
        updateRunwayIndicator(null);
        drawRunwayDirection(null);
        drawNoiseCorridor(null);
        updateRunwayPanel("—", null, null, 0, 0);
        return;
    }

    // Affichage brut
    el.innerText = data.raw;

    // 1) Extraction vent
    const windDir = data.wind_direction?.value ?? null;
    const windSpeed = data.wind_speed?.value ?? null;

    // 2) Détermination piste active
    const active = getRunwayFromWind(windDir);
    window._activeRunway = active?.id ?? null;

    // 3) Mise à jour carte
    drawRunwayDirection(active?.id ?? null);
    drawNoiseCorridor(active?.id ?? null);

    // 4) Couplage sonomètres
    applyRunwayColoring(active?.id ?? null);

    // 5) Calcul vent de travers / face
    const { crosswind, headwind } = computeCrosswind(
        windDir,
        windSpeed,
        active?.heading ?? null
    );

    // 6) Mise à jour panneau piste
    updateRunwayPanel(
        active?.id ?? "—",
        windDir,
        windSpeed,
        crosswind,
        headwind
    );

    // 7) Indicateur visuel RWY
    updateRunwayIndicator(active?.id ?? null);
}

// ------------------------------------------------------
// Indicateur visuel RWY (barre supérieure)
// ------------------------------------------------------
function updateRunwayIndicator(rwy) {
    const el = document.getElementById("rwy-indicator");
    if (!el) return;

    el.className = "rwy-box";

    if (!rwy) {
        el.textContent = "RWY --";
        el.classList.add("rwy-null");
        return;
    }

    el.textContent = `RWY ${rwy}`;

    if (rwy === "04") el.classList.add("rwy-04");
    else if (rwy === "22") el.classList.add("rwy-22");
    else el.classList.add("rwy-null");
}

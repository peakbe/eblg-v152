// ======================================================
// APP.JS PRO+++ — Cockpit IFR EBLG
// ======================================================

import { initMap, resetMapView, toggleNoiseHeatmap } from "./map.js";
import { safeLoadMetar } from "./metar.js";
import { safeLoadTaf } from "./taf.js";
import { safeLoadFids } from "./fids.js";
import { loadSonometers } from "./sonometers.js";
import { checkApiStatus } from "./status.js";
import { loadLogs } from "./logs.js";
import { startLiveLogs } from "./logsLive.js";

// =========================
// BOUTON HEATMAP ON/OFF
// =========================
let noiseHeatmapEnabled = true;

const noiseHeatBtn = document.getElementById("btn-noiseheat-toggle");
if (noiseHeatBtn) {
    noiseHeatBtn.addEventListener("click", () => {
        noiseHeatmapEnabled = !noiseHeatmapEnabled;
        toggleNoiseHeatmap(noiseHeatmapEnabled);
        noiseHeatBtn.textContent = noiseHeatmapEnabled ? "Heatmap ON" : "Heatmap OFF";
    });
}

// =========================
// DOMContentLoaded
// =========================

window.addEventListener("DOMContentLoaded", () => {

    console.log("[APP] Initialisation cockpit IFR…");

    // --------------------------------------------------
    // Gestion des onglets
    // --------------------------------------------------
    const tabs = document.querySelectorAll("#sidebar-tabs button");
    const panels = document.querySelectorAll("#sidebar-panels .panel");

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;

            tabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            panels.forEach(p => p.classList.add("hidden"));
            document.getElementById(`panel-${tab}`).classList.remove("hidden");
        });
    });

    // Onglet par défaut
    const defaultTab = document.querySelector('#sidebar-tabs button[data-tab="metar"]');
    if (defaultTab) defaultTab.click();

    // --------------------------------------------------
    // Initialisation carte
    // --------------------------------------------------
    initMap();
    
    // =========================
    // BOUTON RESET MAP
    // =========================

    const resetMapBtn = document.getElementById("btn-reset-map");
    if (resetMapBtn) {
    resetMapBtn.addEventListener("click", () => {
        resetMapView();
    });
}

    // --------------------------------------------------
    // Chargement des modules
    // --------------------------------------------------
    safeLoadMetar();     // METAR → piste → corridor → sonomètres
    safeLoadTaf();
    safeLoadFids();
    loadSonometers();
    checkApiStatus();
    loadLogs();
    startLiveLogs();

    // --------------------------------------------------
    // Rafraîchissements périodiques
    // --------------------------------------------------
    setInterval(safeLoadMetar, 60_000);
    setInterval(safeLoadTaf, 5 * 60_000);
    setInterval(safeLoadFids, 60_000);
    setInterval(loadSonometers, 60_000);
    setInterval(checkApiStatus, 30_000);

    console.log("[APP] Cockpit IFR opérationnel");
});


// =========================
// APP.JS PRO+ (VERSION HARMONISÉE)
// =========================

import { initMap, resetMapView } from "./map.js";

import { safeLoadMetar } from "./metar.js";
import { safeLoadTaf } from "./taf.js";
import { safeLoadFids } from "./fids.js";

import { loadSonometers, toggleHeatmap } from "./sonometers.js";

import { checkApiStatus } from "./status.js";
import { loadLogs } from "./logs.js";
import { startLiveLogs } from "./logsLive.js";

// ============================
// INITIALISATION UNIQUE
// ============================

window.addEventListener("DOMContentLoaded", () => {

    // --- Gestion des onglets ---
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
    
    let heatmapEnabled = true;

document.getElementById("btn-heatmap-toggle").addEventListener("click", () => {
    heatmapEnabled = !heatmapEnabled;
    toggleHeatmap(heatmapEnabled);
    document.getElementById("btn-heatmap-toggle").textContent =
        heatmapEnabled ? "Heatmap ON" : "Heatmap OFF";
});

    // --- Bouton Reset Zoom ---
    document.getElementById("btn-reset-zoom").addEventListener("click", () => {
        resetMapView();
    });

    // Onglet par défaut
    document.querySelector('#sidebar-tabs button[data-tab="metar"]').click();

    // --- Initialisation des modules ---
    initMap();
    safeLoadMetar();
    safeLoadTaf();
    safeLoadFids();
    loadSonometers();
    checkApiStatus();
    startLiveLogs();

    // Rafraîchissements périodiques
    setInterval(safeLoadMetar, 60_000);
    setInterval(safeLoadTaf, 5 * 60_000);
    setInterval(safeLoadFids, 60_000);
    setInterval(loadSonometers, 60_000);
    setInterval(checkApiStatus, 30_000);
});

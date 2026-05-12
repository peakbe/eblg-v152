// ======================================================
// SONOMETERS PRO+++ — Cockpit IFR EBLG
// - Chargement dynamique backend
// - Icônes ATC
// - Clustering
// - Heatmap bruit dynamique
// - Recoloration selon piste active
// - Panneau détail
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON } from "./helpers.js";
import { updateNoiseHeatmap } from "./map.js";

let markersLayer = null;
let clusterLayer = null;
let activeRunway = null;

// ------------------------------------------------------
// Icônes ATC PRO
// ------------------------------------------------------
const iconGreen = window.L.icon({
    iconUrl: "./assets/sonometer_green.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const iconRed = window.L.icon({
    iconUrl: "./assets/sonometer_red.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const iconBlue = window.L.icon({
    iconUrl: "./assets/sonometer_blue.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// ------------------------------------------------------
// Chargement sécurisé
// ------------------------------------------------------
export async function safeLoadSonometers() {
    try {
        await loadSonometers();
    } catch (e) {
        console.error("[SONO] Erreur :", e);
    }
}

// ------------------------------------------------------
// Chargement backend
// ------------------------------------------------------
export async function loadSonometers() {
    const data = await fetchJSON(ENDPOINTS.sonometers);

    updateSonometersUI(data);
    updateNoiseHeatmap(data); // ← Heatmap dynamique PRO+++
}

// ------------------------------------------------------
// Mise à jour UI
// ------------------------------------------------------
export function updateSonometersUI(data) {
    if (!window.map) return;

    if (clusterLayer) window.map.removeLayer(clusterLayer);
    clusterLayer = window.L.markerClusterGroup({
        disableClusteringAtZoom: 15,
        spiderfyOnMaxZoom: false
    });

    if (!Array.isArray(data)) return;

    data.forEach(s => {
        const lat = s.lat;
        const lon = s.lon;
        const lvl = s.level ?? 40;

        if (!lat || !lon) return;

        const icon = lvl >= 55 ? iconRed : lvl >= 45 ? iconBlue : iconGreen;

        const marker = window.L.marker([lat, lon], { icon });

        marker.bindTooltip(`
            <b>${s.name || "Sonomètre"}</b><br>
            Niveau : ${lvl} dB<br>
            ${s.desc || ""}
        `);

        marker.on("click", () => openSonometerPanel(s));

        clusterLayer.addLayer(marker);
    });

    window.map.addLayer(clusterLayer);
}

// ------------------------------------------------------
// Recoloration selon piste active
// ------------------------------------------------------
export function applyRunwayColoring(rwy) {
    activeRunway = rwy;

    if (!clusterLayer) return;

    clusterLayer.eachLayer(marker => {
        const lvl = marker.options?.data?.level ?? 40;

        let icon = iconGreen;
        if (lvl >= 55) icon = iconRed;
        else if (lvl >= 45) icon = iconBlue;

        marker.setIcon(icon);
    });
}

// ------------------------------------------------------
// Panneau détail
// ------------------------------------------------------
function openSonometerPanel(s) {
    const el = document.getElementById("sonometer-panel");
    if (!el) return;

    el.innerHTML = `
        <div class="sono-title">${s.name || "Sonomètre"}</div>
        <div><b>Niveau :</b> ${s.level ?? "—"} dB</div>
        <div><b>Coordonnées :</b> ${s.lat}, ${s.lon}</div>
        <div><b>Description :</b> ${s.desc || "—"}</div>
    `;

    el.classList.add("open");
}

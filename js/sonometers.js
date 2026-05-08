// ======================================================
// SONOMETERS — VERSION PRO+ FINALE
// Chargement robuste, icônes ATC, heatmap, clusters,
// panneau latéral, fallback intelligent.
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON } from "./helpers.js";

const IS_DEV = location.hostname.includes("localhost");
const log = (...a) => IS_DEV && console.log("[SONO]", ...a);
const logErr = (...a) => console.error("[SONO ERROR]", ...a);

// Layers
let markersLayer = null;
let heatLayer = null;

// Icône ATC (compatible GitHub Pages)
const sonoIcon = L.icon({
    iconUrl: "assets/icons/sono-atc.png",   // ✔ Chemin relatif
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

// ======================================================
// Chargement principal
// ======================================================
export async function loadSonometers() {
    log("Chargement des sonomètres…");

    const data = await fetchJSON(ENDPOINTS.sonometers);

    if (!data || !Array.isArray(data)) {
        logErr("Données sonomètres invalides :", data);
        updateSonometersPanel([]);
        return;
    }

    renderSonometers(data);
    updateSonometersPanel(data);
}

// ======================================================
// Rendu sur la carte
// ======================================================
function renderSonometers(list) {
    if (!window._map) {
        logErr("Carte non initialisée");
        return;
    }

    const map = window._map;

    // Reset layers
    if (markersLayer) map.removeLayer(markersLayer);
    if (heatLayer) map.removeLayer(heatLayer);

    markersLayer = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40
    });

    const heatPoints = [];

    list.forEach(sono => {
    const { lat, lon, status, id, address } = sono;

    if (!lat || !lon) return;

    // Couleur selon statut
    const color = status === "OK" ? "#00ff9c" : "#ff4444";

    // Point couleur (circleMarker)
    const marker = L.circleMarker([lat, lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 1
    });

    marker.bindPopup(`
        <b>Sonomètre ${id}</b><br>
        ${address || "Adresse inconnue"}<br>
        Statut : ${status || "—"}
    `);

    markersLayer.addLayer(marker);

    // Heatmap
    const intensity = status === "OK" ? 0.3 : 0.8;
    heatPoints.push([lat, lon, intensity]);
});

    map.addLayer(markersLayer);

    // Heatmap
    heatLayer = L.heatLayer(heatPoints, {
        radius: 35,
        blur: 20,
        maxZoom: 12
    });
}

// ======================================================
// Toggle Heatmap
// ======================================================
export function toggleHeatmap(map) {
    if (!heatLayer) return;

    if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
    } else {
        map.addLayer(heatLayer);
    }
}

// ======================================================
// Panneau latéral — Liste des sonomètres
// ======================================================
function updateSonometersPanel(list) {
    const panel = document.getElementById("sono-list");
    if (!panel) return;

    panel.innerHTML = "";

    if (!list.length) {
        panel.innerHTML = `<div class="sono-row">Aucun sonomètre disponible</div>`;
        return;
    }

    list.forEach(sono => {
        const row = document.createElement("div");
        row.className = "sono-row";

        row.innerHTML = `
            <b>${sono.id}</b> — ${sono.address || "Adresse inconnue"}<br>
            <small>${sono.lat}, ${sono.lon}</small>
        `;

        panel.appendChild(row);
    });
}

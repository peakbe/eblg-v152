// ======================================================
// SONOMETERS — VERSION PRO+
// Chargement robuste, icônes ATC, heatmap, clusters.
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON } from "./helpers.js";

const IS_DEV = location.hostname.includes("localhost");
const log = (...a) => IS_DEV && console.log("[SONO]", ...a);
const logErr = (...a) => console.error("[SONO ERROR]", ...a);

// Layers
let markersLayer = null;
let heatLayer = null;

// Icône ATC
const sonoIcon = L.icon({
    iconUrl: "./assets/icons/sono-atc.png",
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
        return;
    }

    renderSonometers(data);
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
        const { lat, lon, status, name, town } = sono;

        if (!lat || !lon) return;

        // Marker
        const marker = L.marker([lat, lon], { icon: sonoIcon });

        marker.bindPopup(`
            <b>${name || "Sonomètre"}</b><br>
            Commune : ${town || "—"}<br>
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

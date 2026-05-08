// ======================================================
// SONOMETERS PRO+++ — Cockpit IFR EBLG
// ======================================================
// - Couleurs ATC selon niveau sonore
// - Tri par distance de la piste active
// - Icônes cockpit IFR
// - Heatmap dynamique (vert → rouge)
// - Popup enrichi (niveau, commune, statut)
// - Compatible backend EBLG (lat, lon, address)
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON } from "./helpers.js";

const IS_DEV = location.hostname.includes("localhost");
const log = (...a) => IS_DEV && console.log("[SONO]", ...a);
const logErr = (...a) => console.error("[SONO ERROR]", ...a);

// Référence piste EBLG (seuil 22)
const REF_LAT = 50.637;
const REF_LNG = 5.443;

let sonoMarkers = null;
let sonoHeat = null;
let sonoDataCache = [];

// ------------------------------------------------------
// Utils
// ------------------------------------------------------
function getLat(s) {
    return s.lat ?? s.latitude ?? null;
}

function getLng(s) {
    return s.lng ?? s.lon ?? s.longitude ?? null;
}

function getLevel(s) {
    return typeof s.level === "number" ? s.level : null;
}

function getTown(s) {
    return s.town || s.commune || s.city || "—";
}

function getStatus(s) {
    return s.status || "Actif";
}

// Haversine (distance en km)
function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Couleur ATC selon niveau sonore
function levelColor(level) {
    if (level == null) return "#00e5ff"; // neutre
    if (level < 45) return "#00e676";    // vert
    if (level < 55) return "#ffeb3b";    // jaune
    if (level < 65) return "#ff9800";    // orange
    return "#f44336";                    // rouge
}

// Intensité heatmap selon niveau
function levelIntensity(level) {
    if (level == null) return 0.3;
    const min = 40, max = 80;
    const clamped = Math.max(min, Math.min(max, level));
    return (clamped - min) / (max - min) * 0.8 + 0.2;
}

// Icône cockpit IFR
function sonoIcon(level) {
    const color = levelColor(level);
    return window.L.divIcon({
        className: "sono-icon",
        html: `<div style="
            width:10px;
            height:10px;
            border-radius:50%;
            background:${color};
            box-shadow:0 0 6px ${color};
        "></div>`,
        iconSize: [10, 10]
    });
}

// ------------------------------------------------------
// Chargement principal
// ------------------------------------------------------
export async function loadSonometers() {
    try {
        const data = await fetchJSON(ENDPOINTS.sonometers);

        if (!Array.isArray(data)) {
            logErr("Format sonomètres invalide :", data);
            return;
        }

        // Ajout distance piste + tri
        sonoDataCache = data
            .map(s => {
                const lat = getLat(s);
                const lng = getLng(s);
                const dist = (lat && lng)
                    ? distanceKm(lat, lng, REF_LAT, REF_LNG)
                    : null;
                return { ...s, _distanceKm: dist };
            })
            .sort((a, b) => {
                if (a._distanceKm == null) return 1;
                if (b._distanceKm == null) return -1;
                return a._distanceKm - b._distanceKm;
            });

        renderSonometers(sonoDataCache);
        renderSonoList(sonoDataCache);

        log("Sonomètres chargés :", sonoDataCache.length);
    } catch (err) {
        logErr("Erreur chargement sonomètres :", err);
    }
}

// ------------------------------------------------------
// Rendu carte
// ------------------------------------------------------
function renderSonometers(data) {
    if (!window.map) {
        logErr("Carte non initialisée");
        return;
    }

    if (sonoMarkers) window.map.removeLayer(sonoMarkers);
    if (sonoHeat) window.map.removeLayer(sonoHeat);

    sonoMarkers = window.L.markerClusterGroup({
        disableClusteringAtZoom: 15,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
    });

    const heatPoints = [];

    data.forEach(s => {
        const lat = getLat(s);
        const lng = getLng(s);
        if (!lat || !lng) return;

        const level = getLevel(s);
        const town = getTown(s);
        const status = getStatus(s);

        const marker = window.L.marker([lat, lng], {
            icon: sonoIcon(level)
        });

        marker.bindPopup(`
            <b>Sonomètre ${s.id}</b><br>
            Adresse : ${s.address || "—"}<br>
            Niveau : ${level != null ? level + " dB" : "—"}<br>
            Commune : ${town}<br>
            Statut : ${status}<br>
            Distance piste : ${
                s._distanceKm != null ? s._distanceKm.toFixed(1) + " km" : "—"
            }
        `);

        marker.on("click", () => updateDetailPanel(s));

        sonoMarkers.addLayer(marker);

        heatPoints.push([lat, lng, levelIntensity(level)]);
    });

    sonoHeat = window.L.heatLayer(heatPoints, {
        radius: 25,
        blur: 18,
        maxZoom: 17,
        gradient: {
            0.2: "#00e676",
            0.5: "#ffeb3b",
            0.8: "#ff9800",
            1.0: "#f44336"
        }
    });

    sonoMarkers.addTo(window.map);
    sonoHeat.addTo(window.map);
}

// ------------------------------------------------------
// Toggle Heatmap (pour ton bouton ON/OFF)
// ------------------------------------------------------
export function toggleHeatmap(enabled) {
    if (!window.map || !sonoHeat) return;
    if (enabled) {
        if (!window.map.hasLayer(sonoHeat)) sonoHeat.addTo(window.map);
    } else {
        if (window.map.hasLayer(sonoHeat)) window.map.removeLayer(sonoHeat);
    }
}

// ------------------------------------------------------
// Liste latérale triée par distance
// ------------------------------------------------------
function renderSonoList(data) {
    const el = document.getElementById("sono-list");
    if (!el) return;

    el.innerHTML = "";

    if (!data.length) {
        el.innerHTML = `<div class="sono-row">Aucun sonomètre disponible</div>`;
        return;
    }

    data.forEach(s => {
        const lat = getLat(s);
        const lng = getLng(s);
        if (!lat || !lng) return;

        const level = getLevel(s);
        const town = getTown(s);

        const row = document.createElement("div");
        row.className = "sono-row";

        row.innerHTML = `
            <span class="sono-name">${s.id}</span>
            <span class="sono-town">${town}</span>
            <span class="sono-level">${level != null ? level + " dB" : "—"}</span>
        `;

        row.addEventListener("click", () => {
            window.map.setView([lat, lng], 15);
            updateDetailPanel(s);
        });

        el.appendChild(row);
    });
}

// ------------------------------------------------------
// Détail panel
// ------------------------------------------------------
function updateDetailPanel(s) {
    const panel = document.getElementById("detail-panel");
    if (!panel) return;

    const level = getLevel(s);
    const town = getTown(s);
    const status = getStatus(s);

    document.getElementById("detail-title").textContent = `Sonomètre ${s.id}`;
    document.getElementById("detail-address").textContent = s.address || "—";
    document.getElementById("detail-town").textContent = town;
    document.getElementById("detail-status").textContent = status;
    document.getElementById("detail-distance").textContent =
        s._distanceKm != null ? s._distanceKm.toFixed(1) + " km" : "—";

    panel.classList.remove("hidden");
}

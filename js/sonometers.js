// ======================================================
// SONOMETERS PRO++++ — Cockpit IFR EBLG
// ======================================================
// - Couleurs ATC selon niveau sonore
// - Tri dynamique (distance / ID / adresse)
// - Filtre par commune
// - Icônes cockpit IFR
// - Heatmap dynamique (vert → rouge)
// - Popup enrichi
// - Highlight carte <-> liste
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
let markerById = new Map();
let rowById = new Map();

let currentSort = "distance";
let currentTownFilter = "all";

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
    // On dérive la commune depuis l'adresse si pas de champ dédié
    if (s.town) return s.town;
    if (s.commune) return s.commune;
    if (s.city) return s.city;
    if (s.address) {
        // ex: "Rue de la Pommeraie, 4690 Wonck, Belgique"
        const parts = s.address.split(",");
        if (parts.length >= 2) {
            return parts[1].trim();
        }
    }
    return "—";
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

        // Ajout distance piste
        sonoDataCache = data.map(s => {
            const lat = getLat(s);
            const lng = getLng(s);
            const dist = (lat && lng)
                ? distanceKm(lat, lng, REF_LAT, REF_LNG)
                : null;
            return { ...s, _distanceKm: dist };
        });

        initSonoControls(sonoDataCache);
        renderSonometers(sonoDataCache);
        updateSonoListView();

        log("Sonomètres chargés :", sonoDataCache.length);
    } catch (err) {
        logErr("Erreur chargement sonomètres :", err);
    }
}

// ------------------------------------------------------
// Contrôles (tri + filtre)
// ------------------------------------------------------
function initSonoControls(data) {
    const sortEl = document.getElementById("sono-sort");
    const filterEl = document.getElementById("sono-filter-town");
    if (!sortEl || !filterEl) return;

    // Peupler filtre communes
    const towns = new Set();
    data.forEach(s => {
        const t = getTown(s);
        if (t && t !== "—") towns.add(t);
    });

    // Reset options (sauf "all")
    filterEl.innerHTML = `<option value="all">Commune: Toutes</option>`;
    Array.from(towns).sort().forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        filterEl.appendChild(opt);
    });

    sortEl.onchange = () => {
        currentSort = sortEl.value;
        updateSonoListView();
    };

    filterEl.onchange = () => {
        currentTownFilter = filterEl.value;
        updateSonoListView();
    };
}

function updateSonoListView() {
    let list = [...sonoDataCache];

    // Filtre commune
    if (currentTownFilter !== "all") {
        list = list.filter(s => getTown(s) === currentTownFilter);
    }

    // Tri
    list.sort((a, b) => {
        if (currentSort === "id") {
            return String(a.id).localeCompare(String(b.id));
        }
        if (currentSort === "address") {
            return String(a.address || "").localeCompare(String(b.address || ""));
        }
        // distance par défaut
        const da = a._distanceKm ?? Infinity;
        const db = b._distanceKm ?? Infinity;
        return da - db;
    });

    renderSonoList(list);
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
    markerById.clear();

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

        marker.on("mouseover", () => highlightRow(s.id, true));
        marker.on("mouseout", () => highlightRow(s.id, false));
        marker.on("click", () => updateDetailPanel(s));

        markerById.set(s.id, marker);
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
// Liste latérale triée / filtrée
// ------------------------------------------------------
function renderSonoList(data) {
    const el = document.getElementById("sono-list");
    if (!el) return;

    el.innerHTML = "";
    rowById.clear();

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
            <span class="sono-town">${s.address || town}</span>
            <span class="sono-level">${level != null ? level + " dB" : "—"}</span>
        `;

        row.addEventListener("mouseenter", () => {
            highlightRow(s.id, true);
            const marker = markerById.get(s.id);
            if (marker) {
                marker.openPopup();
            }
        });

        row.addEventListener("mouseleave", () => {
            highlightRow(s.id, false);
        });

        row.addEventListener("click", () => {
            if (window.map && lat && lng) {
                window.map.setView([lat, lng], 15);
            }
            updateDetailPanel(s);
        });

        rowById.set(s.id, row);
        el.appendChild(row);
    });
}

// ------------------------------------------------------
// Highlight carte <-> liste
// ------------------------------------------------------
function highlightRow(id, on) {
    const row = rowById.get(id);
    if (!row) return;
    if (on) row.classList.add("highlight");
    else row.classList.remove("highlight");
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

// ======================================================
// MAP.JS — EBLG Cockpit IFR PRO+++
// ======================================================
let noiseZonesLayer = L.layerGroup();

import { ENDPOINTS } from "./config.js";
import { fetchJSON } from "./helpers.js";

export let map = null;

// Couches
const adsbLayer = L.layerGroup();
const adsbTracksLayer = L.layerGroup();
const adsbLabelsLayer = L.layerGroup();
let adsbHeatmap = null;

let approachCorridorLayer = L.layerGroup();
let departureCorridorLayer = L.layerGroup();
let noiseZoneLayer = L.layerGroup();
let glidePathLayer = L.layerGroup();

const adsbTracks = new Map();

let adsbFilter = {
    minAlt: 0,
    maxAlt: 45000,
    minSpd: 0,
    maxSpd: 600,
    types: "all"
};

// ======================================================
// INIT MAP
// ======================================================
export function initMap() {

    map = L.map("map", {
        center: [50.645, 5.46],
        zoom: 12,
        preferCanvas: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);

    // Couches ADS-B
    adsbLayer.addTo(map);
    adsbTracksLayer.addTo(map);
    adsbLabelsLayer.addTo(map);
drawNoiseZones();

    // Heatmap ADS-B
    adsbHeatmap = L.heatLayer([], {
        radius: 25,
        blur: 15,
        maxZoom: 14
    }).addTo(map);

    console.log("[MAP] Carte initialisée");
}

// ======================================================
// UPDATE ADS-B (Airlabs)
// ======================================================
export async function updateADSB() {
    try {
        const url = ENDPOINTS.adsb;
        const json = await fetchJSON(url);

        if (!json || !json.ac) return;

        const heatPoints = [];

        json.ac.forEach(ac => {
            if (!ac.lat || !ac.lon) return;

            // Heatmap
            heatPoints.push([ac.lat, ac.lon, 0.7]);

            // (tracks, labels, icons…)
        });

        // Heatmap OK
        if (adsbHeatmap) {
            adsbHeatmap.setLatLngs(heatPoints);
        }

    } catch (e) {
        console.error("[ADSB] Erreur chargement", e);
    }
}

// ======================================================
// RESET MAP VIEW
// ======================================================
export function resetMapView() {
    if (!map) return;
    map.setView([50.645, 5.46], 12);
}

// ======================================================
// HEATMAP ON/OFF
// ======================================================
export function toggleNoiseHeatmap(state) {
    if (!adsbHeatmap) return;

    if (state) {
        adsbHeatmap.addTo(map);
    } else {
        map.removeLayer(adsbHeatmap);
    }
}

// LABELS
const label = L.marker([ac.lat, ac.lon], {
    icon: L.divIcon({
        className: "adsb-label",
        html: `
            <div class="adsb-label-box">
                <b>${ac.call || "—"}</b><br>
                ${ac.alt_baro ? ac.alt_baro + " ft" : ""}<br>
                ${ac.gs ? ac.gs + " kt" : ""}
            </div>
        `,
        iconSize: [80, 40],
        iconAnchor: [40, -10]
    })
});

adsbLabelsLayer.addLayer(label);
// ======================================================
// ZONES BRUIT — DPA EBLG (modèle réaliste)
// ======================================================

export function drawNoiseZones() {
    noiseZonesLayer.clearLayers();

    // Zone critique (rouge)
    const zoneCritique = [
        [50.6600, 5.4300],
        [50.6600, 5.4550],
        [50.6400, 5.4550],
        [50.6400, 5.4300]
    ];

    // Zone élevée (orange)
    const zoneElevee = [
        [50.6700, 5.4100],
        [50.6700, 5.4750],
        [50.6300, 5.4750],
        [50.6300, 5.4100]
    ];

    // Zone modérée (jaune)
    const zoneModeree = [
        [50.6800, 5.3900],
        [50.6800, 5.4950],
        [50.6200, 5.4950],
        [50.6200, 5.3900]
    ];

    L.polygon(zoneCritique, {
        color: "#ff0000",
        fillColor: "#ff0000",
        fillOpacity: 0.25,
        weight: 2
    }).addTo(noiseZonesLayer);

    L.polygon(zoneElevee, {
        color: "#ff8800",
        fillColor: "#ff8800",
        fillOpacity: 0.20,
        weight: 2
    }).addTo(noiseZonesLayer);

    L.polygon(zoneModeree, {
        color: "#ffee00",
        fillColor: "#ffee00",
        fillOpacity: 0.15,
        weight: 2
    }).addTo(noiseZonesLayer);

    noiseZonesLayer.addTo(map);
}

// ======================================================
// CORRIDORS (placeholders si non implémentés)
// ======================================================
export function drawApproachCorridor(rwy) {
    // TODO: dessiner corridor approche
    // Pour éviter les erreurs, on nettoie juste la couche
    if (approachCorridorLayer) approachCorridorLayer.clearLayers();
}

export function drawDepartureCorridor(rwy) {
    // TODO: dessiner corridor départ
    if (departureCorridorLayer) departureCorridorLayer.clearLayers();
}
// ======================================================
// CORRIDORS IFR — EBLG PRO+++
// ======================================================

// Coordonnées piste EBLG
const RWY22 = [50.64594, 5.44338];
const RWY04 = [50.65455, 5.46570];

// -----------------------------
// Approche RWY 22
// -----------------------------
export function drawApproachCorridor(rwy) {
    approachCorridorLayer.clearLayers();
    if (rwy !== "22") return;

    const pts = [
        RWY22,
        [50.6300, 5.4200],
        [50.6200, 5.4000],
        [50.6100, 5.3800]
    ];

    L.polyline(pts, {
        color: "#00ff88",
        weight: 3,
        opacity: 0.8,
        dashArray: "6,4"
    }).addTo(approachCorridorLayer);

    approachCorridorLayer.addTo(map);
}

// -----------------------------
// Départ RWY 04
// -----------------------------
export function drawDepartureCorridor(rwy) {
    departureCorridorLayer.clearLayers();
    if (rwy !== "04") return;

    const pts = [
        RWY04,
        [50.6650, 5.4800],
        [50.6800, 5.5000]
    ];

    L.polyline(pts, {
        color: "#ffaa00",
        weight: 3,
        opacity: 0.8,
        dashArray: "6,4"
    }).addTo(departureCorridorLayer);

    departureCorridorLayer.addTo(map);
}

// TRACKS + FLÈCHES
if (!adsbTracks.has(ac.hex)) {
    adsbTracks.set(ac.hex, { positions: [], lastUpdate: Date.now() });
}

const track = adsbTracks.get(ac.hex);
track.positions.push([ac.lat, ac.lon]);

// Limite la trace à 20 points
if (track.positions.length > 20) track.positions.shift();

// Polyline
const poly = L.polyline(track.positions, {
    color: "#00c8ff",
    weight: 2,
    opacity: 0.7
}).addTo(adsbTracksLayer);

// Flèches directionnelles
L.polylineDecorator(poly, {
    patterns: [
        {
            offset: "50%",
            repeat: 0,
            symbol: L.Symbol.arrowHead({
                pixelSize: 12,
                polygon: false,
                pathOptions: { stroke: true, color: "#00c8ff", weight: 2 }
            })
        }
    ]
}).addTo(adsbTracksLayer);

export function toggleNoiseZones(state) {
    if (state) {
        noiseZonesLayer.addTo(map);
    } else {
        map.removeLayer(noiseZonesLayer);
    }
}

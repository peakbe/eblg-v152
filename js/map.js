// ======================================================
// MAP PRO+++ — Cockpit IFR EBLG
// ======================================================

import { RUNWAYS } from "./runways.js";

// ------------------------------------------------------
// INIT MAP
// ------------------------------------------------------
export function initMap() {
    if (!window.L) {
        console.error("[MAP] Leaflet non chargé");
        return;
    }

    const mapEl = document.getElementById("map");
    if (!mapEl) {
        console.error("[MAP] #map introuvable");
        return;
    }

    const map = window.L.map("map", {
        center: [50.645, 5.46],   // Centre EBLG
        zoom: 12,
        zoomControl: true
    });

    window.map = map;

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    console.log("[MAP] Carte initialisée");
}

// ======================================================
// RUNWAY DIRECTION — Cockpit IFR EBLG
// ======================================================

let runwayLine = null;
let runwayArrow = null;
let runwayLabel = null;

export function drawRunwayDirection(runwayId) {
    if (!window.map) return;

    if (runwayLine) window.map.removeLayer(runwayLine);
    if (runwayArrow) window.map.removeLayer(runwayArrow);
    if (runwayLabel) window.map.removeLayer(runwayLabel);

    if (!runwayId || !RUNWAYS[runwayId]) return;

    const rw = RUNWAYS[runwayId];
    const start = rw.start;
    const end = rw.end;

    const color = runwayId === "04" ? "#00e676" : "#2979ff";
    const labelText = runwayId === "04" ? "RWY 04 → NE" : "RWY 22 → SW";

    runwayLine = window.L.polyline([start, end], {
        color,
        weight: 4,
        opacity: 0.9
    }).addTo(window.map);

    if (window.L.polylineDecorator) {
        runwayArrow = window.L.polylineDecorator(runwayLine, {
            patterns: [
                {
                    offset: "50%",
                    repeat: 0,
                    symbol: window.L.Symbol.arrowHead({
                        pixelSize: 18,
                        polygon: false,
                        pathOptions: { stroke: true, color }
                    })
                }
            ]
        }).addTo(window.map);
    }

    runwayLabel = window.L.marker(end, {
        icon: window.L.divIcon({
            className: "runway-label",
            html: `<div style="
                color:${color};
                font-size:14px;
                font-weight:600;
                text-shadow:0 0 4px black;
            ">${labelText}</div>`
        })
    }).addTo(window.map);
}

// ======================================================
// CORRIDOR BRUIT PRO+++ — Cockpit IFR
// ======================================================

let noiseCorridor = null;

export function drawNoiseCorridor(runwayId) {
    if (!window.map) return;

    if (noiseCorridor) {
        window.map.removeLayer(noiseCorridor);
        noiseCorridor = null;
    }

    if (!runwayId || !RUNWAYS[runwayId]) return;

    const rw = RUNWAYS[runwayId];

    const A = rw.start;
    const B = rw.end;

    const width = 800; // 800 m de chaque côté

    function offsetPoint(lat, lng, dx, dy) {
        const R = 6378137;
        const newLat = lat + (dy / R) * (180 / Math.PI);
        const newLng = lng + (dx / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
        return [newLat, newLng];
    }

    const dx = B[1] - A[1];
    const dy = B[0] - A[0];

    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy / len;
    const ny = dx / len;

    const A_left  = offsetPoint(A[0], A[1],  nx * width, ny * width);
    const A_right = offsetPoint(A[0], A[1], -nx * width, -ny * width);
    const B_left  = offsetPoint(B[0], B[1],  nx * width, ny * width);
    const B_right = offsetPoint(B[0], B[1], -nx * width, -ny * width);

    const color = runwayId === "04" ? "#00e676" : "#2979ff";

    noiseCorridor = window.L.polygon(
        [A_left, B_left, B_right, A_right],
        {
            color,
            weight: 2,
            opacity: 0.8,
            fillColor: color,
            fillOpacity: 0.15
        }
    ).addTo(window.map);
}

// ======================================================
// RUNWAY DIRECTION — Cockpit IFR EBLG
// ======================================================

import { RUNWAYS } from "./runways.js";

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

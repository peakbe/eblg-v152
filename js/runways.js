// ======================================================
// RUNWAYS.JS — VERSION PRO+ EBLG
// Piste 04/22 réaliste, calcul vent, crosswind,
// dessin piste + corridor, panneau piste.
// ======================================================

// ------------------------------------------------------
// Données piste EBLG (coordonnées réelles)
// ------------------------------------------------------

export const RUNWAYS = {
    "22": {
        id: "22",
        heading: 220,
        start: [50.64834, 5.46639],
        end:   [50.64186, 5.44028]
    },
    "04": {
        id: "04",
        heading: 40,
        start: [50.64186, 5.44028],
        end:   [50.64834, 5.46639]
    }
};

export function getRunwayFromWind(windDir) {
    if (windDir == null) return "22";
    const d22 = Math.abs(windDir - RUNWAYS["22"].heading);
    const d04 = Math.abs(windDir - RUNWAYS["04"].heading);
    const n22 = Math.min(d22, 360 - d22);
    const n04 = Math.min(d04, 360 - d04);
    return n22 < n04 ? "22" : "04";
}

export function updateRunwayPanel(runway, windDir, windSpeed, crosswind = 0) {
    const el = document.getElementById("runway-active");
    if (!el) return;
    el.innerHTML = `
        <b>Piste active :</b> ${runway}<br>
        Vent : ${windDir ?? "—"}° / ${windSpeed ?? "—"} kt<br>
        Crosswind : ${crosswind.toFixed(1)} kt
    `;
}

// ------------------------------------------------------
// Dessin de la piste
// ------------------------------------------------------
export function drawRunway(runwayId = "22", layer) {
    const rwy = RUNWAYS[runwayId];
    if (!rwy || !layer) return;

    layer.clearLayers();

    // Axe principal
    L.polyline([rwy.start, rwy.end], {
        color: "#ffffff",
        weight: 5,
        opacity: 0.95
    }).addTo(layer);

    // Contour lumineux (effet ATC)
    L.polyline([rwy.start, rwy.end], {
        color: "#00ffc8",
        weight: 9,
        opacity: 0.25
    }).addTo(layer);

    // Marqueurs seuils
    L.circleMarker(rwy.start, {
        radius: 4,
        color: "#00ffc8",
        fillColor: "#00ffc8",
        fillOpacity: 1
    }).addTo(layer).bindTooltip("Seuil " + runwayId);

    const opposite = runwayId === "22" ? "04" : "22";
    L.circleMarker(rwy.end, {
        radius: 4,
        color: "#00ffc8",
        fillColor: "#00ffc8",
        fillOpacity: 1
    }).addTo(layer).bindTooltip("Seuil " + opposite);
}

// ------------------------------------------------------
// Corridor d'approche réaliste
// ------------------------------------------------------
export function drawCorridor(runwayId = "22", layer) {
    const rwy = RUNWAYS[runwayId];
    if (!rwy || !layer) return;

    layer.clearLayers();

    // Longueur corridor (NM)
    const corridorLengthNm = 8;

    // Conversion NM → degrés
    const nmToDegLat = 1 / 60;
    const nmToDegLon = 1 / (60 * Math.cos(rwy.start[0] * Math.PI / 180));

    const headingRad = (rwy.heading * Math.PI) / 180;

    const dxNm = Math.cos(headingRad) * corridorLengthNm;
    const dyNm = Math.sin(headingRad) * corridorLengthNm;

    const corridorEnd = [
        rwy.start[0] + dyNm * nmToDegLat,
        rwy.start[1] + dxNm * nmToDegLon
    ];

    L.polyline([corridorEnd, rwy.start], {
        color: "#ff8800",
        weight: 2,
        dashArray: "6,4",
        opacity: 0.8
    }).addTo(layer);
}

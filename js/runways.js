// ======================================================
// RUNWAYS PRO+++ — Cockpit IFR EBLG
// ======================================================
// - Détection piste active (04/22)
// - Calcul crosswind / headwind
// - Mise à jour panneau piste
// - Coordonnées réelles EBLG
// ======================================================

// Coordonnées réelles EBLG
export const RUNWAYS = {
    "04": {
        id: "04",
        heading: 40,
        start: [50.63302, 5.46163],   // seuil 22
        end:   [50.64594, 5.44321]    // seuil 04
    },
    "22": {
        id: "22",
        heading: 220,
        start: [50.64594, 5.44321],   // seuil 04
        end:   [50.63302, 5.46163]    // seuil 22
    }
};

// ------------------------------------------------------
// Détermination piste active selon direction du vent
// ------------------------------------------------------
export function getRunwayFromWind(windDir) {
    if (windDir == null) return RUNWAYS["22"]; // défaut

    const d22 = Math.abs(windDir - RUNWAYS["22"].heading);
    const d04 = Math.abs(windDir - RUNWAYS["04"].heading);

    const n22 = Math.min(d22, 360 - d22);
    const n04 = Math.min(d04, 360 - d04);

    return n22 < n04 ? RUNWAYS["22"] : RUNWAYS["04"];
}

// ------------------------------------------------------
// Calcul vent de travers / vent de face
// ------------------------------------------------------
export function computeCrosswind(windDir, windSpeed, runwayHeading) {
    if (windDir == null || windSpeed == null || runwayHeading == null) {
        return { crosswind: 0, headwind: 0 };
    }

    const angle = (windDir - runwayHeading) * Math.PI / 180;

    const crosswind = Math.sin(angle) * windSpeed;
    const headwind  = Math.cos(angle) * windSpeed;

    return {
        crosswind: Math.abs(crosswind),
        headwind
    };
}

// ------------------------------------------------------
// Mise à jour panneau piste
// ------------------------------------------------------
export function updateRunwayPanel(runway, windDir, windSpeed, crosswind = 0, headwind = 0) {
    const el = document.getElementById("runway-active");
    if (!el) return;

    el.innerHTML = `
        <b>Piste active :</b> ${runway}<br>
        Vent : ${windDir ?? "—"}° / ${windSpeed ?? "—"} kt<br>
        Crosswind : ${crosswind.toFixed(1)} kt<br>
        Headwind : ${headwind.toFixed(1)} kt
    `;
}

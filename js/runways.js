// ======================================================
// RUNWAYS — VERSION PRO+
// Dessin piste + corridor + crosswind + panneau piste
// ======================================================

// ------------------------------------------------------
// Logging PRO+
// ------------------------------------------------------
const IS_DEV = location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1");
const log = (...a) => IS_DEV && console.log("[RUNWAYS]", ...a);
const logErr = (...a) => console.error("[RUNWAYS ERROR]", ...a);


// ------------------------------------------------------
// Données pistes
// ------------------------------------------------------
export const RUNWAYS = {
    "22": {
        heading: 220,
        start: [50.64695, 5.44340],
        end:   [50.64455, 5.46515],
        width_m: 45
    },
    "04": {
        heading: 40,
        start: [50.64455, 5.46515],
        end:   [50.64695, 5.44340],
        width_m: 45
    }
};

export const CORRIDORS = {
    "04": [
        [50.70000, 5.33000],
        [50.67000, 5.40000],
        [50.64455, 5.46515]
    ],
    "22": [
        [50.60000, 5.58000],
        [50.62000, 5.51000],
        [50.64695, 5.44340]
    ]
};


// ------------------------------------------------------
// Outils angulaires
// ------------------------------------------------------
function angleDiff(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, 360 - d);
}


// ------------------------------------------------------
// Dessin piste
// ------------------------------------------------------
export function drawRunway(runway, layer) {
    layer.clearLayers();

    const r = RUNWAYS[runway];
    if (!r) return;

    L.polyline([r.start, r.end], {
        color: "#ffffff",
        weight: 4,
        opacity: 0.9
    }).addTo(layer);
}

// ------------------------------------------------------
// Corridor
// ------------------------------------------------------
export function drawCorridor(runway, layer) {
    try {
        layer.clearLayers();
        if (!runway || runway === "UNKNOWN") return;
        if (!CORRIDORS[runway]) return;

        const line = L.polyline(CORRIDORS[runway], {
            color: "orange",
            weight: 2,
            dashArray: "6,6"
        }).addTo(layer);

        if (L.polylineDecorator) {
            L.polylineDecorator(line, {
                patterns: [{
                    offset: "25%",
                    repeat: "50%",
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 12,
                        polygon: false,
                        pathOptions: { stroke: true, color: "orange" }
                    })
                }]
            }).addTo(layer);
        }

    } catch (err) {
        logErr("Erreur drawCorridor :", err);
    }
}


// ------------------------------------------------------
// Logique METAR
// ------------------------------------------------------
export function getRunwayFromWind(windDir) {
    if (!windDir && windDir !== 0) return "UNKNOWN";

    const diff22 = angleDiff(windDir, 220);
    const diff04 = angleDiff(windDir, 40);

    return diff22 < diff04 ? "22" : "04";
}

export function computeCrosswind(windDir, windSpeed, runwayHeading) {
    if (!windDir || !windSpeed || !runwayHeading)
        return { crosswind: 0, angleDiff: 0 };

    const diff = angleDiff(windDir, runwayHeading);
    const rad = diff * Math.PI / 180;

    return {
        crosswind: Math.round(Math.abs(windSpeed * Math.sin(rad))),
        angleDiff: diff
    };
}


// ------------------------------------------------------
// Panneau piste active
// ------------------------------------------------------
export function updateRunwayPanel(runway, windDir, windSpeed, crosswind) {
    try {
        const panel = document.getElementById("runway-panel");
        if (!panel) return;

        if (runway === "UNKNOWN") {
            panel.innerHTML = "<b>Piste :</b> —<br><b>Vent :</b> —";
            return;
        }

        panel.innerHTML = `
            <b>Piste active :</b> ${runway}<br>
            <b>Vent :</b> ${windDir ?? "—"}° / ${windSpeed ?? "—"} kt<br>
            <b>Crosswind :</b> ${crosswind} kt
        `;
    } catch (err) {
        logErr("Erreur updateRunwayPanel :", err);
    }
}

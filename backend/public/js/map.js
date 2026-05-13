// ======================================================
// MAP.JS — EBLG Cockpit IFR PRO+++
// ======================================================

// ------------------------------------------------------
// 1. Variables globales
// ------------------------------------------------------
export let map = null;

const adsbLayer = L.layerGroup();
const adsbTracksLayer = L.layerGroup();
const adsbLabelsLayer = L.layerGroup();
let adsbHeatmap = null;

const adsbTracks = new Map(); // key = ICAO/HEX → { positions:[], lastUpdate }

// Filtres avion
let adsbFilter = {
    minAlt: 0,
    maxAlt: 45000,
    minSpd: 0,
    maxSpd: 600,
    types: "all" // "all" | "cargo" | "pax" | "ga"
};

// ------------------------------------------------------
// 2. Helpers style avion
// ------------------------------------------------------
function getAdsbColorByAlt(altFt) {
    if (!altFt) return "#888";
    if (altFt < 3000) return "#ff3b3b";
    if (altFt < 8000) return "#ff9f1c";
    if (altFt < 15000) return "#ffd60a";
    if (altFt < 25000) return "#4cc9f0";
    return "#4361ee";
}

function getAdsbRadiusBySpeed(gs) {
    if (!gs) return 4;
    if (gs < 120) return 4;
    if (gs < 250) return 5;
    if (gs < 400) return 6;
    return 7;
}

function getAdsbType(ac) {
    const t = (ac.type || "").toUpperCase();
    if (t.includes("B744") || t.includes("B748") || t.includes("B77") || t.includes("A3") || t.includes("A33"))
        return "cargo";
    if (t.startsWith("B7") || t.startsWith("A3") || t.startsWith("A2"))
        return "pax";
    return "ga";
}

function passesAdsbFilters(ac) {
    const alt = ac.alt_baro || 0;
    const spd = ac.gs || 0;
    const type = getAdsbType(ac);

    if (alt < adsbFilter.minAlt || alt > adsbFilter.maxAlt) return false;
    if (spd < adsbFilter.minSpd || spd > adsbFilter.maxSpd) return false;
    if (adsbFilter.types !== "all" && adsbFilter.types !== type) return false;

    return true;
}

// ------------------------------------------------------
// 3. Initialisation de la carte
// ------------------------------------------------------
export function initMap() {
    map = L.map("map", {
        zoomControl: false,
        minZoom: 8,
        maxZoom: 18
    }).setView([50.64, 5.45], 11);

    // Fond de carte
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    // Couches ADS-B
    adsbLayer.addTo(map);
    adsbTracksLayer.addTo(map);
    adsbLabelsLayer.addTo(map);

    // Heatmap bruit
    adsbHeatmap = L.heatLayer([], {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 1.0
    }).addTo(map);

    console.log("[MAP] Initialisation OK");
}

// ------------------------------------------------------
// 4. Reset map
// ------------------------------------------------------
export function resetMapView() {
    if (!map) return;
    map.setView([50.64, 5.45], 11);
}

// ------------------------------------------------------
// 5. ADSBexchange PRO+++
// ------------------------------------------------------
export async function updateADSB() {
    try {
        const r = await fetch("/api/adsb");
        const data = await r.json();

        if (!data || !data.ac) return;

        const aircraft = data.ac;

        adsbLayer.clearLayers();
        adsbTracksLayer.clearLayers();
        adsbLabelsLayer.clearLayers();

        const now = Date.now();
        const heatPoints = [];

        aircraft.forEach(ac => {
            if (!ac.lat || !ac.lon) return;
            if (!passesAdsbFilters(ac)) return;

            const key = ac.icao || ac.hex || ac.id || `${ac.lat}-${ac.lon}`;
            const pos = [ac.lat, ac.lon];

            // -----------------------------
            // Ghost tracks
            // -----------------------------
            let track = adsbTracks.get(key);
            if (!track) {
                track = { positions: [], lastUpdate: now };
                adsbTracks.set(key, track);
            }

            track.positions.push(pos);
            track.lastUpdate = now;

            if (track.positions.length > 40) {
                track.positions.shift();
            }

            const alt = ac.alt_baro || 0;
            const spd = ac.gs || 0;
            const color = getAdsbColorByAlt(alt);

            // Trace
            if (track.positions.length > 1) {
                L.polyline(track.positions, {
                    color,
                    weight: 2,
                    opacity: 0.6
                }).addTo(adsbTracksLayer);
            }

            // -----------------------------
            // Flèche directionnelle (heading)
            // -----------------------------
            if (ac.track) {
                const arrow = L.polylineDecorator([pos, pos], {
                    patterns: [
                        {
                            offset: 0,
                            repeat: 0,
                            symbol: L.Symbol.arrowHead({
                                pixelSize: 12,
                                polygon: false,
                                pathOptions: {
                                    stroke: true,
                                    color,
                                    weight: 2
                                }
                            })
                        }
                    ]
                });
                arrow.addTo(adsbLayer);
            }

            // -----------------------------
            // Marqueur avion
            // -----------------------------
            const marker = L.circleMarker(pos, {
                radius: getAdsbRadiusBySpeed(spd),
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9
            }).addTo(adsbLayer);

            const callsign = ac.call || "N/A";
            const altTxt = alt ? `${alt} ft` : "—";
            const spdTxt = spd ? `${Math.round(spd)} kt` : "—";
            const typeTxt = getAdsbType(ac).toUpperCase();

            marker.bindPopup(`
                <b>${callsign}</b><br>
                Alt: ${altTxt}<br>
                Speed: ${spdTxt}<br>
                Type: ${ac.type || "?"} (${typeTxt})<br>
                ICAO: ${ac.icao || ac.hex || "?"}
            `);

            // -----------------------------
            // Label dynamique
            // -----------------------------
            const label = L.divIcon({
                className: "adsb-label",
                html: `<div class="adsb-label-text">${callsign}</div>`,
                iconSize: [80, 20],
                iconAnchor: [40, -10]
            });

            L.marker(pos, { icon: label }).addTo(adsbLabelsLayer);

            // -----------------------------
            // Heatmap bruit synchronisée
            // -----------------------------
            const intensity =
                (1 - Math.min(alt / 20000, 1)) *
                (Math.min(spd / 300, 1));

            heatPoints.push([ac.lat, ac.lon, intensity]);
        });

        adsbHeatmap.setLatLngs(heatPoints);

        // Nettoyage des traces anciennes
        for (const [key, track] of adsbTracks.entries()) {
            if (now - track.lastUpdate > 60000) {
                adsbTracks.delete(key);
            }
        }

    } catch (e) {
        console.error("[ADSB] Erreur chargement", e);
    }
}

// Mise à jour automatique
setInterval(updateADSB, 8000);

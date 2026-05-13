// ======================================================
// MAP.JS — EBLG Cockpit IFR PRO+++
// ======================================================

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

const adsbTracks = new Map(); // key → { positions:[], lastUpdate }

let adsbFilter = {
    minAlt: 0,
    maxAlt: 45000,
    minSpd: 0,
    maxSpd: 600,
    types: "all" // "all" | "cargo" | "pax" | "ga"
};

// ------------------------------------------------------
// Helpers style avion
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
// Initialisation carte
// ------------------------------------------------------
export function initMap() {
    map = L.map("map", {
        zoomControl: false,
        minZoom: 8,
        maxZoom: 18
    }).setView([50.64, 5.45], 11);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    adsbLayer.addTo(map);
    adsbTracksLayer.addTo(map);
    adsbLabelsLayer.addTo(map);

    adsbHeatmap = L.heatLayer([], {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 1.0
    }).addTo(map);

    approachCorridorLayer.addTo(map);
    departureCorridorLayer.addTo(map);
    noiseZoneLayer.addTo(map);
    glidePathLayer.addTo(map);

    drawNoiseAbatementZones();

    console.log("[MAP] Initialisation OK");
}

export function resetMapView() {
    if (!map) return;
    map.setView([50.64, 5.45], 11);
}

// ------------------------------------------------------
// Géométrie pistes EBLG
// ------------------------------------------------------
const RWY = {
    "22": {
        start: [50.64695, 5.44340],
        end:   [50.64455, 5.46515],
        heading: 220
    },
    "04": {
        start: [50.64455, 5.46515],
        end:   [50.64695, 5.44340],
        heading: 40
    }
};

const NM = 1852;

// ------------------------------------------------------
// Corridors + glide path + noise
// ------------------------------------------------------
export function drawApproachCorridor(runway) {
    approachCorridorLayer.clearLayers();
    glidePathLayer.clearLayers();
    if (!runway || !RWY[runway]) return;

    const r = RWY[runway];

    const corridorLengthNM = 12;
    const corridorWidthNM  = 1.2;

    const rad = (r.heading - 180) * Math.PI / 180;
    const [lat0, lon0] = r.start;

    const lat1 = lat0 + (corridorLengthNM * NM) * Math.cos(rad) / 111320;
    const lon1 = lon0 + (corridorLengthNM * NM) * Math.sin(rad) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const w = corridorWidthNM * NM;
    const perp = rad + Math.PI/2;

    const latL0 = lat0 + (w/2) * Math.cos(perp) / 111320;
    const lonL0 = lon0 + (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const latR0 = lat0 - (w/2) * Math.cos(perp) / 111320;
    const lonR0 = lon0 - (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const latL1 = lat1 + (w/2) * Math.cos(perp) / 111320;
    const lonL1 = lon1 + (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const latR1 = lat1 - (w/2) * Math.cos(perp) / 111320;
    const lonR1 = lon1 - (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    L.polygon([
        [latL0, lonL0],
        [latL1, lonL1],
        [latR1, lonR1],
        [latR0, lonR0]
    ], {
        color: "orange",
        weight: 2,
        fillColor: "orange",
        fillOpacity: 0.15
    }).addTo(approachCorridorLayer);

    L.polylineDecorator([[lat0, lon0], [lat1, lon1]], {
        patterns: [{
            offset: "50%",
            repeat: 0,
            symbol: L.Symbol.arrowHead({
                pixelSize: 18,
                polygon: false,
                pathOptions: { color: "orange", weight: 3 }
            })
        }]
    }).addTo(approachCorridorLayer);

    drawGlidePath(runway);
}

export function drawDepartureCorridor(runway) {
    departureCorridorLayer.clearLayers();
    if (!runway || !RWY[runway]) return;

    const r = RWY[runway];

    const corridorLengthNM = 10;
    const corridorWidthNM  = 1.5;

    const rad = (r.heading) * Math.PI / 180;
    const [lat0, lon0] = r.end;

    const lat1 = lat0 + (corridorLengthNM * NM) * Math.cos(rad) / 111320;
    const lon1 = lon0 + (corridorLengthNM * NM) * Math.sin(rad) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const w = corridorWidthNM * NM;
    const perp = rad + Math.PI/2;

    const latL0 = lat0 + (w/2) * Math.cos(perp) / 111320;
    const lonL0 = lon0 + (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const latR0 = lat0 - (w/2) * Math.cos(perp) / 111320;
    const lonR0 = lon0 - (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const latL1 = lat1 + (w/2) * Math.cos(perp) / 111320;
    const lonL1 = lon1 + (w/2) * Math.sin(perp) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    const latR1 = lat1 - (w/2) * Math.cos(perp) / 111320;
    const lonR1 = lon1 - (w/2) * Math.cos(perp) / 111320 / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    L.polygon([
        [latL0, lonL0],
        [latL1, lonL1],
        [latR1, lonR1],
        [latR0, lonR0]
    ], {
        color: "#ff9f1c",
        weight: 2,
        fillColor: "#ff9f1c",
        fillOpacity: 0.12
    }).addTo(departureCorridorLayer);

    L.polylineDecorator([[lat0, lon0], [lat1, lon1]], {
        patterns: [{
            offset: "50%",
            repeat: 0,
            symbol: L.Symbol.arrowHead({
                pixelSize: 18,
                polygon: false,
                pathOptions: { color: "#ff9f1c", weight: 3 }
            })
        }]
    }).addTo(departureCorridorLayer);
}

export function drawGlidePath(runway) {
    glidePathLayer.clearLayers();
    if (!runway || !RWY[runway]) return;

    const r = RWY[runway];

    const gpLengthNM = 10;
    const rad = (r.heading - 180) * Math.PI / 180;
    const [lat0, lon0] = r.start;

    const lat1 = lat0 + (gpLengthNM * NM) * Math.cos(rad) / 111320;
    const lon1 = lon0 + (gpLengthNM * NM) * Math.sin(rad) / (40075000 * Math.cos(lat0 * Math.PI/180) / 360);

    L.polyline([[lat0, lon0], [lat1, lon1]], {
        color: "#00ff88",
        weight: 2,
        dashArray: "6,4"
    }).addTo(glidePathLayer);
}

export function drawNoiseAbatementZones() {
    noiseZoneLayer.clearLayers();

    // Exemple simple : deux zones au NE et SW de l’aéroport
    const zone1 = L.circle([50.66, 5.47], {
        radius: 2500,
        color: "#ff006e",
        weight: 1,
        fillColor: "#ff006e",
        fillOpacity: 0.08
    });

    const zone2 = L.circle([50.63, 5.42], {
        radius: 2500,
        color: "#ff006e",
        weight: 1,
        fillColor: "#ff006e",
        fillOpacity: 0.08
    });

    zone1.addTo(noiseZoneLayer);
    zone2.addTo(noiseZoneLayer);
}

// ------------------------------------------------------
// ADSBexchange PRO+++
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

            let track = adsbTracks.get(key);
            if (!track) {
                track = { positions: [], lastUpdate: now };
                adsbTracks.set(key, track);
            }

            track.positions.push(pos);
            track.lastUpdate = now;
            if (track.positions.length > 40) track.positions.shift();

            const alt = ac.alt_baro || 0;
            const spd = ac.gs || 0;
            const color = getAdsbColorByAlt(alt);

            if (track.positions.length > 1) {
                L.polyline(track.positions, {
                    color,
                    weight: 2,
                    opacity: 0.6
                }).addTo(adsbTracksLayer);
            }

            if (ac.track) {
                L.polylineDecorator([pos, pos], {
                    patterns: [{
                        offset: 0,
                        repeat: 0,
                        symbol: L.Symbol.arrowHead({
                            pixelSize: 12,
                            polygon: false,
                            pathOptions: { color, weight: 2 }
                        })
                    }]
                }).addTo(adsbLayer);
            }

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

            const label = L.divIcon({
                className: "adsb-label",
                html: `<div class="adsb-label-text">${callsign}</div>`,
                iconSize: [80, 20],
                iconAnchor: [40, -10]
            });

            L.marker(pos, { icon: label }).addTo(adsbLabelsLayer);

            const intensity =
                (1 - Math.min(alt / 20000, 1)) *
                (Math.min(spd / 300, 1));

            heatPoints.push([ac.lat, ac.lon, intensity]);
        });

        adsbHeatmap.setLatLngs(heatPoints);

        for (const [key, track] of adsbTracks.entries()) {
            if (now - track.lastUpdate > 60000) {
                adsbTracks.delete(key);
            }
        }

    } catch (e) {
        console.error("[ADSB] Erreur chargement", e);
    }
}

setInterval(updateADSB, 8000);

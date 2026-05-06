// ===============================================
// SERVER.JS — VERSION PRO+ AUTONOME + FIDS RÉELS
// ===============================================

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { SONOMETERS } from "./sonometers-data.js";
import { generateDynamicFids } from "./fallbackFids.js";

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// PATHS FRONTEND
// =========================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(__dirname, "..");

// =========================
// CORS PRO+
// =========================
app.use(cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
}));

// =========================
// CACHE PRO+ (METAR / TAF)
// =========================
const cache = {
    metar: { ts: 0, data: null },
    taf: { ts: 0, data: null }
};

function getCache(key, ttl = 60000) {
    const now = Date.now();
    if (cache[key].data && (now - cache[key].ts < ttl)) {
        console.log("[CACHE HIT]", key);
        return cache[key].data;
    }
    return null;
}

function setCache(key, data) {
    cache[key].ts = Date.now();
    cache[key].data = data;
}

// =========================
// FETCH PRO+ SÉCURISÉ
// =========================
async function safeFetch(url) {
    try {
        console.log("[FETCH] →", url);
        const res = await fetch(url);
        if (!res.ok) return { fallback: true };
        return await res.json();
    } catch (err) {
        console.error("[FETCH ERROR]", err);
        return { fallback: true };
    }
}

// =========================
// ROUTES API
// =========================

// METAR
app.get("/metar", async (req, res) => {
    const cached = getCache("metar");
    if (cached) return res.json(cached);

    const data = await safeFetch(
        `https://api.checkwx.com/metar/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{ raw_text: "METAR unavailable", wind: { degrees: 0, speed_kts: 0 } }]
        };
        setCache("metar", fb);
        return res.json(fb);
    }

    data.fallback = false;
    setCache("metar", data);
    res.json(data);
});

// TAF
app.get("/taf", async (req, res) => {
    const cached = getCache("taf");
    if (cached) return res.json(cached);

    const data = await safeFetch(
        `https://api.checkwx.com/taf/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{ raw_text: "TAF unavailable" }]
        };
        setCache("taf", fb);
        return res.json(fb);
    }

    data.fallback = false;
    setCache("taf", data);
    res.json(data);
});

// SONOMETERS
app.get("/sonos", (req, res) => {
    res.json(SONOMETERS);
});

// ======================================================
// FIDS PRO+ — Données réelles Liege Airport + fallback
// ======================================================

const URL_ARR = "https://fids.liegeairport.com/api/flights/Arrivals";
const URL_DEP = "https://fids.liegeairport.com/api/flights/Departures";

app.get("/fids", async (req, res) => {
    try {
        const depRes = await fetch(URL_DEP);
        if (!depRes.ok) throw new Error("Departures unreachable");

        const depJson = await depRes.json();

        const flights = depJson.map(f => ({
            flight: f.flightNumber || "N/A",
            destination: f.destination || "N/A",
            time: f.scheduledTime || "N/A",
            status: f.status || "N/A",
            fallback: false
        }));

        return res.json(flights);

    } catch (err) {
        console.log("[FIDS] ERREUR → fallback cargo");
        return res.json(generateDynamicFids());
    }
});

// =========================
// SERVE FRONTEND
// =========================
app.use(express.static(FRONTEND));

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log("[BACKEND PRO+] Running on port", PORT);
});

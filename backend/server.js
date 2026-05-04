import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// CORS PRO+
// =========================
app.use(cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
}));

// =========================
// ROUTES API D’ABORD
// =========================

// METAR
app.get("/metar", async (req, res) => {
    const cached = getCache("metar");
    if (cached) {
        cached.fallback = false;
        return res.json(cached);
    }

    const data = await safeFetch(
        `https://api.checkwx.com/metar/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{
                raw_text: "METAR unavailable",
                wind: { degrees: 0, speed_kts: 0 }
            }],
            timestamp: new Date().toISOString()
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
    if (cached) {
        cached.fallback = false;
        return res.json(cached);
    }

    const data = await safeFetch(
        `https://api.checkwx.com/taf/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{
                raw_text: "TAF unavailable"
            }],
            timestamp: new Date().toISOString()
        };
        setCache("taf", fb);
        return res.json(fb);
    }

    data.fallback = false;
    setCache("taf", data);
    res.json(data);
});

// FIDS
app.get("/fids", async (req, res) => {
    const cached = getCache("fids");
    if (cached) return res.json(cached);

    const url = `http://api.aviationstack.com/v1/flights?dep_iata=LGG&access_key=${process.env.AVIATIONSTACK_KEY}`;
    const data = await safeFetch(url);

    if (data.fallback || !data.data || data.data.length === 0) {
        const fb = generateDynamicFids();
        setCache("fids", fb);
        return res.json(fb);
    }

    const flights = data.data.slice(0, 10).map(f => ({
        flight: f.flight?.iata || "N/A",
        destination: f.arrival?.iata || "N/A",
        time: f.departure?.scheduled || "N/A",
        status: f.flight_status || "N/A",
        fallback: false
    }));

    setCache("fids", flights);
    res.json(flights);
});

// SONOMETERS
import { SONOMETERS } from "./sonometers-data.js";

app.get("/sonos", (req, res) => {
    res.json(SONOMETERS);
});

// =========================
// ENSUITE SEULEMENT LE FRONTEND
// =========================
app.use(express.static("."));          
app.use(express.static("assets"));
app.use(express.static("css"));
app.use(express.static("js"));

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log("[PROXY] Running on port", PORT);
});

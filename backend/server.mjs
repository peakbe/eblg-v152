import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS (optionnel)
app.use(cors());

// STATIC FRONTEND
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// --------------------------------------------------
// ADS-B OpenSky PRO+++ (cache + normalisation)
// --------------------------------------------------
let adsbCache = null;
let adsbCacheTime = 0;

app.get("/api/adsb", async (req, res) => {
    const now = Date.now();

    // Cache 10 s
    if (adsbCache && now - adsbCacheTime < 10000) {
        return res.json(adsbCache);
    }

    try {
        const url = "https://opensky-network.org/api/states/all?lamin=50.2&lomin=5.0&lamax=51.0&lomax=6.0";
        const r = await fetch(url);

        if (!r.ok) {
            console.error("[ADSB] OpenSky HTTP", r.status);
            if (adsbCache) return res.json(adsbCache);
            return res.status(502).json({ error: "OpenSky upstream error" });
        }

        const json = await r.json();
        const states = json.states || [];

        // Normalisation → format attendu par map.js : { ac: [...] }
        const ac = states
            .map(s => {
                const icao = s[0];
                const call = (s[1] || "").trim();
                const lon = s[5];
                const lat = s[6];
                const alt_m = s[7];
                const vel_ms = s[9];
                const track = s[10];

                if (lat == null || lon == null) return null;

                const alt_ft = alt_m != null ? Math.round(alt_m * 3.28084) : null;
                const gs_kt = vel_ms != null ? vel_ms * 1.94384 : null;

                return {
                    icao,
                    hex: icao,
                    call,
                    lat,
                    lon,
                    alt_baro: alt_ft,
                    gs: gs_kt,
                    track,
                    type: null
                };
            })
            .filter(Boolean);

        const payload = { ac };

        adsbCache = payload;
        adsbCacheTime = now;

        res.json(payload);

    } catch (e) {
        console.error("[ADSB] OpenSky fetch failed", e);
        if (adsbCache) return res.json(adsbCache);
        res.status(500).json({ error: "ADSB fetch failed" });
    }
});

// FALLBACK SPA
app.get("*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// START
app.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
});

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
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
// ADSBexchange PRO+++ (EBLG, cache, fallback)
// --------------------------------------------------
let adsbCache = null;
let adsbCacheTime = 0;

app.get("/api/adsb", async (req, res) => {
    const now = Date.now();

    // Cache 5 s
    if (adsbCache && now - adsbCacheTime < 5000) {
        return res.json(adsbCache);
    }

    try {
        const url = "https://api.adsbexchange.com/v2/lat/50.64/lon/5.45/dist/80/";
        const headers = {};

        // Optionnel : clé API via variable d'env
        if (process.env.ADSBEX_API_KEY) {
            headers["api-auth"] = process.env.ADSBEX_API_KEY;
        }

        const r = await fetch(url, { headers });

        if (!r.ok) {
            console.error("[ADSB] Upstream error", r.status);
            if (adsbCache) return res.json(adsbCache);
            return res.status(502).json({ error: "ADSBexchange upstream error" });
        }

        const json = await r.json();

        adsbCache = json;
        adsbCacheTime = now;

        res.json(json);

    } catch (e) {
        console.error("[ADSB] Fetch failed", e);
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

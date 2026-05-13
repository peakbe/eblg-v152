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

// API ADS-B PROXY
app.get("/api/adsb", async (req, res) => {
    try {
        const r = await fetch("https://opensky-network.org/api/states/all");
        if (!r.ok) {
            console.error("[ADSB] HTTP error", r.status);
            return res.status(502).json({ error: "Upstream ADSB error" });
        }

        const json = await r.json();
        res.json(json);
    } catch (e) {
        console.error("[ADSB] Fetch failed", e);
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

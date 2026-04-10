// ======================================================
// HELPERS — VERSION PRO+
// fetch JSON, status panel, distance, utils
// ======================================================


// ------------------------------------------------------
// Logging PRO+
// ------------------------------------------------------
const IS_DEV = location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1");
const log = (...a) => IS_DEV && console.log("[HELPERS]", ...a);
const logErr = (...a) => console.error("[HELPERS ERROR]", ...a);


// ======================================================
// 1) Fetch JSON sécurisé
// ======================================================
export async function fetchJSON(url) {
    try {
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            logErr("HTTP error", res.status, url);
            return { fallback: true };
        }

        const data = await res.json();
        return data;

    } catch (err) {
        logErr("Erreur fetchJSON :", err);
        return { fallback: true };
    }
}


// ======================================================
// 2) Mise à jour panneau statut (METAR/TAF/FIDS)
// ======================================================
export function updateStatusPanel(label, data) {
    try {
        const el = document.getElementById("status-panel");
        if (!el) return;

        const ok = !data.fallback;

        const row = document.createElement("div");
        row.className = ok ? "status-ok" : "status-fail";
        row.textContent = `${label} : ${ok ? "OK" : "Erreur"}`;

        el.appendChild(row);

    } catch (err) {
        logErr("Erreur updateStatusPanel :", err);
    }
}


// ======================================================
// 3) Distance Haversine (km)
// ======================================================
export function haversineDistance([lat1, lon1], [lat2, lon2]) {
    try {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;

        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    } catch (err) {
        logErr("Erreur haversineDistance :", err);
        return 0;
    }
}

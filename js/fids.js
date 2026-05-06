// ======================================================
// FIDS — VERSION PRO+
// Chargement sécurisé, UI compacte, fallback clair.
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON, updateStatusPanel } from "./helpers.js";

const IS_DEV = location.hostname.includes("localhost");
const log = (...a) => IS_DEV && console.log("[FIDS]", ...a);
const logErr = (...a) => console.error("[FIDS ERROR]", ...a);

// ------------------------------------------------------
// Chargement sécurisé
// ------------------------------------------------------
export async function safeLoadFids() {
    try {
        await loadFids();
        log("FIDS chargé");
    } catch (err) {
        logErr("Erreur FIDS :", err);
    }
}

// ------------------------------------------------------
// Chargement brut
// ------------------------------------------------------
export async function loadFids() {
    const data = await fetchJSON(ENDPOINTS.fids);
    updateFidsUI(data);
    updateStatusPanel("FIDS", data);
}

// ------------------------------------------------------
// Mise à jour UI
// ------------------------------------------------------
export function updateFidsUI(data) {
    const el = document.getElementById("fids-list");
    if (!el) return;

    el.innerHTML = "";

    if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="fids-row">Aucun départ disponible</div>`;
        return;
    }

    const isFallback = data.some(f => f.fallback);

    data.forEach(f => {
        const row = document.createElement("div");
        row.className = "fids-row";

        row.innerHTML = `
            <span class="fids-flight">${f.flight}</span>
            <span class="fids-dest">${f.destination}</span>
            <span class="fids-time">${f.time}</span>
            <span class="fids-status ${f.status?.toLowerCase() || ""}">
                ${f.status || "—"}
            </span>
        `;

        el.appendChild(row);
    });

    if (isFallback) {
        const fb = document.createElement("div");
        fb.className = "fids-fallback";
        fb.textContent = "Données FIDS simulées (fallback).";
        el.appendChild(fb);
    }
}

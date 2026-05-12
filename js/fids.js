// ======================================================
// FIDS PRO+++ — Compatible backend cargo EBLG
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON, updateStatusPanel } from "./helpers.js";

export async function safeLoadFids() {
    try {
        await loadFids();
    } catch (err) {
        console.error("[FIDS ERROR]", err);
    }
}

export async function loadFids() {
    const data = await fetchJSON(ENDPOINTS.fids);
    updateFidsUI(data);
    updateStatusPanel("FIDS", data);
}

// Convertit "N/A" en valeur triable
function parseTime(t) {
    if (!t || t === "N/A") return 9999;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

export function updateFidsUI(data) {
    const arrEl = document.getElementById("fids-arrivals");
    const depEl = document.getElementById("fids-departures");
    if (!arrEl || !depEl) return;

    arrEl.innerHTML = `<div class="fids-section-title">Arrivées</div>`;
    depEl.innerHTML = `<div class="fids-section-title">Départs</div>`;

    if (!Array.isArray(data) || !data.length) {
        depEl.innerHTML += `<div class="fids-row">Aucun vol disponible</div>`;
        return;
    }

    // Ton backend ne renvoie que des départs → on les marque comme tels
    const departures = data.map(f => ({
        ...f,
        type: "departure"
    }));

    // Tri par heure (N/A en bas)
    departures.sort((a, b) => parseTime(a.time) - parseTime(b.time));

    // Limiter à 10 vols
    const nextDepartures = departures.slice(0, 10);

    // Icônes ATC minimalistes
    const icons = {
        arrival: "🛬",
        departure: "🛫",
        delayed: "🟧",
        cancelled: "🟥",
        "on time": "🟩"
    };

    function render(list, container) {
        list.forEach(f => {
            const status = (f.status || "").toLowerCase();

            let cssClass = "fids-unknown";
            if (status.includes("on time")) cssClass = "fids-on-time";
            if (status.includes("delayed")) cssClass = "fids-delayed";
            if (status.includes("cancel")) cssClass = "fids-cancelled";

            const icon = icons[f.type] || "✈️";

            const row = document.createElement("div");
            row.className = `fids-row ${cssClass}`;

            row.innerHTML = `
                <span class="fids-icon">${icon}</span>
                <span class="fids-flight">${f.flight || "—"}</span>
                <span class="fids-dest">${f.destination || "—"}</span>
                <span class="fids-time">${f.time || "—"}</span>
            `;

            container.appendChild(row);
        });
    }

    // Arrivées vides (normal pour cargo)
    render([], arrEl);

    // Départs cargo
    render(nextDepartures, depEl);
}

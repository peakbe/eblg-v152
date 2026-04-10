// ======================================================
// APP.JS — VERSION PRO+ v96
// Initialisation séquencée, rechargement périodique,
// gestion d’erreurs centralisée, logs propres.
// ======================================================


// ------------------------------------------------------
// 1) IMPORTS
// ------------------------------------------------------

// Carte + sonomètres (initMap initialise déjà les markers)
import { initMap } from "./map.js";

// METAR / TAF / FIDS
import { loadMetar } from "./metar.js";
import { loadTaf } from "./taf.js";
import { loadFids } from "./fids.js";

// UI générale
import { initUI } from "./ui.js";

// Sonomètres : liste + heatmap toggle
import { populateSonometerList, initHeatmapToggle } from "./sonometers.js";


// ------------------------------------------------------
// 2) CONFIG RUNTIME
// ------------------------------------------------------

const REFRESH_INTERVALS = {
    metar: 60_000,   // 1 min
    taf:   10 * 60_000, // 10 min
    fids:  60_000    // 1 min
};

const IS_DEV = location.hostname === "localhost" || location.hostname === "127.0.0.1";

function logInfo(...args) {
    if (IS_DEV) console.log("[APP]", ...args);
}

function logError(...args) {
    console.error("[APP ERROR]", ...args);
}


// ------------------------------------------------------
// 3) WRAPPERS SÉCURISÉS
// ------------------------------------------------------

async function safeLoadMetar() {
    try {
        await loadMetar();
        logInfo("METAR chargé");
    } catch (err) {
        logError("Erreur METAR :", err);
    }
}

async function safeLoadTaf() {
    try {
        await loadTaf();
        logInfo("TAF chargé");
    } catch (err) {
        logError("Erreur TAF :", err);
    }
}

async function safeLoadFids() {
    try {
        await loadFids();
        logInfo("FIDS chargé");
    } catch (err) {
        logError("Erreur FIDS :", err);
    }
}


// ------------------------------------------------------
// 4) INITIALISATION PRINCIPALE
// ------------------------------------------------------

window.onload = () => {
    logInfo("Initialisation de l’application…");

    // ------------------------------
    // A) Carte Leaflet
    // ------------------------------
    try {
        window.map = initMap();
        logInfo("Carte initialisée");
    } catch (err) {
        logError("Erreur initMap :", err);
        return; // Sans carte, on arrête tout
    }

    // ------------------------------
    // B) Interface utilisateur
    // ------------------------------
    try {
        initUI();
        logInfo("UI initialisée");
    } catch (err) {
        logError("Erreur initUI :", err);
    }

    // ------------------------------
    // C) Données initiales
    // ------------------------------
    safeLoadMetar();
    safeLoadTaf();
    safeLoadFids();

    // ------------------------------
    // D) Liste des sonomètres
    // ------------------------------
    try {
        populateSonometerList();
        logInfo("Liste des sonomètres générée");
    } catch (err) {
        logError("Erreur populateSonometerList :", err);
    }

    // ------------------------------
    // E) Heatmap ON/OFF
    // ------------------------------
    try {
        initHeatmapToggle(window.map);
        logInfo("Toggle Heatmap initialisé");
    } catch (err) {
        logError("Erreur initHeatmapToggle :", err);
    }

    // ------------------------------
    // F) Rechargement périodique
    // ------------------------------
    setInterval(safeLoadMetar, REFRESH_INTERVALS.metar);
    setInterval(safeLoadTaf,   REFRESH_INTERVALS.taf);
    setInterval(safeLoadFids,  REFRESH_INTERVALS.fids);

    logInfo("Timers de rafraîchissement configurés");
};

// ======================================================
// CONFIG — VERSION PRO+
// Endpoints, constantes, sonomètres, adresses
// ======================================================


// ------------------------------------------------------
// Logging PRO+
// ------------------------------------------------------
const IS_DEV = location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1");
const log = (...a) => IS_DEV && console.log("[CONFIG]", ...a);


// ======================================================
// 1) ENDPOINTS API
// ======================================================
// Tous les modules PRO+ utilisent fetchJSON() avec fallback
// Ces URLs sont centralisées ici pour éviter les doublons
// ======================================================

export const PROXY = "https://eblg-dashboard-v84.onrender.com";

export const ENDPOINTS = {
    metar: "/metar",
    taf: "/taf",
    fids: "/fids",
    sonometers: "/sonos"   // ← CORRECTION CRITIQUE
};

log("Endpoints configurés :", ENDPOINTS);


// ======================================================
// 2) SONOMÈTRES (coordonnées)
// ======================================================
// Structure utilisée par initSonometers() PRO+
// ======================================================

export const SONOMETERS = [
    {
        id: "F017",
        address: "Rue de la Pommeraie, 4690 Wonck, Belgique",
        lat: 50.764883,
        lon: 5.630606
    },
    {
        id: "F001",
        address: "Rue Franquet, Houtain",
        lat: 50.738044,
        lon: 5.608833
    },
    {
        id: "F014",
        address: "Rue Léon Labaye, Juprelle",
        lat: 50.718894,
        lon: 5.573164
    },
    {
        id: "F015",
        address: "Rue du Brouck, Juprelle",
        lat: 50.688839,
        lon: 5.526217
    },
    {
        id: "F005",
        address: "Rue Caquin, Haneffe",
        lat: 50.639331,
        lon: 5.323519
    },
    {
        id: "F003",
        address: "Rue Fond Méan, Saint-Georges",
        lat: 50.601167,
        lon: 5.381400
    },
    {
        id: "F011",
        address: "Rue Albert 1er, Saint-Georges",
        lat: 50.601142,
        lon: 5.356006
    },
    {
        id: "F008",
        address: "Rue Warfusée, Saint-Georges",
        lat: 50.594878,
        lon: 5.358950
    },
    {
        id: "F002",
        address: "Rue Noiset, Saint-Georges",
        lat: 50.588414,
        lon: 5.370522
    },
    {
        id: "F007",
        address: "Rue Yernawe, Saint-Georges",
        lat: 50.590756,
        lon: 5.344114
    },
    {
        id: "F009",
        address: "Bibliothèque Communale, Place Verte 4470 Stockay",
        lat: 50.580831,
        lon: 5.355417
    },
    {
        id: "F004",
        address: "Vinâve des Stréats, Verlaine",
        lat: 50.605414,
        lon: 5.321406
    },
    {
        id: "F010",
        address: "Rue Haute Voie, Verlaine",
        lat: 50.599392,
        lon: 5.313492
    },
    {
        id: "F013",
        address: "Rue Bois Léon, Verlaine",
        lat: 50.586914,
        lon: 5.308678
    },
    {
        id: "F016",
        address: "Rue de Chapon-Seraing, Verlaine",
        lat: 50.619616,
        lon: 5.295344
    },
    {
        id: "F006",
        address: "Rue Bolly Chapon, Seraing",
        lat: 50.609594,
        lon: 5.271403
    },
    {
        id: "F012",
        address: "Rue Barbe d'Or, 4317 Aineffe",
        lat: 50.621917,
        lon: 5.254747
    }
];

log("Adresses sonomètres chargées :", Object.keys(SONOMETERS).length);

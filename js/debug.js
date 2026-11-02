/*
 * DEBUG – simuleer heel veel potjes om de balans te testen.
 *
 * In de browser (console, op de pagina van de game):
 *     const d = await import('./js/debug.js'); d.simuleerAlles(100);
 * Of open de game met ?debug in de adresbalk.
 *
 * In Node (vanuit de projectmap):
 *     node js/debug.js 100
 */

import * as C from './config.js';
import { KARAKTERS } from './data/characters.js';
import * as S from './state.js';
import { berekenWerelden } from './werelden.js';

// Klein, voorspelbaar willekeurig-getal-generator (zelfde seed = zelfde potjes).
export function maakRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const kies = (lijst, rng) => lijst[Math.floor(rng() * lijst.length)];

export const STRATEGIEEN = {
  // Verstandige speler: zorgtoeslag aanvragen, laag eigen risico als je veel zorg verwacht.
  slim: {
    verzekering(state) {
      const ziek = state.chronisch.length > 0 || state.faseIndex >= 4;
      return { vrijwillig: ziek ? 0 : 500, aanvullend: false, toeslag: true };
    },
    dilemma: (state, getrokken, rng) => Math.floor(rng() * getrokken.dilemma.keuzes.length),
  },
  // Kiest overal willekeurig.
  willekeurig: {
    verzekering: (state, rng) => ({
      vrijwillig: kies(C.VRIJWILLIG_OPTIES, rng),
      aanvullend: rng() < 0.5,
      toeslag: rng() < 0.5,
    }),
    dilemma: (state, getrokken, rng) => Math.floor(rng() * getrokken.dilemma.keuzes.length),
  },
  // Pech-speler: vraagt nooit zorgtoeslag aan, hoogste eigen risico, mijdt zorg.
  onhandig: {
    verzekering: () => ({ vrijwillig: 500, aanvullend: true, toeslag: false }),
    dilemma: (state, getrokken) => getrokken.dilemma.keuzes.length - 1,
  },
};

// Speel één heel potje, in dezelfde volgorde als het spelscherm.
export function speelPotje(karakter, strategie, rng) {
  const s = S.nieuwSpel(karakter, rng);
  while (s.status === 'bezig') {
    const diagnose = S.diagnoseDezeFase(s);
    if (diagnose) S.activeerChronisch(s, diagnose);
    if (s.status !== 'bezig') break;

    S.startFase(s, strategie.verzekering(s, rng));
    if (s.status !== 'bezig') break;

    for (const { gebeurtenis, leeftijd } of S.trekGebeurtenissen(s)) {
      S.verwerkGebeurtenis(s, gebeurtenis, leeftijd);
      if (s.status !== 'bezig') break;
    }
    if (s.status !== 'bezig') break;

    const getrokken = S.trekDilemma(s);
    if (getrokken) S.verwerkDilemma(s, getrokken.dilemma, strategie.dilemma(s, getrokken, rng), getrokken.leeftijd, getrokken.ctx);
    if (s.status !== 'bezig') break;

    S.eindigFase(s);
  }
  return s;
}

const gemiddelde = (lijst) => Math.round(lijst.reduce((a, b) => a + b, 0) / Math.max(1, lijst.length));

export function simuleer(karakter, aantal = 100, strategieNaam = 'slim', seed = 42) {
  const rng = maakRng(seed);
  const strategie = STRATEGIEEN[strategieNaam];
  const potjes = [];
  for (let i = 0; i < aantal; i++) {
    const s = speelPotje(karakter, strategie, rng);
    // Controle: de portemonnee moet precies gelijk zijn aan startgeld + alle geldbewegingen.
    const kas = s.kasboek.reduce((som, k) => som + k.bedrag, karakter.startgeld);
    if (Math.abs(kas - s.portemonnee) > 0.5) console.warn('Kasboek klopt niet!', kas, s.portemonnee);
    // Controle: nooit meer eigen risico per jaar dan het maximum.
    for (const [leeftijd, jaar] of Object.entries(s.jaren)) {
      if (jaar.eigenRisico > C.EIGEN_RISICO_VERPLICHT + 500) console.warn('Te veel eigen risico op', leeftijd, jaar);
      if (jaar.aanvullend > C.AANVULLEND.maxVergoedingPerJaar) console.warn('Te veel aanvullend op', leeftijd, jaar);
    }
    potjes.push({ s, r: S.rekening(s), w: berekenWerelden(s) });
  }
  const klaar = potjes.filter((p) => p.s.status === 'klaar');
  return {
    karakter: karakter.naam,
    strategie: strategieNaam,
    'gehaald (%)': Math.round((klaar.length / aantal) * 100),
    'gezondheid op (%)': Math.round((potjes.filter((p) => p.s.status === 'gezondheid').length / aantal) * 100),
    'schulden (%)': Math.round((potjes.filter((p) => p.s.status === 'schulden').length / aantal) * 100),
    'eind-portemonnee': gemiddelde(potjes.map((p) => p.s.portemonnee)),
    'eind-gezondheid': gemiddelde(potjes.map((p) => p.s.gezondheid)),
    'betaald aan zorg': gemiddelde(potjes.map((p) => p.r.betaald)),
    'zorg kostte': gemiddelde(potjes.map((p) => p.r.zorgkosten)),
    'verschil (+ = meebetaald)': gemiddelde(potjes.map((p) => p.r.verschil)),
    'ieder-v-z verzekerd': gemiddelde(potjes.map((p) => p.w.ieder.verzekerd.totaal)),
    'ieder-v-z failliet (%)': Math.round((potjes.filter((p) => p.w.ieder.verzekerd.failliet !== null).length / aantal) * 100),
    'onverzekerd': gemiddelde(potjes.map((p) => p.w.ieder.onverzekerd.totaal)),
    'overheid': gemiddelde(potjes.map((p) => p.w.overheid.totaal)),
    'score': gemiddelde(potjes.map((p) => S.levensscore(p.s))),
  };
}

export function simuleerAlles(aantal = 100, strategieen = Object.keys(STRATEGIEEN)) {
  const rijen = [];
  for (const strategie of strategieen) {
    for (const k of KARAKTERS) rijen.push(simuleer(k, aantal, strategie));
  }
  console.table(rijen);
  return rijen;
}

// Automatisch starten in Node, of in de browser met ?debug in de URL.
if (typeof window === 'undefined') {
  const aantal = Number(globalThis.process?.argv?.[2]) || 100;
  simuleerAlles(aantal);
} else if (new URLSearchParams(window.location.search).has('debug')) {
  simuleerAlles(100);
}

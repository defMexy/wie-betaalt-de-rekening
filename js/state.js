/*
 * ============================================================================
 *  SPELSTATUS & BEREKENINGEN
 * ============================================================================
 *  Alles over geld, gezondheid en zorgkosten staat hier. Er zit geen
 *  schermcode in, zodat js/debug.js het spel ook zonder browser kan spelen.
 *
 *  Verloop van één levensfase:
 *    1. (alleen Daan) diagnose chronische ziekte  -> activeerChronisch()
 *    2. verzekeringskeuze                         -> startFase()
 *    3. twee gebeurteniskaarten                   -> trekGebeurtenissen() + verwerkGebeurtenis()
 *    4. één dilemma                               -> trekDilemma() + verwerkDilemma()
 *    5. bonnetje van de fase                      -> eindigFase()
 *
 *  Twee totalen die het hele spel worden bijgehouden:
 *    - wat de speler betaalde: premie − zorgtoeslag + eigen risico + zelf betaald
 *    - wat de zorg écht kostte: alle zorgkosten, wie ze ook betaalde
 * ============================================================================
 */

import * as C from './config.js';
import { GEBEURTENISSEN, vindGebeurtenis } from './data/events.js';
import { DILEMMAS } from './data/dilemmas.js';

// Het potje dat nu gespeeld wordt (gedeeld tussen de schermen).
export const store = { spel: null };

const leegTotaal = () => ({
  premieBasis: 0,       // betaalde premie basisverzekering
  premieAanvullend: 0,  // betaalde premie aanvullende verzekering
  toeslag: 0,           // ontvangen zorgtoeslag
  eigenRisico: 0,       // betaald eigen risico
  zelf: 0,              // zelf betaalde zorg (tandarts/fysio zonder dekking, eigen bijdragen)
  zorgkosten: 0,        // wat alle zorg echt kostte
  verzekeraar: 0,       // wat de verzekeraar betaalde (basis + aanvullend)
  overig: 0,            // geld uit dilemma's dat geen zorg is (boete, sportschool...), + of −
});

/* ---------------------------------------------------------------------------
 * Nieuw spel & kleine hulpjes
 * ------------------------------------------------------------------------- */

export function nieuwSpel(karakter, rng = Math.random) {
  return {
    karakter,
    rng,
    faseIndex: 0,
    leeftijd: C.FASEN[0].van,
    portemonnee: karakter.startgeld,
    gezondheid: karakter.startGezondheid,
    keuze: { vrijwillig: 0, aanvullend: false, toeslag: false }, // keuze van de speler (per fase)
    polis: null,                                                  // wat er deze fase echt geldt
    premieExtra: { basis: 0, aanvullend: 0 },                     // blijvende premieveranderingen per maand
    vlaggen: { budgetpolis: false, eigenRisicoAfgeschaft: false },
    chronisch: [],      // zorgkosten die elk jaar terugkomen
    wachtend: [],       // gebeurtenissen die sowieso komen (gevolg van een keuze)
    gebruikteGebeurtenissen: [],
    gebruikteDilemmas: [],
    keuzes: [],         // gemaakte dilemma-keuzes
    jaren: {},          // per leeftijd: hoeveel eigen risico en aanvullende vergoeding al gebruikt is
    totaal: leegTotaal(),
    fasen: [],          // logboek per fase (bonnetje, De Rekening, Wat als)
    zorglog: [],        // elke zorgpost met leeftijd
    kasboek: [],        // elke geldbeweging met leeftijd: { leeftijd, bedrag, soort }
    status: 'bezig',    // 'bezig' | 'klaar' | 'gezondheid' | 'schulden'
    eindLeeftijd: null,
  };
}

export const huidigeFase = (state) => C.FASEN[state.faseIndex];
export const jarenIn = (fase) => fase.tot - fase.van;
export const inkomenIn = (state, index = state.faseIndex) => state.karakter.inkomen[index];
const faseLog = (state) => state.fasen[state.faseIndex];

const bereik = (item, fase) => [
  Math.max(fase.van, item.minLeeftijd),
  Math.min(fase.tot - 1, item.maxLeeftijd),
];
const pastIn = (item, fase) => {
  const [lo, hi] = bereik(item, fase);
  return lo <= hi;
};
const willekeurigTussen = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));

function gewogenKeuze(lijst, gewicht, rng) {
  const gewichten = lijst.map(gewicht);
  let r = rng() * gewichten.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lijst.length; i++) {
    r -= gewichten[i];
    if (r <= 0) return lijst[i];
  }
  return lijst[lijst.length - 1];
}

// Boek een bedrag op het totaal van het hele leven én op het bonnetje van deze fase.
function boek(state, veld, bedrag) {
  state.totaal[veld] += bedrag;
  const log = faseLog(state);
  if (log) log[veld] += bedrag;
}

// Geld erbij (+) of eraf (−) in de portemonnee, met leeftijd (nodig voor "Wat als…?").
function kas(state, leeftijd, bedrag, soort) {
  state.portemonnee += bedrag;
  state.kasboek.push({ leeftijd, bedrag, soort });
}

function wijzigGezondheid(state, delta) {
  const oud = state.gezondheid;
  state.gezondheid = Math.max(0, Math.min(C.GEZONDHEID_MAX, oud + delta));
  return state.gezondheid - oud;
}

// Game over? Zet de status en sluit het logboek van de fase af.
function controleer(state) {
  if (state.status !== 'bezig') return state.status;
  if (state.gezondheid <= 0) state.status = 'gezondheid';
  else if (state.portemonnee < C.SCHULDGRENS) state.status = 'schulden';
  if (state.status !== 'bezig') {
    state.eindLeeftijd = state.leeftijd;
    const log = faseLog(state);
    if (log) {
      log.gezondheidEind = state.gezondheid;
      log.portemonneeEind = state.portemonnee;
    }
  }
  return state.status;
}

export const isGameOver = (state) => state.status === 'gezondheid' || state.status === 'schulden';

/* ---------------------------------------------------------------------------
 * Premie & zorgtoeslag
 * ------------------------------------------------------------------------- */

// Zorgtoeslag per maand bij een bepaald jaarinkomen (vereenvoudigd, zie config.js).
export function zorgtoeslagPerMaand(inkomen) {
  const { maxPerMaand, volledigTotInkomen, grensInkomen } = C.ZORGTOESLAG;
  if (inkomen >= grensInkomen) return 0;
  if (inkomen <= volledigTotInkomen) return maxPerMaand;
  return Math.round((maxPerMaand * (grensInkomen - inkomen)) / (grensInkomen - volledigTotInkomen));
}

// Alles wat de verzekeringskeuze kost, per maand. Wordt live getoond op het keuzescherm.
export function premieOverzicht(state, keuze = state.keuze) {
  const erAfgeschaft = state.vlaggen.eigenRisicoAfgeschaft;
  const vrijwillig = erAfgeschaft ? 0 : keuze.vrijwillig;
  const korting = C.VRIJWILLIG_KORTING_PER_MAAND[vrijwillig];
  const basis = C.PREMIE_BASIS_PER_MAAND - korting + state.premieExtra.basis;
  const aanvullend = keuze.aanvullend ? C.AANVULLEND.premiePerMaand + state.premieExtra.aanvullend : 0;
  const toeslagRecht = zorgtoeslagPerMaand(inkomenIn(state));
  const toeslag = keuze.toeslag ? toeslagRecht : 0;
  return {
    vrijwillig,
    korting,
    basis,
    aanvullend,
    premie: basis + aanvullend,
    toeslagRecht,
    toeslag,
    netto: basis + aanvullend - toeslag,
    maxEigenRisico: erAfgeschaft ? 0 : C.EIGEN_RISICO_VERPLICHT + vrijwillig,
    erAfgeschaft,
  };
}

/* ---------------------------------------------------------------------------
 * Zorgkosten: wie betaalt wat?
 * ------------------------------------------------------------------------- */

/*
 * Verwerk één zorgpost (bijv. "Heupoperatie €12.000") in een bepaald levensjaar.
 *  - huisarts / verloskundige: verzekeraar betaalt alles, geen eigen risico
 *  - basis: speler betaalt tot het eigen risico van DAT JAAR op is
 *    (verplicht + vrijwillig), daarboven betaalt de verzekeraar
 *  - tandarts / fysio: alleen vergoed met aanvullende verzekering, tot het
 *    maximum per jaar; de rest betaalt de speler zelf
 *  - zelf: altijd zelf betalen (bijv. een bril, eigen bijdrage)
 */
export function betaalZorgpost(state, post, leeftijd, bron = 'gebeurtenis') {
  const type = C.ZORGTYPES[post.type];
  const jaar = (state.jaren[leeftijd] ??= { eigenRisico: 0, aanvullend: 0 });
  const polis = state.polis;

  const r = {
    wat: post.wat,
    kosten: post.kosten,
    type: post.type,
    eigenRisico: 0,      // deel dat van het eigen risico af ging
    zelf: 0,             // deel dat de speler zelf betaalde (zonder eigen risico)
    verzekeraar: 0,      // deel van de basisverzekering
    aanvullend: 0,       // deel van de aanvullende verzekering
    budgetpolis: 0,      // extra eigen deel door de budgetpolis
    eigenRisicoRuimte: Math.max(0, polis.maxEigenRisico - jaar.eigenRisico),
    aanvullendRuimte: polis.aanvullend ? Math.max(0, C.AANVULLEND.maxVergoedingPerJaar - jaar.aanvullend) : 0,
    zonderDekking: post.dekking === 'geen',
  };

  if (type.vergoeding === 'basis') {
    if (type.eigenRisico) {
      r.eigenRisico = Math.min(post.kosten, r.eigenRisicoRuimte);
      jaar.eigenRisico += r.eigenRisico;
    }
    r.verzekeraar = post.kosten - r.eigenRisico;
    if (polis.budgetpolis && type.eigenRisico && post.kosten >= C.BUDGETPOLIS.vanafKosten) {
      r.budgetpolis = Math.min(C.BUDGETPOLIS.maxEigenDeel, Math.round(r.verzekeraar * C.BUDGETPOLIS.eigenDeel));
      r.verzekeraar -= r.budgetpolis;
      r.zelf += r.budgetpolis;
    }
  } else if (type.vergoeding === 'aanvullend') {
    if (polis.aanvullend && !r.zonderDekking) {
      r.aanvullend = Math.min(post.kosten, r.aanvullendRuimte);
      jaar.aanvullend += r.aanvullend;
    }
    r.zelf = post.kosten - r.aanvullend;
  } else {
    r.zelf = post.kosten;
  }

  r.speler = r.eigenRisico + r.zelf;
  r.verzekeraarTotaal = r.verzekeraar + r.aanvullend;

  boek(state, 'zorgkosten', post.kosten);
  boek(state, 'eigenRisico', r.eigenRisico);
  boek(state, 'zelf', r.zelf);
  boek(state, 'verzekeraar', r.verzekeraarTotaal);
  if (r.eigenRisico) kas(state, leeftijd, -r.eigenRisico, 'eigenRisico');
  if (r.zelf) kas(state, leeftijd, -r.zelf, 'zelf');
  state.zorglog.push({ ...r, leeftijd, faseIndex: state.faseIndex, bron });
  return r;
}

// Tel meerdere uitkomsten van betaalZorgpost op tot één regel (handig voor meerdere jaren).
function telOp(resultaten, basis = {}) {
  const som = { kosten: 0, eigenRisico: 0, zelf: 0, verzekeraar: 0, aanvullend: 0, budgetpolis: 0, speler: 0, verzekeraarTotaal: 0, ...basis };
  for (const r of resultaten) {
    for (const k of ['kosten', 'eigenRisico', 'zelf', 'verzekeraar', 'aanvullend', 'budgetpolis', 'speler', 'verzekeraarTotaal']) som[k] += r[k];
  }
  return som;
}

/* ---------------------------------------------------------------------------
 * Chronische ziekte (Daan)
 * ------------------------------------------------------------------------- */

// Begint de chronische ziekte van het karakter in deze fase? Dan eerst de diagnose tonen.
export function diagnoseDezeFase(state) {
  const c = state.karakter.chronisch;
  const fase = huidigeFase(state);
  if (!c || state.status !== 'bezig') return null;
  if (c.vanafLeeftijd < fase.van || c.vanafLeeftijd >= fase.tot) return null;
  if (state.chronisch.some((x) => x.id === c.id)) return null;
  return c;
}

export function activeerChronisch(state, c) {
  state.chronisch.push({
    id: c.id,
    naam: c.naam,
    omschrijving: c.omschrijving,
    kosten: c.kostenPerJaar,
    type: c.type,
    vanafLeeftijd: c.vanafLeeftijd,
    startLeeftijd: c.vanafLeeftijd,
    gezondheidPerFase: c.gezondheidPerFase || 0,
  });
  state.leeftijd = c.vanafLeeftijd;
  const gezondheid = wijzigGezondheid(state, c.gezondheidBijDiagnose || 0);
  controleer(state);
  return { gezondheid };
}

/* ---------------------------------------------------------------------------
 * Fase starten: inkomen, premie, zorgtoeslag en vaste zorgkosten
 * ------------------------------------------------------------------------- */

export function startFase(state, keuze) {
  const fase = huidigeFase(state);
  const jaren = jarenIn(fase);
  const p = premieOverzicht(state, keuze);
  state.keuze = { ...keuze, vrijwillig: p.vrijwillig, toeslag: keuze.toeslag && p.toeslagRecht > 0 };
  // Wat er deze hele fase geldt. Keuzes uit dilemma's tellen pas vanaf de volgende fase.
  state.polis = {
    maxEigenRisico: p.maxEigenRisico,
    aanvullend: state.keuze.aanvullend,
    budgetpolis: state.vlaggen.budgetpolis,
  };

  const inkomen = inkomenIn(state);
  const overPerJaar = Math.round(inkomen * (1 - fase.vasteLasten));
  const log = {
    index: state.faseIndex,
    van: fase.van,
    tot: fase.tot,
    jaren,
    keuze: { ...state.keuze },
    premie: p,
    inkomen,
    vasteLastenPerJaar: inkomen - overPerJaar,
    overPerJaar,
    over: 0,
    ...leegTotaal(),
    chronisch: [],
    gezondheidStart: state.gezondheid,
    portemonneeStart: state.portemonnee,
    gezondheidEind: null,
    portemonneeEind: null,
    veroudering: 0,
    ziekte: 0,
  };
  state.fasen.push(log);

  // Per jaar: wat je overhoudt van je inkomen, min de premie, plus eventueel zorgtoeslag.
  //   betaaldePremie += (maandpremie − zorgtoeslag) × 12 × aantal jaren in de fase
  for (let leeftijd = fase.van; leeftijd < fase.tot; leeftijd++) {
    kas(state, leeftijd, overPerJaar, 'inkomen');
    log.over += overPerJaar;
    kas(state, leeftijd, -p.basis * 12, 'premie');
    boek(state, 'premieBasis', p.basis * 12);
    if (p.aanvullend) {
      kas(state, leeftijd, -p.aanvullend * 12, 'premie');
      boek(state, 'premieAanvullend', p.aanvullend * 12);
    }
    if (state.keuze.toeslag) {
      kas(state, leeftijd, p.toeslag * 12, 'toeslag');
      boek(state, 'toeslag', p.toeslag * 12);
    }
  }

  // Vaste (chronische) zorgkosten: elk jaar opnieuw, dus ook elk jaar eigen risico.
  for (const c of state.chronisch) {
    const resultaten = [];
    for (let leeftijd = Math.max(fase.van, c.vanafLeeftijd); leeftijd < fase.tot; leeftijd++) {
      resultaten.push(betaalZorgpost(state, { wat: c.omschrijving, kosten: c.kosten, type: c.type }, leeftijd, 'chronisch'));
    }
    if (resultaten.length) {
      log.chronisch.push(telOp(resultaten, { naam: c.naam, wat: c.omschrijving, perJaar: c.kosten, jaren: resultaten.length }));
    }
  }

  state.leeftijd = fase.van;
  controleer(state);
  return log;
}

/* ---------------------------------------------------------------------------
 * Gebeurteniskaarten
 * ------------------------------------------------------------------------- */

const totaleKosten = (g) => g.posten.reduce((som, p) => som + p.kosten, 0);

// Kansgewicht: dure zorg vaker op oudere leeftijd en bij een hoge risicofactor.
export function kansGewicht(g, fase, karakter) {
  if (g.soort === 'gezond') return g.gewicht / (fase.leeftijdsRisico * karakter.risicofactor);
  if (g.soort !== 'neutraal' && totaleKosten(g) >= C.DURE_ZORG_VANAF) {
    return g.gewicht * fase.leeftijdsRisico * karakter.risicofactor;
  }
  return g.gewicht;
}

// Trek de gebeurtenissen voor deze fase, elk in een ander levensjaar (op volgorde van leeftijd).
export function trekGebeurtenissen(state, aantal = 2) {
  const fase = huidigeFase(state);
  const rng = state.rng;
  const gekozen = [];

  // Eerst de gevolgen van eerdere keuzes (bijv. zorg mijden -> rughernia).
  while (state.wachtend.length && gekozen.length < aantal) {
    const g = vindGebeurtenis(state.wachtend.shift());
    if (g) gekozen.push(g);
  }

  while (gekozen.length < aantal) {
    const kandidaten = GEBEURTENISSEN.filter(
      (g) =>
        !g.alleenAlsGevolg &&
        pastIn(g, fase) &&
        !gekozen.includes(g) &&
        (g.herhaalbaar || !state.gebruikteGebeurtenissen.includes(g.id)),
    );
    if (!kandidaten.length) break;
    gekozen.push(gewogenKeuze(kandidaten, (g) => kansGewicht(g, fase, state.karakter), rng));
  }

  const bezet = new Set();
  const getrokken = gekozen.map((g) => {
    const [lo, hi] = bereik(g, fase);
    let leeftijd = willekeurigTussen(lo, hi, rng);
    for (let poging = 0; poging < 10 && bezet.has(leeftijd); poging++) leeftijd = willekeurigTussen(lo, hi, rng);
    bezet.add(leeftijd);
    if (!g.herhaalbaar) state.gebruikteGebeurtenissen.push(g.id);
    return { gebeurtenis: g, leeftijd };
  });
  return getrokken.sort((a, b) => a.leeftijd - b.leeftijd);
}

export function verwerkGebeurtenis(state, g, leeftijd) {
  const fase = huidigeFase(state);
  state.leeftijd = leeftijd;
  let posten;

  if (g.terugkerend) {
    // Kosten komen elk jaar terug: rest van deze fase nu, de volgende fasen via state.chronisch.
    const jaren = fase.tot - leeftijd;
    posten = g.posten.map((post) => {
      const resultaten = [];
      // Alleen het eerste jaar telt als "gebeurtenis", de jaren erna zijn vaste (chronische) zorg.
      for (let l = leeftijd; l < fase.tot; l++) {
        resultaten.push(betaalZorgpost(state, post, l, l === leeftijd ? 'gebeurtenis' : 'chronisch'));
      }
      state.chronisch.push({
        id: g.id,
        naam: g.titel,
        omschrijving: post.wat,
        kosten: post.kosten,
        type: post.type,
        vanafLeeftijd: fase.tot,
        startLeeftijd: leeftijd,
        gezondheidPerFase: g.gezondheidPerFase || 0,
      });
      return telOp(resultaten, { wat: post.wat, type: post.type, perJaar: post.kosten, jaren });
    });
  } else {
    posten = g.posten.map((post) => betaalZorgpost(state, post, leeftijd, 'gebeurtenis'));
  }

  const gezondheid = wijzigGezondheid(state, g.gezondheid || 0);
  controleer(state);
  return { gebeurtenis: g, leeftijd, posten, gezondheid, ...telOp(posten) };
}

/* ---------------------------------------------------------------------------
 * Dilemma's
 * ------------------------------------------------------------------------- */

export function dilemmaContext(state, leeftijd) {
  const gebruikt = state.jaren[leeftijd]?.eigenRisico || 0;
  return {
    state,
    leeftijd,
    eigenRisicoRuimte: Math.max(0, (state.polis?.maxEigenRisico ?? C.EIGEN_RISICO_VERPLICHT) - gebruikt),
    toeslagPerJaar: zorgtoeslagPerMaand(inkomenIn(state)) * 12,
  };
}

// Kies een dilemma dat past bij de leeftijd en nog niet geweest is in dit potje.
export function trekDilemma(state) {
  const fase = huidigeFase(state);
  const rng = state.rng;
  const basisCtx = dilemmaContext(state, fase.van);
  const kandidaten = DILEMMAS.filter(
    (d) =>
      !state.gebruikteDilemmas.includes(d.id) &&
      pastIn(d, fase) &&
      (!d.voorwaarde || d.voorwaarde(state, basisCtx)),
  );
  if (!kandidaten.length) return null;

  const dilemma = kandidaten[Math.floor(rng() * kandidaten.length)];
  state.gebruikteDilemmas.push(dilemma.id);
  const [lo, hi] = bereik(dilemma, fase);
  const leeftijd = willekeurigTussen(lo, hi, rng);
  const ctx = dilemmaContext(state, leeftijd);
  const situatie = typeof dilemma.situatie === 'function' ? dilemma.situatie(ctx) : dilemma.situatie;
  return { dilemma, leeftijd, ctx, situatie };
}

export function verwerkDilemma(state, dilemma, keuzeIndex, leeftijd, ctx = dilemmaContext(state, leeftijd)) {
  const keuze = dilemma.keuzes[keuzeIndex];
  const g = typeof keuze.gevolg === 'function' ? keuze.gevolg(ctx) : keuze.gevolg;
  state.leeftijd = leeftijd;
  const res = { dilemma, keuze, keuzeIndex, leeftijd, geld: 0, toeslag: 0, gezondheid: 0, posten: [] };

  if (g.geld) {
    kas(state, leeftijd, g.geld, 'overig');
    boek(state, 'overig', g.geld);
    res.geld = g.geld;
  }
  if (g.toeslag) {
    kas(state, leeftijd, g.toeslag, 'toeslag');
    boek(state, 'toeslag', g.toeslag);
    res.toeslag = g.toeslag;
  }
  for (const post of g.zorg || []) res.posten.push(betaalZorgpost(state, post, leeftijd, 'dilemma'));
  if (g.gezondheid) res.gezondheid = wijzigGezondheid(state, g.gezondheid);
  if (g.premieBasis) state.premieExtra.basis += g.premieBasis;
  if (g.premieAanvullend) state.premieExtra.aanvullend += g.premieAanvullend;
  if (g.vlaggen) Object.assign(state.vlaggen, g.vlaggen);
  if (g.later) state.wachtend.push(g.later);
  res.premieBasis = g.premieBasis || 0;
  res.premieAanvullend = g.premieAanvullend || 0;

  state.keuzes.push({ dilemma: dilemma.id, keuze: keuzeIndex, leeftijd });
  Object.assign(res, telOp(res.posten));
  controleer(state);
  return res;
}

/* ---------------------------------------------------------------------------
 * Fase afsluiten
 * ------------------------------------------------------------------------- */

export function eindigFase(state) {
  const fase = huidigeFase(state);
  const log = faseLog(state);

  log.veroudering = wijzigGezondheid(state, fase.veroudering);
  const ziekte = state.chronisch
    .filter((c) => c.startLeeftijd < fase.tot)
    .reduce((som, c) => som + c.gezondheidPerFase, 0);
  log.ziekte = wijzigGezondheid(state, ziekte);

  state.leeftijd = fase.tot;
  log.gezondheidEind = state.gezondheid;
  log.portemonneeEind = state.portemonnee;
  controleer(state);

  if (state.status === 'bezig') {
    if (state.faseIndex >= C.FASEN.length - 1) {
      state.status = 'klaar';
      state.eindLeeftijd = fase.tot;
    } else {
      state.faseIndex++;
    }
  }
  return log;
}

/* ---------------------------------------------------------------------------
 * De Rekening
 * ------------------------------------------------------------------------- */

// Wat je betaalde en wat je zorg kostte, voor het hele leven of voor één fase.
export function rekening(bron) {
  const t = bron.totaal || bron; // een state of een fase-log
  const premie = t.premieBasis + t.premieAanvullend;
  const eigenEnZelf = t.eigenRisico + t.zelf;
  const betaald = premie - t.toeslag + eigenEnZelf;
  return {
    premieBasis: t.premieBasis,
    premieAanvullend: t.premieAanvullend,
    premie,
    toeslag: t.toeslag,
    eigenRisico: t.eigenRisico,
    zelf: t.zelf,
    eigenEnZelf,
    betaald,
    zorgkosten: t.zorgkosten,
    verzekeraar: t.verzekeraar,
    overig: t.overig,
    verschil: betaald - t.zorgkosten, // > 0: jij betaalde mee voor anderen; < 0: anderen betaalden voor jou
  };
}

// Levensscore: gezondheid telt zwaar, geld telt mee.
export function levensscore(state) {
  return Math.max(0, Math.round(state.gezondheid * 10 + Math.max(0, state.portemonnee) / 200));
}

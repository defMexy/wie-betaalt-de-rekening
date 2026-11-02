/*
 * "Wat als…?" – hetzelfde leven (dezelfde zorg, hetzelfde inkomen) in twee andere werelden.
 *
 *  NU:        de echte uitkomst van het potje.
 *  IEDER VOOR ZICH: geen verzekeringsplicht en geen solidariteit.
 *     - verzekerd: premie = basispremie × leeftijdsfactor × risicofactor (× extra als je chronisch ziek bent),
 *                  eigen risico zoals nu, tandarts/fysio zelf, geen zorgtoeslag
 *     - onverzekerd: je betaalt alle zorg zelf
 *  OVERHEID:  alle zorg gratis, betaald uit belasting: een percentage van je inkomen boven een vrije voet.
 *
 * Alles wordt per levensjaar berekend, zodat we kunnen zien op welke leeftijd
 * je in een andere wereld failliet was gegaan.
 */

import * as C from './config.js';

const ZORG_SOORTEN = ['premie', 'toeslag', 'eigenRisico', 'zelf'];

function optellen(map, leeftijd, bedrag) {
  map.set(leeftijd, (map.get(leeftijd) || 0) + bedrag);
}

const som = (map) => [...map.values()].reduce((a, b) => a + b, 0);

/*
 * Volg de portemonnee jaar voor jaar, maar met de zorgbetalingen van een andere wereld.
 * Geeft de portemonnee aan het eind en de leeftijd waarop je onder de schuldgrens kwam.
 */
function volgPortemonnee(state, werkelijk, ander) {
  const leeftijden = [...new Set(state.kasboek.map((k) => k.leeftijd))].sort((a, b) => a - b);
  let echt = state.karakter.startgeld;
  let verschil = 0;
  let failliet = null;
  for (const leeftijd of leeftijden) {
    for (const k of state.kasboek) if (k.leeftijd === leeftijd) echt += k.bedrag;
    verschil += (werkelijk.get(leeftijd) || 0) - (ander.get(leeftijd) || 0);
    if (failliet === null && echt + verschil < C.SCHULDGRENS) failliet = leeftijd;
  }
  return { portemonnee: state.portemonnee + verschil, failliet };
}

export function berekenWerelden(state) {
  const k = state.karakter;
  const fasen = state.fasen;

  // Wat de speler echt aan zorg betaalde, per leeftijd (premie − toeslag + eigen risico + zelf).
  const werkelijk = new Map();
  for (const regel of state.kasboek) {
    if (ZORG_SOORTEN.includes(regel.soort)) optellen(werkelijk, regel.leeftijd, -regel.bedrag);
  }

  /* --- Ieder voor zich ------------------------------------------------------ */
  const iv = C.WAT_ALS.iederVoorZich;
  const ivVerzekerd = new Map();
  const ivOnverzekerd = new Map();
  const premiePerFase = [];

  for (const log of fasen) {
    // Chronisch ziek vanaf het begin van deze fase? Dan rekent de verzekeraar je als "hoog risico".
    const chronisch = state.chronisch.some((c) => c.startLeeftijd <= log.van);
    const maand = Math.round(
      C.PREMIE_BASIS_PER_MAAND * iv.leeftijdsFactor[log.index] * k.risicofactor * (chronisch ? iv.chronischFactor : 1),
    );
    premiePerFase.push({ van: log.van, tot: log.tot, maand, chronisch });
    for (let leeftijd = log.van; leeftijd < log.tot; leeftijd++) optellen(ivVerzekerd, leeftijd, maand * 12);
  }

  // Zorg per leeftijd: eigen risico over basiszorg, en tandarts/fysio/eigen bijdragen zelf.
  const basisPerJaar = new Map();
  for (const z of state.zorglog) {
    optellen(ivOnverzekerd, z.leeftijd, z.kosten);
    const type = C.ZORGTYPES[z.type];
    if (type.vergoeding === 'basis' && type.eigenRisico) optellen(basisPerJaar, z.leeftijd, z.kosten);
    else if (type.vergoeding !== 'basis') optellen(ivVerzekerd, z.leeftijd, z.kosten);
  }
  for (const [leeftijd, kosten] of basisPerJaar) optellen(ivVerzekerd, leeftijd, Math.min(kosten, iv.eigenRisico));

  /* --- Overheid bepaalt alles ----------------------------------------------- */
  const ov = C.WAT_ALS.overheid;
  const overheid = new Map();
  for (const log of fasen) {
    for (let leeftijd = log.van; leeftijd < log.tot; leeftijd++) {
      optellen(overheid, leeftijd, Math.round(Math.max(0, log.inkomen - ov.vrijeVoet) * ov.belastingPercentage));
    }
  }
  // Wat nergens onder valt (bril, eigen bijdrage) betaal je ook in deze wereld zelf.
  for (const z of state.zorglog) if (z.type === 'zelf') optellen(overheid, z.leeftijd, z.kosten);
  const behandelingen = state.zorglog.filter(
    (z) => z.bron !== 'chronisch' && C.ZORGTYPES[z.type].eigenRisico && z.kosten >= ov.behandelingVanaf,
  ).length;

  const nu = {
    totaal: som(werkelijk),
    portemonnee: state.portemonnee,
    failliet: state.status === 'schulden' ? state.eindLeeftijd : null,
  };

  return {
    zorgkosten: state.totaal.zorgkosten,
    nu,
    ieder: {
      verzekerd: { totaal: som(ivVerzekerd), ...volgPortemonnee(state, werkelijk, ivVerzekerd) },
      onverzekerd: { totaal: som(ivOnverzekerd), ...volgPortemonnee(state, werkelijk, ivOnverzekerd) },
      premiePerFase,
    },
    overheid: {
      totaal: som(overheid),
      ...volgPortemonnee(state, werkelijk, overheid),
      belastingPercentage: ov.belastingPercentage,
      wachtMaanden: behandelingen * ov.wachtMaandenPerBehandeling,
      behandelingen,
    },
  };
}

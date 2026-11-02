/*
 * localStorage – alleen voor instellingen, highscores en stemmen op dit apparaat.
 * Altijd in try/catch: in een privévenster of met geblokkeerde cookies kan het mislukken.
 * Het spel werkt dan gewoon, alleen zonder opslaan.
 */

const PREFIX = 'wbdr:';

export function lees(sleutel, standaard) {
  try {
    const ruw = window.localStorage.getItem(PREFIX + sleutel);
    return ruw === null ? standaard : JSON.parse(ruw);
  } catch {
    return standaard;
  }
}

export function schrijf(sleutel, waarde) {
  try {
    window.localStorage.setItem(PREFIX + sleutel, JSON.stringify(waarde));
    return true;
  } catch {
    return false;
  }
}

/* --- Instellingen ---------------------------------------------------------- */

export const instellingen = () => ({ geluid: false, ...lees('instellingen', {}) });

export function zetInstelling(naam, waarde) {
  schrijf('instellingen', { ...instellingen(), [naam]: waarde });
}

/* --- Stemmen (reflectievragen) --------------------------------------------- */

// Geeft de nieuwe tellingen terug, bijv. { ja: 4, nee: 1, twijfel: 2 }.
export function stem(vraag, optie, opties) {
  const tellingen = stemmen(vraag, opties);
  tellingen[optie] = (tellingen[optie] || 0) + 1;
  schrijf(`stemmen:${vraag}`, tellingen);
  return tellingen;
}

export function stemmen(vraag, opties = []) {
  const leeg = Object.fromEntries(opties.map((o) => [o, 0]));
  return { ...leeg, ...lees(`stemmen:${vraag}`, {}) };
}

/* --- Highscore per karakter ------------------------------------------------ */

export const highscores = () => lees('highscore', {});

// Slaat de score op als die hoger is. Geeft { record, nieuw } terug.
export function bewaarScore(karakterId, score) {
  const alle = highscores();
  const oud = alle[karakterId] ?? null;
  const nieuw = oud === null || score > oud;
  if (nieuw) schrijf('highscore', { ...alle, [karakterId]: score });
  return { record: nieuw ? score : oud, vorige: oud, nieuw };
}

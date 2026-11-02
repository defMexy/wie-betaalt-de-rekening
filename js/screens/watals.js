/*
 * "Wat als…?" – hetzelfde leven in drie werelden, naast elkaar (op mobiel onder elkaar).
 * De berekeningen staan in js/werelden.js.
 */

import { ga } from '../router.js';
import { store } from '../state.js';
import { berekenWerelden } from '../werelden.js';
import { WAT_ALS } from '../config.js';
import { stem, stemmen } from '../storage.js';
import { euro, esc, bonRegel } from '../ui.js';
import { stemUitslag } from './rekening.js';

const OPTIES_WERELD = [
  { id: 'nu', label: '🤝 Nederland nu' },
  { id: 'ieder', label: '🏝️ Ieder voor zich' },
  { id: 'overheid', label: '🏛️ De overheid bepaalt alles' },
];

function vergelijk(bedrag, nu) {
  const verschil = bedrag - nu;
  if (Math.abs(verschil) < 500) return '<span class="chip">ongeveer even duur als nu</span>';
  return verschil < 0
    ? `<span class="chip chip--plus">${euro(-verschil)} goedkoper dan nu</span>`
    : `<span class="chip chip--min">${euro(verschil)} duurder dan nu</span>`;
}

function status(failliet, eind) {
  return failliet !== null
    ? `<p class="wereld__status wereld__status--slecht">💸 Failliet op je ${failliet}e</p>`
    : `<p class="wereld__status">✅ Je redt het tot je ${eind}e</p>`;
}

const balk = (bedrag, max) =>
  `<span class="mini-spoor" aria-hidden="true"><span class="mini-balk" style="width: ${Math.max(2, (bedrag / max) * 100)}%"></span></span>`;

export function render(app) {
  const s = store.spel;
  if (!s) return ga('start');
  const w = berekenWerelden(s);
  const k = s.karakter;
  const eind = s.eindLeeftijd ?? s.leeftijd;
  const iv = w.ieder;
  const ov = w.overheid;
  const max = Math.max(w.nu.totaal, iv.verzekerd.totaal, iv.onverzekerd.totaal, ov.totaal, 1);

  const geenPremie = { maand: 0, van: 18 };
  const eerstePremie = iv.premiePerFase[0] || geenPremie;
  const laatstePremie = iv.premiePerFase[iv.premiePerFase.length - 1] || geenPremie;
  const ziek = iv.premiePerFase.find((p) => p.chronisch);

  const conclusieIeder = iv.verzekerd.failliet !== null
    ? `Voor ${esc(k.naam)} was deze wereld <strong>onbetaalbaar</strong>.`
    : iv.verzekerd.totaal < w.nu.totaal
      ? `Voor ${esc(k.naam)} was deze wereld <strong>goedkoper</strong>, zolang alles goed ging.`
      : `Ook voor ${esc(k.naam)} was deze wereld <strong>duurder</strong>: geen zorgtoeslag, en als je ouder wordt, stijgt je premie flink.`;

  const conclusieOverheid = ov.totaal < w.nu.totaal
    ? `Voor ${esc(k.naam)} was deze wereld <strong>goedkoper</strong>. Wie veel verdient, betaalt hier meer.`
    : `Voor ${esc(k.naam)} was deze wereld <strong>duurder</strong>: wie meer verdient, betaalt meer belasting.`;

  app.innerHTML = `
    <section class="scherm watals">
      <p class="label">${k.avatar} Hetzelfde leven van ${esc(k.naam)}, dezelfde zorg</p>
      <h1 data-focus>Wat als…?</h1>
      <p class="intro">Jouw zorg kostte in totaal <strong class="mono">${euro(w.zorgkosten)}</strong>. Wie had dat betaald in een andere wereld?</p>

      <div class="werelden">
        <article class="wereld wereld--nu">
          <h2><span aria-hidden="true">🤝</span> Nederland nu</h2>
          <p class="wereld__uitleg">Iedereen moet verzekerd zijn. Iedereen betaalt dezelfde premie, ziek of gezond. Wie weinig verdient, krijgt zorgtoeslag.</p>
          <div class="bon bon--mini">
            ${bonRegel('Jij betaalde voor zorg', w.nu.totaal, { klasse: 'bon-regel--totaal' })}
            ${balk(w.nu.totaal, max)}
            ${bonRegel(`Portemonnee op ${eind}`, w.nu.portemonnee)}
          </div>
          ${status(w.nu.failliet, eind)}
          <ul class="plusmin">
            <li class="plus">Iedereen is verzekerd, ook als je ziek bent.</li>
            <li class="plus">Zieke mensen betalen niet meer premie.</li>
            <li class="min">Gezonde mensen betalen mee voor zieken.</li>
            <li class="min">Het eigen risico kan leiden tot zorg mijden.</li>
          </ul>
        </article>

        <article class="wereld wereld--ieder">
          <h2><span aria-hidden="true">🏝️</span> Ieder voor zich</h2>
          <p class="wereld__uitleg">Geen verzekeringsplicht en geen zorgtoeslag. Je premie hangt af van je leeftijd en je gezondheid. Of je verzekert je niet, en betaalt alles zelf.</p>
          <div class="bon bon--mini">
            ${bonRegel('Verzekerd met risicopremie', iv.verzekerd.totaal, { klasse: 'bon-regel--totaal', sub: `premie ${euro(eerstePremie.maand)} p/m op ${eerstePremie.van} jaar → ${euro(laatstePremie.maand)} p/m op ${laatstePremie.van} jaar${ziek ? ` (chronisch ziek: ×${WAT_ALS.iederVoorZich.chronischFactor})` : ''}` })}
            ${balk(iv.verzekerd.totaal, max)}
            ${bonRegel(`Portemonnee op ${eind}`, iv.verzekerd.portemonnee)}
          </div>
          ${status(iv.verzekerd.failliet, eind)}
          <div class="bon bon--mini">
            ${bonRegel('Niet verzekerd: alles zelf', iv.onverzekerd.totaal, { klasse: 'bon-regel--totaal', sub: 'alleen goedkoop als je geluk hebt' })}
            ${balk(iv.onverzekerd.totaal, max)}
            ${bonRegel(`Portemonnee op ${eind}`, iv.onverzekerd.portemonnee)}
          </div>
          ${status(iv.onverzekerd.failliet, eind)}
          <p class="wereld__vergelijk">${vergelijk(iv.verzekerd.totaal, w.nu.totaal)}</p>
          <p class="wereld__conclusie">${conclusieIeder}</p>
          <aside class="profiteert">
            <h3>📉 De neerwaartse spiraal</h3>
            <p>Gezonde mensen stappen uit, omdat ze weinig zorg nodig hebben. Dan blijven vooral zieke mensen over in de pot. De premie stijgt, nog meer mensen stappen uit, en de premie stijgt weer…</p>
          </aside>
        </article>

        <article class="wereld wereld--overheid">
          <h2><span aria-hidden="true">🏛️</span> De overheid bepaalt alles</h2>
          <p class="wereld__uitleg">Alle zorg is gratis: geen premie en geen eigen risico. Je betaalt wel ${Math.round(ov.belastingPercentage * 100)}% extra belasting over je inkomen boven ${euro(WAT_ALS.overheid.vrijeVoet)}.</p>
          <div class="bon bon--mini">
            ${bonRegel('Extra belasting voor zorg', ov.totaal, { klasse: 'bon-regel--totaal', sub: 'premie €0 · eigen risico €0' })}
            ${balk(ov.totaal, max)}
            ${bonRegel(`Portemonnee op ${eind}`, ov.portemonnee)}
          </div>
          ${status(ov.failliet, eind)}
          <p class="wereld__vergelijk">${vergelijk(ov.totaal, w.nu.totaal)}</p>
          <p class="wereld__conclusie">${conclusieOverheid}</p>
          <ul class="plusmin">
            <li class="plus">Niemand hoeft zorg te mijden om geld.</li>
            <li class="min">Langere wachtlijsten: jij wachtte ongeveer <strong>${ov.wachtMaanden} maanden</strong> extra${ov.behandelingen ? ` op ${ov.behandelingen} ${ov.behandelingen === 1 ? 'behandeling' : 'behandelingen'}` : ''}.</li>
            <li class="min">Minder keuze: de overheid bepaalt welk ziekenhuis en welke behandeling.</li>
            <li class="min">Als zorg gratis is, gebruiken mensen meer zorg. Dan moet de belasting omhoog.</li>
          </ul>
        </article>
      </div>

      <div class="kaart kaart--accent slotsom">
        <p class="slotsom__tekst">Er is geen perfecte oplossing. Elke keuze heeft winnaars en verliezers.</p>
      </div>

      <div class="kaart reflectie">
        <h2>Welke wereld kies jij?</h2>
        <div class="stemknoppen stemknoppen--drie">
          ${OPTIES_WERELD.map((o) => `<button type="button" class="knop knop--keuze" data-stem="${o.id}">${o.label}</button>`).join('')}
        </div>
        <div id="stemuitslag" aria-live="polite"></div>
      </div>

      <div class="knoppen knoppen--midden">
        <button type="button" class="knop" data-ga="rekening">← Terug naar De Rekening</button>
        <button type="button" class="knop knop--licht" data-ga="karakterkeuze">Speel als ander karakter</button>
        <button type="button" class="knop knop--licht" data-ga="bronnen">Bronnen</button>
      </div>
    </section>
  `;

  const uitslag = app.querySelector('#stemuitslag');
  const knoppen = app.querySelectorAll('[data-stem]');
  const ids = OPTIES_WERELD.map((o) => o.id);
  const toon = (tellingen, gekozen) => {
    uitslag.innerHTML = stemUitslag(tellingen, OPTIES_WERELD, gekozen);
    knoppen.forEach((knop) => {
      knop.disabled = true;
      knop.classList.toggle('is-gekozen', knop.dataset.stem === gekozen);
    });
  };
  if (s.stemWereld) toon(stemmen('wereld', ids), s.stemWereld);
  knoppen.forEach((knop) =>
    knop.addEventListener('click', () => {
      s.stemWereld = knop.dataset.stem;
      toon(stem('wereld', s.stemWereld, ids), s.stemWereld);
    }),
  );
}

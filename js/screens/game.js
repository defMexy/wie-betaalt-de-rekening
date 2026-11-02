/*
 * ============================================================================
 *  SPELSCHERM – de levensfasen
 * ============================================================================
 *  Per fase:  (diagnose) → verzekering → gebeurtenis 1 → gebeurtenis 2 → dilemma → bonnetje
 *  Bovenaan staat een vaste balk met leeftijd, portemonnee, gezondheid en
 *  "totaal betaald aan zorg". Alle berekeningen gebeuren in state.js; dit
 *  bestand laat alleen zien wat er gebeurt.
 *
 *  De voortgang binnen een fase staat in "flow". Zo kun je even naar het
 *  startscherm en daarna verder spelen zonder dat iets dubbel wordt berekend.
 * ============================================================================
 */

import { ga, focusOpScherm } from '../router.js';
import * as S from '../state.js';
import * as C from '../config.js';
import { euro, esc, telOp, toonVerschil, melding, bonRegel, wacht, minderBeweging } from '../ui.js';
import { speelKassa } from '../sound.js';

let s = null;       // het potje
let el = {};        // vaste onderdelen van het scherm
let vorige = null;  // vorige meterwaarden, voor de animaties
let flow = null;    // waar we zijn binnen de fase

/* ---------------------------------------------------------------------------
 * Opbouw van het scherm
 * ------------------------------------------------------------------------- */

export function render(app) {
  s = S.store.spel;
  if (!s) return ga('karakterkeuze');
  if (s.status !== 'bezig' && !(flow && flow.spel === s)) return ga('rekening');

  const k = s.karakter;
  app.innerHTML = `
    <div class="spel">
      <div class="hud" id="hud">
        <div class="hud__wie">
          <span class="avatar" aria-hidden="true">${k.avatar}</span>
          <span><strong>${esc(k.naam)}</strong><span class="hud__leeftijd"><span id="hud-leeftijd">${s.leeftijd}</span> jaar</span></span>
        </div>
        <div class="meter" id="m-geld">
          <span class="meter__label">👛 Portemonnee</span>
          <span class="meter__waarde mono" id="hud-geld"></span>
        </div>
        <div class="meter" id="m-gezond">
          <span class="meter__label">❤️ Gezondheid</span>
          <span class="meter__rij">
            <span class="balk" role="meter" aria-label="Gezondheid" aria-valuemin="0" aria-valuemax="100" id="hud-balk"><span class="balk__vul" id="hud-balk-vul"></span></span>
            <span class="meter__waarde mono" id="hud-gezond"></span>
          </span>
        </div>
        <div class="meter" id="m-zorg">
          <span class="meter__label">🧾 <span class="lang">Totaal betaald aan zorg</span><span class="kort">Aan zorg</span></span>
          <span class="meter__waarde mono" id="hud-zorg"></span>
        </div>
      </div>
      <ol class="tijdlijn" id="tijdlijn" aria-label="Levensfasen"></ol>
      <section class="podium" id="podium" aria-live="polite"></section>
    </div>
  `;

  el = {
    leeftijd: app.querySelector('#hud-leeftijd'),
    geld: app.querySelector('#hud-geld'),
    mGeld: app.querySelector('#m-geld'),
    gezond: app.querySelector('#hud-gezond'),
    mGezond: app.querySelector('#m-gezond'),
    balk: app.querySelector('#hud-balk'),
    balkVul: app.querySelector('#hud-balk-vul'),
    zorg: app.querySelector('#hud-zorg'),
    mZorg: app.querySelector('#m-zorg'),
    tijdlijn: app.querySelector('#tijdlijn'),
    podium: app.querySelector('#podium'),
  };

  vorige = null;
  tekenHud();

  if (flow && flow.spel === s) toonStap();
  else beginFase();
}

const meterWaarden = () => ({
  geld: s.portemonnee,
  gezond: s.gezondheid,
  zorg: S.rekening(s).betaald,
});

// Werk de balk bovenaan bij. Verschillen worden kort groen (+) of rood (−) getoond.
function tekenHud(leeftijd = s.leeftijd) {
  const nu = meterWaarden();
  const oud = vorige || nu;
  el.leeftijd.textContent = leeftijd;

  telOp(el.geld, nu.geld, { van: oud.geld, duur: 700 });
  el.mGeld.classList.toggle('meter--schuld', nu.geld < 0);
  toonVerschil(el.mGeld, nu.geld - oud.geld);

  telOp(el.gezond, nu.gezond, { van: oud.gezond, duur: 700, opmaak: (n) => String(Math.round(n)) });
  el.balkVul.style.width = `${nu.gezond}%`;
  el.balk.setAttribute('aria-valuenow', String(nu.gezond));
  el.balk.dataset.niveau = nu.gezond >= 60 ? 'goed' : nu.gezond >= 30 ? 'matig' : 'slecht';
  toonVerschil(el.mGezond, nu.gezond - oud.gezond, { opmaak: (n) => String(Math.round(n)) });

  telOp(el.zorg, nu.zorg, { van: oud.zorg, duur: 700 });
  toonVerschil(el.mZorg, nu.zorg - oud.zorg, { goedIsPlus: false });

  if (vorige && nu.geld !== oud.geld) speelKassa();
  vorige = nu;

  el.tijdlijn.innerHTML = C.FASEN.map((f, i) => {
    const klaar = i < s.faseIndex || (i === s.faseIndex && s.status === 'klaar');
    const huidig = i === s.faseIndex && !klaar;
    return `<li class="tijdlijn__stap ${klaar ? 'is-klaar' : ''} ${huidig ? 'is-nu' : ''}" ${huidig ? 'aria-current="step"' : ''}>
      <span class="sr-only">Fase ${i + 1}: </span>${f.van}–${f.tot}
    </li>`;
  }).join('');
}

function zetPodium(html) {
  el.podium.innerHTML = html;
  el.podium.classList.remove('podium--in');
  void el.podium.offsetWidth;
  el.podium.classList.add('podium--in');
  window.scrollTo({ top: 0, behavior: minderBeweging() ? 'auto' : 'smooth' });
}

/* ---------------------------------------------------------------------------
 * Stappen binnen een fase
 * ------------------------------------------------------------------------- */

function beginFase() {
  flow = { spel: s, faseIndex: s.faseIndex, stap: null };
  const diagnose = S.diagnoseDezeFase(s);
  if (diagnose) {
    flow.diagnose = { chronisch: diagnose };
    flow.stap = 'diagnose';
  } else {
    flow.stap = 'verzekering';
  }
  toonStap();
}

function toonStap() {
  const stap = flow.stap;
  if (stap === 'diagnose') return toonDiagnose();
  if (stap === 'verzekering') return toonVerzekering();
  if (stap === 'gebeurtenis') return toonGebeurtenis(flow.index);
  if (stap === 'dilemma') return toonDilemma();
  if (stap === 'bon') return toonBon();
}

function gaNaar(stap, index = 0) {
  flow.stap = stap;
  flow.index = index;
  toonStap();
}

const faseKop = (extra = '') => {
  const f = C.FASEN[flow.faseIndex];
  return `<p class="kaart__meta">Fase ${flow.faseIndex + 1}/${C.FASEN.length} · ${f.van}–${f.tot} jaar · ${esc(f.naam)}${extra ? ` · ${extra}` : ''}</p>`;
};

// Knop onderaan een kaart, of het game-over-blok als het spel voorbij is.
function voet(label) {
  if (S.isGameOver(s)) {
    const gezondheid = s.status === 'gezondheid';
    return `
      <div class="gameover" role="alert">
        <h3>${gezondheid ? '💔 Je gezondheid is op' : '💸 Te diep in de schulden'}</h3>
        <p>Het spel stopt op je ${s.eindLeeftijd}e. ${gezondheid
          ? 'Je lichaam kon niet meer.'
          : `Je schuld is groter dan ${euro(-C.SCHULDGRENS)}.`} Bekijk toch De Rekening: wie betaalde voor wie?</p>
        <button type="button" class="knop knop--groot" data-ga="rekening" data-volgende>Naar De Rekening 🧾</button>
      </div>`;
  }
  return `<div class="kaart__voet"><button type="button" class="knop knop--groot" id="volgende" data-volgende>${label}</button></div>`;
}

function opVolgende(handler) {
  el.podium.querySelector('#volgende')?.addEventListener('click', handler);
}

/* --- Diagnose chronische ziekte (Daan) ------------------------------------ */

function toonDiagnose() {
  const d = flow.diagnose;
  const c = d.chronisch;
  const nieuw = !d.resultaat;
  if (nieuw) d.resultaat = S.activeerChronisch(s, c);

  zetPodium(`
    <article class="kaart levensgebeurtenis">
      ${faseKop(`${c.vanafLeeftijd} jaar`)}
      <div class="stempel stempel--rood">Levensgebeurtenis</div>
      <div class="kaart__emoji" aria-hidden="true">${c.emoji}</div>
      <h2 data-focus>Diagnose: ${esc(c.naam)}</h2>
      <p>${esc(c.tekst)}</p>
      <div class="bon bon--mini">
        ${bonRegel(esc(c.omschrijving), c.kostenPerJaar, { sub: 'elk jaar, de rest van je leven' })}
      </div>
      <div class="chips">${chip('Gezondheid', d.resultaat.gezondheid, 'getal')}</div>
      ${wistJeDat(c.wistJeDat)}
      ${voet('Kies je verzekering →')}
    </article>
  `);
  tekenHud(c.vanafLeeftijd);
  focusOpScherm(el.podium);
  opVolgende(() => gaNaar('verzekering'));
}

/* --- STAP A: verzekeringskeuze --------------------------------------------- */

function radios(naam, opties, gekozen, { uit = false } = {}) {
  return `<div class="segment">${opties
    .map((o) => {
      const id = `${naam}-${o.waarde}`;
      return `<span class="segment__optie">
        <input type="radio" name="${naam}" id="${id}" value="${o.waarde}" ${String(o.waarde) === String(gekozen) ? 'checked' : ''} ${uit ? 'disabled' : ''}>
        <label for="${id}"><b class="${o.bedrag ? 'mono' : ''}">${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</label>
      </span>`;
    })
    .join('')}</div>`;
}

function toonVerzekering() {
  const f = S.huidigeFase(s);
  const jaren = S.jarenIn(f);
  const inkomen = S.inkomenIn(s);
  const toeslagRecht = S.zorgtoeslagPerMaand(inkomen);
  const erAf = s.vlaggen.eigenRisicoAfgeschaft;
  const chronisch = s.chronisch.length > 0;
  const keuze = { ...s.keuze, toeslag: s.keuze.toeslag && toeslagRecht > 0 };

  const vrijwilligOpties = C.VRIJWILLIG_OPTIES.map((v) => ({
    waarde: v,
    label: euro(v),
    bedrag: true,
    sub: C.VRIJWILLIG_KORTING_PER_MAAND[v] ? `−${euro(C.VRIJWILLIG_KORTING_PER_MAAND[v])} p/m` : 'geen korting',
  }));

  zetPodium(`
    <form class="kaart verzekering" id="verzekering">
      ${faseKop()}
      <h2 data-focus>Kies je verzekering</h2>
      <p>Je leeft <strong>${jaren} jaar</strong> met deze keuze. Je inkomen: <strong class="mono">${euro(inkomen)}</strong> per jaar.</p>

      <fieldset class="keuzegroep">
        <legend>1. Vrijwillig eigen risico</legend>
        <p class="hint">Extra bovenop het verplichte eigen risico van ${euro(C.EIGEN_RISICO_VERPLICHT)}. Hoger eigen risico = lagere premie, maar je betaalt meer zelf als je zorg nodig hebt.</p>
        ${radios('vrijwillig', vrijwilligOpties, erAf ? 0 : keuze.vrijwillig, { uit: erAf })}
        ${erAf ? '<p class="tip">🗳️ Het eigen risico is afgeschaft. Je betaalt dus nooit eigen risico.</p>' : ''}
        ${chronisch && !erAf ? '<p class="tip">💡 Je hebt elk jaar vaste zorgkosten. Je eigen risico raakt dus elk jaar helemaal vol.</p>' : ''}
      </fieldset>

      <fieldset class="keuzegroep">
        <legend>2. Aanvullende verzekering</legend>
        <p class="hint">Vergoedt tandarts en fysio, tot ${euro(C.AANVULLEND.maxVergoedingPerJaar)} per jaar. Zonder betaal je die zelf.</p>
        ${radios('aanvullend', [
          { waarde: 'nee', label: 'Nee', sub: '€0 p/m' },
          { waarde: 'ja', label: 'Ja', sub: `+${euro(C.AANVULLEND.premiePerMaand + s.premieExtra.aanvullend)} p/m` },
        ], keuze.aanvullend ? 'ja' : 'nee')}
      </fieldset>

      <fieldset class="keuzegroep">
        <legend>3. Zorgtoeslag aanvragen</legend>
        ${toeslagRecht > 0
          ? `<p class="hint">Met jouw inkomen heb je recht op <strong class="mono">${euro(toeslagRecht)}</strong> per maand. Je moet het wel zelf aanvragen!</p>`
          : `<p class="hint hint--uit">🚫 Je verdient te veel (${euro(inkomen)} per jaar). Zorgtoeslag is alleen voor inkomens tot ongeveer ${euro(C.ZORGTOESLAG.grensInkomen)}.</p>`}
        ${radios('toeslag', [
          { waarde: 'nee', label: 'Nee' },
          { waarde: 'ja', label: 'Ja, aanvragen', sub: toeslagRecht > 0 ? `−${euro(toeslagRecht)} p/m` : '' },
        ], keuze.toeslag ? 'ja' : 'nee', { uit: toeslagRecht === 0 })}
      </fieldset>

      <div class="bon-wrap"><div class="bon bon--mini samenvatting" id="samenvatting" aria-live="polite"></div></div>

      <div class="kaart__voet">
        <button type="submit" class="knop knop--groot" data-volgende>Leef deze ${jaren} jaar →</button>
      </div>
    </form>
  `);
  tekenHud(f.van);
  focusOpScherm(el.podium);

  const form = el.podium.querySelector('#verzekering');
  const leesKeuze = () => ({
    vrijwillig: Number(form.vrijwillig.value) || 0,
    aanvullend: form.aanvullend.value === 'ja',
    toeslag: form.toeslag.value === 'ja' && toeslagRecht > 0,
  });

  const samenvatting = () => {
    const p = S.premieOverzicht(s, leesKeuze());
    el.podium.querySelector('#samenvatting').innerHTML = `
      ${bonRegel('Premie basisverzekering', C.PREMIE_BASIS_PER_MAAND + s.premieExtra.basis, { sub: s.premieExtra.basis ? `incl. ${euro(s.premieExtra.basis, { plus: true })} door eerdere keuzes` : '' })}
      ${p.korting ? bonRegel('Korting vrijwillig eigen risico', -p.korting, { klasse: 'bon-regel--plus' }) : ''}
      ${p.aanvullend ? bonRegel('Aanvullende verzekering', p.aanvullend) : ''}
      <div class="bon__streep"></div>
      ${bonRegel('<strong>Jouw maandpremie</strong>', p.premie, { klasse: 'bon-regel--totaal' })}
      ${p.toeslag ? bonRegel('Zorgtoeslag', -p.toeslag, { klasse: 'bon-regel--plus' }) : ''}
      ${p.toeslag ? bonRegel('Na zorgtoeslag', p.netto, { klasse: 'bon-regel--sub' }) : ''}
      ${bonRegel('<strong>Maximaal eigen risico per jaar</strong>', p.maxEigenRisico, { klasse: 'bon-regel--totaal' })}
    `;
  };
  form.addEventListener('change', samenvatting);
  samenvatting();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const log = S.startFase(s, leesKeuze());
    const regels = [{ label: `Inkomen na vaste lasten (${log.jaren} jaar)`, bedrag: log.over }];
    regels.push({ label: 'Premie', bedrag: -(log.premieBasis + log.premieAanvullend) });
    if (log.toeslag) regels.push({ label: 'Zorgtoeslag', bedrag: log.toeslag });
    for (const c of log.chronisch) regels.push({ label: `${c.naam}: eigen risico`, bedrag: -c.speler });
    melding(regels);
    tekenHud(f.van);

    if (S.isGameOver(s)) {
      zetPodium(`<article class="kaart">${faseKop()}<h2 data-focus>Dat gaat mis…</h2>
        <p>Je inkomen is niet genoeg om je premie en vaste lasten te betalen.${toeslagRecht > 0 && !log.keuze.toeslag ? ' Je had recht op zorgtoeslag, maar vroeg het niet aan.' : ''}</p>
        ${voet('')}</article>`);
      focusOpScherm(el.podium);
      return;
    }
    flow.gebeurtenissen = S.trekGebeurtenissen(s);
    gaNaar('gebeurtenis', 0);
  });
}

/* --- STAP B: gebeurteniskaarten -------------------------------------------- */

function chip(label, waarde, soort = 'geld') {
  if (!waarde) return '';
  const tekst = soort === 'geld' ? euro(waarde, { plus: true }) : (waarde > 0 ? '+' : '−') + Math.abs(waarde);
  return `<span class="chip ${waarde > 0 ? 'chip--plus' : 'chip--min'}">${label} <b class="mono">${tekst}</b></span>`;
}

const wistJeDat = (tekst) =>
  tekst ? `<aside class="weetje"><h3>💡 Wist je dat?</h3><p>${esc(tekst)}</p></aside>` : '';

// Waarom betaal jij (niet)? In gewone taal.
function uitleg(r) {
  const type = C.ZORGTYPES[r.type];
  const delen = [];
  if (type.vergoeding === 'basis') {
    if (!type.eigenRisico) delen.push(`${type.label}: geen eigen risico`);
    else if (s.polis.maxEigenRisico === 0) delen.push('geen eigen risico (afgeschaft)');
    else if (r.eigenRisico === 0) delen.push('je eigen risico was dit jaar al op');
    else if (r.eigenRisico < r.kosten) delen.push(`${euro(r.eigenRisico)} eigen risico, daarna betaalt de verzekeraar`);
    else delen.push('gaat helemaal van je eigen risico af');
    if (r.budgetpolis) delen.push(`ziekenhuis zonder contract (budgetpolis): ${euro(r.budgetpolis)} zelf`);
  } else if (type.vergoeding === 'aanvullend') {
    if (r.zonderDekking) delen.push('niet verzekerd: zelf betalen');
    else if (!s.polis.aanvullend) delen.push('geen aanvullende verzekering: zelf betalen');
    else if (r.aanvullend === r.kosten) delen.push('je aanvullende verzekering betaalt alles');
    else if (r.aanvullend > 0) delen.push(`aanvullende verzekering betaalt ${euro(r.aanvullend)} (max ${euro(C.AANVULLEND.maxVergoedingPerJaar)} per jaar)`);
    else delen.push('maximum van je aanvullende verzekering is dit jaar al op');
  } else {
    delen.push('zit niet in de verzekering: zelf betalen');
  }
  return delen.join(' · ');
}

function posten(lijst) {
  return lijst
    .map((r) => `
      <div class="post">
        ${bonRegel(esc(r.wat), r.kosten, { sub: r.jaren > 1 ? `${r.jaren} jaar × ${euro(r.perJaar)}` : C.ZORGTYPES[r.type].label })}
        <div class="post__split">
          <span class="split split--jij">Jij <b class="mono">${euro(r.speler)}</b></span>
          <span class="split split--verz">Verzekeraar <b class="mono">${euro(r.verzekeraarTotaal)}</b></span>
        </div>
        <p class="post__uitleg">${uitleg(r)}</p>
      </div>`)
    .join('');
}

function samenvattingKosten(res) {
  if (!res.kosten) return '';
  return `<p class="kostenzin">Kosten <b class="mono">${euro(res.kosten)}</b> → jij betaalt <b class="mono min">${euro(res.speler)}</b>, verzekeraar betaalt <b class="mono">${euro(res.verzekeraarTotaal)}</b></p>`;
}

function toonGebeurtenis(i) {
  const item = flow.gebeurtenissen[i];
  if (!item) return gaNaar('dilemma');
  const nieuw = !item.resultaat;
  if (nieuw) item.resultaat = S.verwerkGebeurtenis(s, item.gebeurtenis, item.leeftijd);
  const res = item.resultaat;
  const g = item.gebeurtenis;
  const totaal = flow.gebeurtenissen.length;
  const animeren = nieuw && !minderBeweging();
  const laatste = i >= totaal - 1;

  zetPodium(`
    <div class="flip ${animeren ? '' : 'is-om'}" id="flip">
      <div class="flip__binnen">
        <button type="button" class="flip__kant flip__achter" id="omdraaien" aria-label="Draai de kaart om" ${animeren ? '' : 'hidden'}>
          <span class="kaartrug">
            <span class="kaartrug__vraag" aria-hidden="true">?</span>
            <span class="kaartrug__tekst">Gebeurtenis ${i + 1} van ${totaal}</span>
          </span>
        </button>
        <article class="flip__kant flip__voor kaart gebeurtenis" ${animeren ? 'aria-hidden="true"' : ''}>
          ${faseKop(`${item.leeftijd} jaar`)}
          <p class="kaart__teller">Gebeurtenis ${i + 1} van ${totaal}</p>
          <div class="kaart__emoji" aria-hidden="true">${g.emoji}</div>
          <h2 data-focus>${esc(g.titel)}</h2>
          <p>${esc(g.tekst)}</p>
          ${res.posten.length
            ? `<div class="bon bon--mini">${posten(res.posten)}</div>${samenvattingKosten(res)}`
            : '<p class="kostenzin">Kosten <b class="mono">€0</b>. Je premie betaal je natuurlijk gewoon.</p>'}
          ${g.terugkerend ? `<p class="tip">🔁 Deze kosten komen elk jaar terug, tot je 80e.</p>` : ''}
          <div class="chips">${chip('Gezondheid', res.gezondheid, 'getal')}</div>
          ${wistJeDat(g.wistJeDat)}
          ${voet(laatste ? 'Naar het dilemma →' : 'Volgende kaart →')}
        </article>
      </div>
    </div>
  `);

  const flip = el.podium.querySelector('#flip');
  const voor = flip.querySelector('.flip__voor');
  const achter = flip.querySelector('#omdraaien');
  const knop = el.podium.querySelector('#volgende');
  opVolgende(() => gaNaar('gebeurtenis', i + 1));

  let omgedraaid = !animeren;
  const draaiOm = async () => {
    if (omgedraaid) return;
    omgedraaid = true;
    flip.classList.add('is-om');
    voor.removeAttribute('aria-hidden');
    await wacht(650);
    achter.hidden = true;
    if (knop) knop.disabled = false;
    tekenHud(item.leeftijd);
    focusOpScherm(voor);
  };

  if (animeren) {
    if (knop) knop.disabled = true;
    achter.addEventListener('click', draaiOm);
    achter.focus({ preventScroll: true });
    setTimeout(draaiOm, 900);
  } else {
    tekenHud(item.leeftijd);
    focusOpScherm(voor);
  }
}

/* --- STAP C: dilemma ------------------------------------------------------- */

function toonDilemma() {
  if (!('getrokken' in flow)) flow.getrokken = S.trekDilemma(s);
  const t = flow.getrokken;
  if (!t) return gaNaar('bon');
  const d = t.dilemma;
  const gekozen = flow.dilemmaResultaat?.keuzeIndex;

  zetPodium(`
    <article class="kaart dilemma">
      ${faseKop(`${t.leeftijd} jaar`)}
      <div class="stempel">Dilemma</div>
      <div class="kaart__emoji" aria-hidden="true">${d.emoji}</div>
      <h2 data-focus>${esc(d.titel)}</h2>
      <p class="situatie">${esc(t.situatie)}</p>
      <div class="keuzeknoppen" role="group" aria-label="Maak je keuze">
        ${d.keuzes.map((k, i) => `
          <button type="button" class="knop knop--keuze ${gekozen === i ? 'is-gekozen' : ''}" data-keuze="${i}" ${gekozen != null ? 'disabled' : ''}>
            ${esc(k.label)}
          </button>`).join('')}
      </div>
      <div id="uitkomst"></div>
    </article>
  `);
  tekenHud(t.leeftijd);
  focusOpScherm(el.podium);

  const toonUitkomst = (res) => {
    const k = res.keuze;
    const premie = res.premieBasis + res.premieAanvullend;
    el.podium.querySelector('#uitkomst').innerHTML = `
      <div class="uitkomst">
        <h3>Jij koos: ${esc(k.label)}</h3>
        <p>${esc(k.uitkomst)}</p>
        ${res.posten.length ? `<div class="bon bon--mini">${posten(res.posten)}</div>${samenvattingKosten(res)}` : ''}
        <div class="chips">
          ${chip('Geld', res.geld)}
          ${chip('Zorgtoeslag', res.toeslag)}
          ${chip('Gezondheid', res.gezondheid, 'getal')}
          ${premie ? `<span class="chip ${premie < 0 ? 'chip--plus' : 'chip--min'}">Premie vanaf volgende fase <b class="mono">${euro(premie, { plus: true })} p/m</b></span>` : ''}
        </div>
        <aside class="profiteert">
          <h3>⚖️ Wie profiteert, wie betaalt?</h3>
          <p>${esc(d.wieProfiteert)}</p>
        </aside>
        ${wistJeDat(d.wistJeDat)}
        ${voet('Bekijk je bonnetje →')}
      </div>`;
    opVolgende(() => gaNaar('bon'));
  };

  if (flow.dilemmaResultaat) {
    toonUitkomst(flow.dilemmaResultaat);
    return;
  }

  el.podium.querySelectorAll('[data-keuze]').forEach((knop) => {
    knop.addEventListener('click', () => {
      const index = Number(knop.dataset.keuze);
      flow.dilemmaResultaat = S.verwerkDilemma(s, d, index, t.leeftijd, t.ctx);
      el.podium.querySelectorAll('[data-keuze]').forEach((b) => {
        b.disabled = true;
        b.classList.toggle('is-gekozen', b === knop);
      });
      toonUitkomst(flow.dilemmaResultaat);
      tekenHud(t.leeftijd);
      el.podium.querySelector('.uitkomst h3')?.scrollIntoView({ behavior: minderBeweging() ? 'auto' : 'smooth', block: 'start' });
      focusOpScherm(el.podium.querySelector('#uitkomst'));
    });
  });
}

/* --- Bonnetje van de fase -------------------------------------------------- */

function toonBon() {
  if (!flow.bon) flow.bon = S.eindigFase(s);
  const log = flow.bon;
  const f = C.FASEN[log.index];
  const r = S.rekening(log);
  const netto = log.portemonneeEind - log.portemonneeStart;
  const klaar = s.status === 'klaar';
  const volgende = C.FASEN[log.index + 1];

  zetPodium(`
    <div class="bon-wrap bon-print">
      <article class="bon fasebon">
        <div class="bon__kop">
          <strong>BON · FASE ${log.index + 1}/${C.FASEN.length}</strong>
          <span>${f.van}–${f.tot} jaar · ${esc(f.naam)}</span>
        </div>
        <h2 class="sr-only" data-focus>Bonnetje van fase ${log.index + 1}, ${f.van} tot ${f.tot} jaar</h2>

        <h3 class="bon__sectie">Geld</h3>
        ${bonRegel('Inkomen na vaste lasten', log.over, { sub: `${log.jaren} jaar × ${euro(log.overPerJaar)} (van ${euro(log.inkomen)})`, klasse: 'bon-regel--plus', opmaak: (n) => euro(n, { plus: true }) })}
        ${bonRegel('Premie basisverzekering', -log.premieBasis, { sub: `${log.jaren} jaar × ${euro(log.premie.basis)} p/m` })}
        ${log.premieAanvullend ? bonRegel('Premie aanvullend', -log.premieAanvullend) : ''}
        ${log.toeslag ? bonRegel('Zorgtoeslag', log.toeslag, { klasse: 'bon-regel--plus', opmaak: (n) => euro(n, { plus: true }) }) : ''}
        ${bonRegel('Eigen risico', -log.eigenRisico, { sub: `max ${euro(log.premie.maxEigenRisico)} per jaar` })}
        ${log.zelf ? bonRegel('Zelf betaalde zorg', -log.zelf) : ''}
        ${log.overig ? bonRegel('Overig (je keuzes)', log.overig, { opmaak: (n) => euro(n, { plus: true }) }) : ''}
        <div class="bon__streep"></div>
        ${bonRegel('<strong>Netto deze fase</strong>', netto, { klasse: `bon-regel--totaal ${netto < 0 ? 'bon-regel--min' : 'bon-regel--plus'}`, opmaak: (n) => euro(n, { plus: true }) })}

        <h3 class="bon__sectie">Zorg</h3>
        ${bonRegel('Wat jouw zorg écht kostte', r.zorgkosten)}
        ${bonRegel('Daarvan betaalde de verzekeraar', r.verzekeraar)}
        ${bonRegel('Jij betaalde aan zorg', r.betaald, { sub: 'premie − toeslag + eigen risico + zelf' })}

        <h3 class="bon__sectie">Gezondheid</h3>
        ${log.veroudering ? bonRegel('Ouder worden', log.veroudering, { opmaak: (n) => String(n) }) : ''}
        ${log.ziekte ? bonRegel('Je ziekte', log.ziekte, { opmaak: (n) => String(n) }) : ''}
        ${bonRegel('<strong>Gezondheid nu</strong>', log.gezondheidEind, { klasse: 'bon-regel--totaal', opmaak: (n) => `${n}/100` })}

        <div class="bon__voet">
          <span class="streepjescode" aria-hidden="true"></span>
          Bedankt voor uw bijdrage aan de zorg
        </div>
      </article>
    </div>
    ${voet(klaar ? 'Naar De Rekening 🧾' : `Volgende fase: ${volgende.van}–${volgende.tot} jaar →`)}
  `);
  tekenHud(s.leeftijd);
  focusOpScherm(el.podium);
  opVolgende(() => {
    if (klaar) {
      flow = null;
      ga('rekening');
    } else {
      beginFase();
    }
  });
}

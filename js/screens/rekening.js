/*
 * ============================================================================
 *  DE REKENING – het eindscherm
 * ============================================================================
 *  1. Het bonnetje van je hele leven (getallen tellen op)
 *  2. Het verschil: betaalde jij voor anderen, of betaalden anderen voor jou?
 *  3. De "pot": wat je erin stopte en wat je eruit haalde
 *  4. Per levensfase: betaald vs. zorgkosten (jong betaalt, oud krijgt)
 *  5. Wie profiteert, wie betaalt? (4 groepen)
 *  6. Reflectievraag met stemmen op dit apparaat
 * ============================================================================
 */

import { ga } from '../router.js';
import * as S from '../state.js';
import { FASEN } from '../config.js';
import { bewaarScore, stem, stemmen } from '../storage.js';
import { euro, esc, telOp, bonRegel, wacht } from '../ui.js';

const OPTIES_EERLIJK = [
  { id: 'ja', label: 'Ja' },
  { id: 'nee', label: 'Nee' },
  { id: 'twijfel', label: 'Twijfel' },
];

// Mooie getallen voor de as: 0, 10k, 20k...
function asStappen(max) {
  if (max <= 0) return [0, 1];
  const ruw = max / 4;
  const macht = 10 ** Math.floor(Math.log10(ruw));
  const stap = [1, 2, 2.5, 5, 10].map((f) => f * macht).find((f) => f >= ruw);
  const stappen = [];
  for (let v = 0; v < max + stap; v += stap) stappen.push(v);
  return stappen;
}
const kort = (n) => (n >= 1000 ? `€${(n / 1000).toLocaleString('nl-NL')}k` : euro(n));

export function render(app) {
  const s = S.store.spel;
  if (!s) return ga('start');

  const k = s.karakter;
  const r = S.rekening(s);
  const gameOver = S.isGameOver(s);
  const eind = s.eindLeeftijd ?? s.leeftijd;
  const score = S.levensscore(s);
  s.scoreOpslag ??= bewaarScore(k.id, score);
  const record = s.scoreOpslag;

  const perFase = s.fasen.map((log) => ({ ...S.rekening(log), van: log.van, tot: log.tot }));
  const meebetaald = r.verschil >= 0;

  app.innerHTML = `
    <section class="scherm rekening">
      <p class="label">${k.avatar} ${esc(k.naam)} · ${gameOver ? `gestopt op ${eind} jaar` : `${eind} jaar`}</p>
      <h1 data-focus>De Rekening</h1>
      ${gameOver ? `<p class="gameover gameover--klein">${s.status === 'gezondheid' ? '💔 Je gezondheid was op' : '💸 Je zat te diep in de schulden'} op je ${eind}e. Dit is de rekening van het leven dat je had.</p>` : ''}

      <div class="rekening__raster">
        <div class="bon-wrap bon-print">
          <article class="bon eindbon" aria-label="Bonnetje van je hele leven">
            <div class="bon__kop">
              <strong>DE REKENING</strong>
              <span>${esc(k.naam)} · 18 tot ${eind} jaar</span>
            </div>
            ${regel('Premie basisverzekering', r.premieBasis)}
            ${r.premieAanvullend ? regel('Premie aanvullende verzekering', r.premieAanvullend) : ''}
            ${r.toeslag ? regel('Zorgtoeslag (van de overheid)', -r.toeslag, 'bon-regel--plus') : ''}
            ${regel('<strong>Totaal betaald aan premie</strong>', r.premie - r.toeslag, 'bon-regel--sub')}
            ${regel('Eigen risico', r.eigenRisico)}
            ${regel('Zelf betaalde zorg', r.zelf, '', 'tandarts, fysio, eigen bijdragen')}
            ${regel('<strong>Totaal eigen risico & zelf betaald</strong>', r.eigenEnZelf, 'bon-regel--sub')}
            <div class="bon__streep bon__streep--dik"></div>
            ${regel('<strong>JIJ BETAALDE</strong>', r.betaald, 'bon-regel--totaal')}
            ${regel('<strong>JOUW ZORG KOSTTE ECHT</strong>', r.zorgkosten, 'bon-regel--totaal')}
            <div class="bon__streep bon__streep--dik"></div>
            ${regel(`<strong>${meebetaald ? 'JIJ BETAALDE MEE VOOR ANDEREN' : 'ANDEREN BETAALDEN VOOR JOU'}</strong>`, Math.abs(r.verschil), `bon-regel--totaal ${meebetaald ? 'bon-regel--plus' : 'bon-regel--min'}`)}
            <div class="bon__voet">
              <span class="streepjescode" aria-hidden="true"></span>
              Bewaar deze bon. Of niet.
            </div>
          </article>
        </div>

        <div class="rekening__uitkomst">
          <div class="oordeel ${meebetaald ? 'oordeel--mee' : 'oordeel--kreeg'}">
            <p class="oordeel__getal mono" id="oordeel-getal">${euro(Math.abs(r.verschil))}</p>
            <p class="oordeel__tekst">${meebetaald
              ? `Jij betaalde <strong>${euro(r.verschil)}</strong> mee aan de zorg van anderen. Zo werkt solidariteit.`
              : `Anderen betaalden <strong>${euro(-r.verschil)}</strong> voor jouw zorg. Zonder hen had je dit nooit kunnen betalen.`}</p>
          </div>

          ${pot(r)}
          <p class="klein">In het echt betaalt je werkgever ook nog een inkomensafhankelijke bijdrage voor de zorg. Die zit niet in dit spel.</p>
        </div>
      </div>

      ${faseGrafiek(perFase)}

      <h2 class="sectiekop">Wie profiteert, wie betaalt?</h2>
      <div class="groepen">
        ${groepen(s, r, perFase).map((g) => `
          <article class="groep ${g.jij ? 'groep--jij' : ''}">
            <h3><span aria-hidden="true">${g.icoon}</span> ${g.naam}${g.jij ? ' <span class="label-jij">jij</span>' : ''}</h3>
            <p>${g.tekst}</p>
          </article>`).join('')}
      </div>

      <div class="kaart reflectie" id="reflectie">
        <h2>Wat vind jij?</h2>
        <p class="reflectie__vraag">Vind jij het eerlijk dat gezonde mensen meebetalen voor zieke mensen?</p>
        <p class="klein">Er is geen goed of fout antwoord.</p>
        <div class="stemknoppen" id="stemknoppen">
          ${OPTIES_EERLIJK.map((o) => `<button type="button" class="knop knop--keuze" data-stem="${o.id}">${o.label}</button>`).join('')}
        </div>
        <div id="stemuitslag" aria-live="polite"></div>
      </div>

      <div class="score">
        <span>Levensscore <small>(gezondheid × 10 + geld ÷ 200)</small></span>
        <b class="mono">${score}</b>
        ${record.nieuw ? '<span class="chip chip--plus">🏆 Nieuw record!</span>' : `<span class="klein">Beste met ${esc(k.naam)} op dit apparaat: <b class="mono">${record.record}</b></span>`}
      </div>

      <div class="knoppen knoppen--midden">
        <button type="button" class="knop knop--groot" data-ga="watals" data-volgende>Wat als…? →</button>
        <button type="button" class="knop knop--licht" data-ga="karakterkeuze">Speel als ander karakter</button>
        <button type="button" class="knop knop--licht" data-ga="bronnen">Bronnen</button>
      </div>
    </section>
  `;

  animeer(app);
  koppelGrafiek(app);
  koppelStemmen(app, s);
}

function regel(label, bedrag, klasse = '', sub = '') {
  return bonRegel(label, bedrag, { klasse, sub }).replace('class="bon-regel__bedrag mono"', `class="bon-regel__bedrag mono" data-telop="${bedrag}"`);
}

// Getallen op de bon tellen één voor één op.
async function animeer(app) {
  const regels = [...app.querySelectorAll('[data-telop]')];
  regels.forEach((el) => (el.textContent = euro(0)));
  for (const el of regels) {
    telOp(el, Number(el.dataset.telop), { duur: 500 });
    await wacht(160);
  }
  app.querySelectorAll('.pot__balk').forEach((b) => b.classList.add('is-gevuld'));
  const getal = app.querySelector('#oordeel-getal');
  if (getal) telOp(getal, Math.abs(Number(getal.textContent.replace(/[^\d]/g, ''))), { duur: 1400 });
}

/* --- De pot: erin vs. eruit ------------------------------------------------ */

function pot(r) {
  const max = Math.max(r.betaald, r.zorgkosten, 1);
  const rij = (soort, label, sub, bedrag) => `
    <div class="pot__rij">
      <span class="pot__label"><i class="staal staal--${soort}" aria-hidden="true"></i>${label}<small>${sub}</small></span>
      <span class="pot__spoor"><span class="pot__balk pot__balk--${soort}" style="--breedte: ${(bedrag / max) * 100}%"></span></span>
      <span class="pot__waarde mono">${euro(bedrag)}</span>
    </div>`;
  return `
    <figure class="pot" aria-label="Erin gestopt ${euro(r.betaald)}, eruit gehaald ${euro(r.zorgkosten)}">
      <figcaption>De zorgpot</figcaption>
      ${rij('erin', 'Erin gestopt', 'wat jij betaalde', r.betaald)}
      ${rij('eruit', 'Eruit gehaald', 'wat jouw zorg kostte', r.zorgkosten)}
    </figure>`;
}

/* --- Per levensfase -------------------------------------------------------- */

function faseGrafiek(perFase) {
  const max = Math.max(1, ...perFase.flatMap((f) => [f.betaald, f.zorgkosten]));
  const stappen = asStappen(max);
  const top = stappen[stappen.length - 1];
  const pct = (v) => `${Math.max(0, (v / top) * 100)}%`;

  return `
    <figure class="fasegrafiek">
      <figcaption>
        <h2 class="sectiekop">Per levensfase</h2>
        <p>Wat jij betaalde aan zorg, en wat je zorg kostte. Vaak betalen jongeren meer dan ze kosten, en krijgen ouderen meer dan ze betalen.</p>
      </figcaption>
      <div class="legenda">
        <span><i class="staal staal--erin" aria-hidden="true"></i>Jij betaalde</span>
        <span><i class="staal staal--eruit" aria-hidden="true"></i>Zorg kostte</span>
      </div>
      <div class="fg" aria-hidden="true">
        <div class="fg__plot">
          ${stappen.map((v) => `<div class="fg__lijn" style="bottom: ${pct(v)}"><span>${kort(v)}</span></div>`).join('')}
          <div class="fg__groepen">
            ${FASEN.map((f, i) => {
              const d = perFase[i];
              if (!d) return `<div class="fg__groep fg__groep--leeg"></div>`;
              return `<div class="fg__groep" tabindex="0" data-tip="${f.van}–${f.tot} jaar|${d.betaald}|${d.zorgkosten}">
                <span class="fg__staaf fg__staaf--erin" style="height: ${pct(d.betaald)}"></span>
                <span class="fg__staaf fg__staaf--eruit" style="height: ${pct(d.zorgkosten)}"></span>
              </div>`;
            }).join('')}
          </div>
          <div class="fg__tip" hidden></div>
        </div>
        <div class="fg__x">${FASEN.map((f) => `<span>${f.van}–${f.tot}</span>`).join('')}</div>
      </div>
      <details class="tabel">
        <summary>Bekijk als tabel</summary>
        <table>
          <thead><tr><th scope="col">Leeftijd</th><th scope="col">Jij betaalde</th><th scope="col">Zorg kostte</th><th scope="col">Verschil</th></tr></thead>
          <tbody>
            ${perFase.map((d) => `<tr><th scope="row">${d.van}–${d.tot}</th><td class="mono">${euro(d.betaald)}</td><td class="mono">${euro(d.zorgkosten)}</td><td class="mono">${euro(d.verschil, { plus: true })}</td></tr>`).join('')}
          </tbody>
        </table>
      </details>
    </figure>`;
}

function koppelGrafiek(app) {
  const plot = app.querySelector('.fg__plot');
  const tip = app.querySelector('.fg__tip');
  if (!plot || !tip) return;
  const toon = (groep) => {
    const [label, betaald, kosten] = groep.dataset.tip.split('|');
    tip.innerHTML = `<strong>${label}</strong>
      <span><i class="staal staal--erin"></i>Jij betaalde <b class="mono">${euro(Number(betaald))}</b></span>
      <span><i class="staal staal--eruit"></i>Zorg kostte <b class="mono">${euro(Number(kosten))}</b></span>`;
    tip.hidden = false;
    const p = plot.getBoundingClientRect();
    const g = groep.getBoundingClientRect();
    const links = Math.min(Math.max(g.left - p.left + g.width / 2, 90), p.width - 90);
    tip.style.left = `${links}px`;
    plot.querySelectorAll('.fg__groep').forEach((x) => x.classList.toggle('is-actief', x === groep));
  };
  const verberg = () => {
    tip.hidden = true;
    plot.querySelectorAll('.fg__groep').forEach((x) => x.classList.remove('is-actief'));
  };
  plot.querySelectorAll('.fg__groep[data-tip]').forEach((groep) => {
    groep.addEventListener('pointerenter', () => toon(groep));
    groep.addEventListener('focus', () => toon(groep));
    groep.addEventListener('click', () => toon(groep));
  });
  plot.addEventListener('pointerleave', verberg);
  plot.addEventListener('focusout', (e) => {
    if (!plot.contains(e.relatedTarget)) verberg();
  });
}

/* --- Wie profiteert, wie betaalt? ------------------------------------------ */

function groepen(s, r, perFase) {
  const som = (lijst) => lijst.reduce((a, f) => a + f.verschil, 0);
  const jong = som(perFase.filter((f) => f.van < 45));
  const oudeFasen = perFase.filter((f) => f.van >= 65);
  const oud = som(oudeFasen);
  const chronisch = s.zorglog.filter((z) => z.bron === 'chronisch').reduce((a, z) => a + z.kosten, 0);
  const jongJij = jong > 0;

  const jongeren = jongJij
    ? `Tot je 45e betaalde jij <strong>${euro(jong)}</strong> meer dan je zorg kostte. Dat geld ging naar mensen die toen zorg nodig hadden.`
    : `Zelfs als jongere kostte jouw zorg <strong>${euro(-jong)}</strong> meer dan je betaalde. Gezonde jongeren betaalden voor jou mee.`;

  let ouderen;
  let ouderenJij = false;
  if (s.karakter.chronisch && chronisch > 0) {
    ouderenJij = true;
    ouderen = `Jij hoorde zelf bij deze groep. Je vaste zorg kostte <strong>${euro(chronisch)}</strong>. Dat kon alleen omdat iedereen meebetaalt.`;
  } else if (oudeFasen.length && oud < 0) {
    ouderenJij = true;
    ouderen = `Na je 65e kostte jouw zorg <strong>${euro(-oud)}</strong> meer dan je betaalde. Toen betaalden jongere mensen voor jou.`;
  } else if (oudeFasen.length) {
    ouderen = 'Ook na je 65e betaalde jij meer dan je zorg kostte: je had geluk met je gezondheid. Veel ouderen krijgen juist meer zorg dan ze betalen.';
  } else {
    ouderen = 'Ouderen en chronisch zieken krijgen meer zorg dan ze aan premie betalen. Jouw premie hielp hen.';
  }

  const verzekeraars =
    `De verzekeraars betaalden <strong>${euro(r.verzekeraar)}</strong> voor jouw zorg. Ze moeten iedereen accepteren voor de basisverzekering, en verdienen aan scherp inkopen bij ziekenhuizen.` +
    (s.vlaggen.budgetpolis ? ' Met je budgetpolis bespaarde je verzekeraar extra, maar betaalde jij soms bij.' : '');

  const overheid = r.toeslag
    ? `Via zorgtoeslag kreeg jij <strong>${euro(r.toeslag)}</strong> uit belastinggeld. Zo betaalden alle belastingbetalers mee aan jouw premie.`
    : 'Jij kreeg geen zorgtoeslag. Via je belasting betaalde jij mee aan de zorgtoeslag van mensen met een laag inkomen.';

  return [
    { icoon: '🧑‍🎓', naam: 'Jongeren & gezonden', tekst: jongeren, jij: jongJij },
    { icoon: '👵', naam: 'Ouderen & chronisch zieken', tekst: ouderen, jij: ouderenJij },
    { icoon: '🏢', naam: 'Zorgverzekeraars', tekst: verzekeraars },
    { icoon: '🏛️', naam: 'Overheid & samenleving', tekst: overheid, jij: r.toeslag > 0 },
  ];
}

/* --- Reflectievraag -------------------------------------------------------- */

export function stemUitslag(tellingen, opties, gekozen) {
  const totaal = Object.values(tellingen).reduce((a, b) => a + b, 0) || 1;
  return `
    <div class="stemuitslag">
      <p class="klein">Zo stemden spelers op dit apparaat (${totaal} ${totaal === 1 ? 'stem' : 'stemmen'}):</p>
      ${opties.map((o) => {
        const n = tellingen[o.id] || 0;
        const p = Math.round((n / totaal) * 100);
        return `<div class="stemrij ${o.id === gekozen ? 'is-gekozen' : ''}">
          <span class="stemrij__label">${o.label}${o.id === gekozen ? ' <small>(jij)</small>' : ''}</span>
          <span class="stemrij__spoor"><span class="stemrij__balk" style="width: ${p}%"></span></span>
          <span class="stemrij__getal mono">${p}% <small>(${n})</small></span>
        </div>`;
      }).join('')}
    </div>`;
}

function koppelStemmen(app, s) {
  const uitslag = app.querySelector('#stemuitslag');
  const knoppen = app.querySelectorAll('[data-stem]');
  const ids = OPTIES_EERLIJK.map((o) => o.id);
  const toon = (tellingen, gekozen) => {
    uitslag.innerHTML = stemUitslag(tellingen, OPTIES_EERLIJK, gekozen);
    knoppen.forEach((k) => {
      k.disabled = true;
      k.classList.toggle('is-gekozen', k.dataset.stem === gekozen);
    });
  };
  if (s.stemEerlijk) toon(stemmen('eerlijk', ids), s.stemEerlijk);
  knoppen.forEach((knop) =>
    knop.addEventListener('click', () => {
      s.stemEerlijk = knop.dataset.stem;
      toon(stem('eerlijk', s.stemEerlijk, ids), s.stemEerlijk);
    }),
  );
}

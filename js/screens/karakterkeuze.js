/*
 * Karakterkeuze: drie kaarten om aan te klikken, daarna "Begin je leven".
 */

import { ga } from '../router.js';
import { KARAKTERS, vindKarakter } from '../data/characters.js';
import { nieuwSpel, store } from '../state.js';
import { highscores } from '../storage.js';
import { euro, esc } from '../ui.js';

function risicoStippen(niveau) {
  return [1, 2, 3].map((i) => `<span class="stip ${i <= niveau ? 'stip--aan' : ''}"></span>`).join('');
}

function kaart(k, record) {
  const laag = Math.min(...k.inkomen);
  const hoog = Math.max(...k.inkomen);
  return `
    <div class="karakter">
      <input type="radio" name="karakter" id="k-${k.id}" value="${k.id}" class="karakter__input">
      <label for="k-${k.id}" class="karakter__kaart">
        <span class="karakter__gekozen" aria-hidden="true">✓ Gekozen</span>
        <span class="avatar avatar--groot" aria-hidden="true">${k.avatar}</span>
        <span class="karakter__naam">${esc(k.naam)}</span>
        <span class="karakter__kort">${esc(k.kort)}</span>
        <span class="karakter__bio">${esc(k.bio)}</span>
        <span class="karakter__feiten">
          <span><span class="feit__label">Startgeld</span><span class="mono">${euro(k.startgeld)}</span></span>
          <span><span class="feit__label">Inkomen</span><span class="mono">${euro(laag)} – ${euro(hoog)}</span></span>
          <span><span class="feit__label">Gezondheid</span><span class="mono">${k.startGezondheid}/100</span></span>
          <span><span class="feit__label">Risico</span><span class="risico" title="${esc(k.risicoLabel)}">${risicoStippen(k.risiconiveau)} <small>${esc(k.risicoLabel)}</small></span></span>
        </span>
        ${k.chronisch ? `<span class="karakter__let-op">⚠️ Vanaf ${k.chronisch.vanafLeeftijd} jaar: ${euro(k.chronisch.kostenPerJaar)} zorgkosten per jaar</span>` : ''}
        ${record != null ? `<span class="karakter__record">🏆 Beste score op dit apparaat: <b class="mono">${record}</b></span>` : ''}
      </label>
    </div>`;
}

export function render(app) {
  const records = highscores();
  app.innerHTML = `
    <section class="scherm">
      <p class="label">Stap 1</p>
      <h1 data-focus>Kies je karakter</h1>
      <p class="intro">Met wie speel je het leven van 18 tot 80? Elk karakter heeft een ander inkomen en een andere kans om ziek te worden. <button type="button" class="link" data-ga="spelregels">Spelregels lezen</button></p>

      <form id="karakterform" class="karakters">
        <fieldset>
          <legend class="sr-only">Karakter</legend>
          <div class="karakters__rij">
            ${KARAKTERS.map((k) => kaart(k, records[k.id])).join('')}
          </div>
        </fieldset>
        <div class="knoppen knoppen--midden">
          <button type="submit" class="knop knop--groot" id="begin" data-volgende disabled>Kies eerst een karakter</button>
        </div>
      </form>
    </section>
  `;

  const form = app.querySelector('#karakterform');
  const begin = app.querySelector('#begin');

  form.addEventListener('change', () => {
    const k = vindKarakter(form.karakter.value);
    begin.disabled = !k;
    begin.textContent = k ? `Begin je leven als ${k.naam} →` : 'Kies eerst een karakter';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const k = vindKarakter(form.karakter.value);
    if (!k) return;
    store.spel = nieuwSpel(k);
    ga('spel');
  });
}

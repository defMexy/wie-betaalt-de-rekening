/*
 * Bronnen: de lijst staat in config.js (BRONNEN), zodat je er makkelijk meer kunt toevoegen.
 */

import { BRONNEN, PEILJAAR } from '../config.js';
import { store } from '../state.js';
import { esc } from '../ui.js';

export function render(app) {
  const spel = store.spel;
  const terug = spel && spel.status !== 'bezig' ? 'rekening' : 'start';

  app.innerHTML = `
    <section class="scherm smal">
      <p class="label">Waar komen de feiten vandaan?</p>
      <h1 data-focus>Bronnen</h1>

      <ol class="bronnen">
        ${BRONNEN.map((b) => `
          <li class="bron">
            <a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.naam)} <span aria-hidden="true">↗</span><span class="sr-only"> (opent in een nieuw tabblad)</span></a>
            <p>${esc(b.gebruikt)}</p>
            <p class="bron__url mono">${esc(b.url.replace(/^https?:\/\//, ''))}</p>
          </li>`).join('')}
      </ol>

      <div class="kaart kaart--waarschuwing">
        <h2>⚠️ Let op</h2>
        <p>Alle bedragen in deze game zijn <strong>afgerond of indicatief</strong> (peiljaar ${PEILJAAR}). Echte premies, kortingen en toeslagen verschillen per verzekeraar en per jaar. Controleer de actuele bedragen altijd bij de bronnen hierboven.</p>
        <p>Het spel is een vereenvoudiging. Zo betaalt je werkgever in het echt ook een inkomensafhankelijke bijdrage voor de zorg, en hangt de zorgtoeslag af van meer dan alleen je inkomen.</p>
      </div>

      <div class="kaart">
        <h2>Over deze game</h2>
        <p>Gemaakt voor het vak burgerschap (mbo). Centrale vraag: <em>Wie betaalt uiteindelijk de rekening wanneer belangen botsen?</em></p>
      </div>

      <div class="knoppen knoppen--midden">
        <button type="button" class="knop knop--groot" data-ga="${terug}" data-volgende>← Terug</button>
      </div>
    </section>
  `;
}

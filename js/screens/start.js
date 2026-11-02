/*
 * Startscherm: titel, ondertitel en de knoppen Start / Spelregels / Bronnen.
 */

import { ga } from '../router.js';
import { store } from '../state.js';
import { EIGEN_RISICO_VERPLICHT, PREMIE_BASIS_PER_MAAND, PEILJAAR } from '../config.js';
import { bonRegel, esc } from '../ui.js';

export function render(app) {
  const lopend = store.spel && store.spel.status === 'bezig' ? store.spel : null;

  app.innerHTML = `
    <section class="scherm start">
      <div class="start__tekst">
        <p class="label">Een levenssimulatie over de zorgverzekering</p>
        <h1 class="titel" data-focus>Wie betaalt de <span class="markeer">rekening?</span></h1>
        <p class="ondertitel">Een leven lang zorgverzekerd – van 18 tot 80</p>
        <div class="knoppen">
          ${lopend ? `<button type="button" class="knop knop--groot" id="verder">Verder met je leven <small>(${esc(lopend.karakter.naam)}, ${lopend.leeftijd} jaar)</small></button>` : ''}
          <button type="button" class="knop ${lopend ? 'knop--licht' : 'knop--groot'}" data-ga="karakterkeuze" ${lopend ? '' : 'data-volgende'}>${lopend ? 'Opnieuw beginnen' : 'Start'}</button>
          <button type="button" class="knop knop--licht" data-ga="spelregels">Spelregels</button>
          <button type="button" class="knop knop--licht" data-ga="bronnen">Bronnen</button>
        </div>
        <p class="klein">Ongeveer 5 minuten · 7 levensfasen · 3 karakters</p>
      </div>

      <div class="bon-wrap start__bon" aria-hidden="true">
        <div class="bon bon--schuin">
          <div class="bon__kop">
            <strong>ZORGKASSA NL</strong>
            <span>Bon voor 1 leven · ${PEILJAAR}</span>
          </div>
          ${bonRegel('Premie per maand', PREMIE_BASIS_PER_MAAND)}
          ${bonRegel('Eigen risico per jaar', EIGEN_RISICO_VERPLICHT)}
          ${bonRegel('Huisarts', 0, { sub: 'geen eigen risico' })}
          ${bonRegel('Gebroken been', 2500)}
          ${bonRegel('Nieuwe heup', 12000)}
          <div class="bon__streep"></div>
          ${bonRegel('<strong>Wie betaalt?</strong>', 0, { klasse: 'bon-regel--totaal', opmaak: () => '€ ???' })}
          <div class="bon__voet">Speel je leven en ontdek het.</div>
        </div>
      </div>
    </section>
  `;

  app.querySelector('#verder')?.addEventListener('click', () => ga('spel'));
}

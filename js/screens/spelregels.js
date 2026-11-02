/*
 * Spelregels (verplicht voor de opdracht). Simpel Nederlands voor 16-20-jarigen.
 */

import { EIGEN_RISICO_VERPLICHT, FASEN, PREMIE_BASIS_PER_MAAND, SCHULDGRENS, AANVULLEND } from '../config.js';
import { euro } from '../ui.js';

export function render(app) {
  const fasen = FASEN.map((f) => `<li><span class="mono">${f.van}–${f.tot}</span> ${f.naam}</li>`).join('');

  app.innerHTML = `
    <section class="scherm smal">
      <p class="label">Zo werkt het</p>
      <h1 data-focus>Spelregels</h1>

      <div class="kaart">
        <h2>🎯 Doel</h2>
        <p>Kom zo goed mogelijk door je leven, met <strong>genoeg geld</strong> én een <strong>goede gezondheid</strong>. Je speelt één leven, van 18 tot 80 jaar.</p>
      </div>

      <div class="kaart">
        <h2>🗓️ 7 levensfasen</h2>
        <ol class="fasenlijst">${fasen}</ol>
        <p>In elke fase doe je drie dingen:</p>
        <ol class="stappen">
          <li><strong>Kies je verzekering.</strong> Hoeveel eigen risico neem je? Wil je een aanvullende verzekering? Vraag je zorgtoeslag aan?</li>
          <li><strong>Trek 2 gebeurteniskaarten.</strong> Een griepje, een gebroken been, een nieuwe heup… Hoe ouder je wordt, hoe groter de kans op dure zorg.</li>
          <li><strong>Maak 1 keuze bij een dilemma.</strong> Er is niet altijd een goed of fout antwoord.</li>
        </ol>
      </div>

      <div class="kaart">
        <h2>📊 Twee meters</h2>
        <div class="meteruitleg">
          <div>
            <h3>👛 Portemonnee (€)</h3>
            <p>Je geld. Je krijgt inkomen, maar je betaalt ook vaste lasten, premie en zorg.</p>
          </div>
          <div>
            <h3>❤️ Gezondheid (0–100)</h3>
            <p>Hoe gezond je bent. Ziek worden en ouder worden kost gezondheid. Goede keuzes helpen.</p>
          </div>
        </div>
      </div>

      <div class="kaart kaart--waarschuwing">
        <h2>💀 Wanneer verlies je?</h2>
        <ul>
          <li>Als je gezondheid op <strong>0</strong> komt.</li>
          <li>Als je diep in de schulden raakt: onder <strong class="mono">${euro(SCHULDGRENS)}</strong>.</li>
        </ul>
      </div>

      <div class="kaart">
        <h2>📖 Moeilijke woorden</h2>
        <dl class="woorden">
          <dt>Premie</dt><dd>Wat je elke maand betaalt voor je zorgverzekering. Gemiddeld ${euro(PREMIE_BASIS_PER_MAAND)} per maand.</dd>
          <dt>Eigen risico</dt><dd>Het deel van je zorgkosten dat je eerst zelf betaalt, maximaal ${euro(EIGEN_RISICO_VERPLICHT)} per jaar. De huisarts valt hier niet onder.</dd>
          <dt>Vrijwillig eigen risico</dt><dd>Je kiest zelf een hoger eigen risico (tot ${euro(500)} extra). Dan betaal je minder premie.</dd>
          <dt>Aanvullende verzekering</dt><dd>Een extra verzekering, bijvoorbeeld voor de tandarts en fysio. In deze game: tot ${euro(AANVULLEND.maxVergoedingPerJaar)} per jaar.</dd>
          <dt>Zorgtoeslag</dt><dd>Geld van de overheid als je weinig verdient, zodat je de premie kunt betalen.</dd>
        </dl>
      </div>

      <div class="kaart kaart--accent">
        <h2>🧾 Aan het eind: De Rekening</h2>
        <p>Je ziet hoeveel jij in je hele leven betaalde, en wat je zorg écht kostte. Het verschil laat zien <strong>wie voor wie betaalde</strong>. Daarna zie je hetzelfde leven in twee andere werelden.</p>
        <p class="klein">⏱️ Speelduur: ongeveer 5 minuten.</p>
      </div>

      <div class="knoppen knoppen--midden">
        <button type="button" class="knop knop--groot" data-ga="karakterkeuze" data-volgende>Kies je karakter →</button>
        <button type="button" class="knop knop--licht" data-ga="start">Terug</button>
      </div>
    </section>
  `;
}

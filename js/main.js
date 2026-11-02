/*
 * Start van de game: schermen aanmelden, kop met geluidsknop, toetsenbord.
 * Schermvolgorde: start → spelregels → karakterkeuze → spel → De Rekening → Wat als…? → bronnen
 */

import { registreer, koppel, ga } from './router.js';
import { geluidAan, zetGeluid } from './sound.js';
import * as start from './screens/start.js';
import * as spelregels from './screens/spelregels.js';
import * as karakterkeuze from './screens/karakterkeuze.js';
import * as game from './screens/game.js';
import * as rekening from './screens/rekening.js';
import * as watals from './screens/watals.js';
import * as bronnen from './screens/bronnen.js';

registreer('start', start.render);
registreer('spelregels', spelregels.render);
registreer('karakterkeuze', karakterkeuze.render);
registreer('spel', game.render);
registreer('rekening', rekening.render);
registreer('watals', watals.render);
registreer('bronnen', bronnen.render);

const app = document.getElementById('app');
koppel(app);

/* --- Kop: logo (naar start) en geluid aan/uit ------------------------------ */

document.getElementById('logo').addEventListener('click', () => ga('start'));

const geluidKnop = document.getElementById('geluid');
function toonGeluid() {
  const aan = geluidAan();
  geluidKnop.setAttribute('aria-pressed', String(aan));
  geluidKnop.querySelector('.geluid__icoon').textContent = aan ? '🔊' : '🔇';
  geluidKnop.querySelector('.geluid__tekst').textContent = aan ? 'Geluid aan' : 'Geluid uit';
}
geluidKnop.addEventListener('click', () => {
  zetGeluid(!geluidAan());
  toonGeluid();
});
toonGeluid();

/* --- Knoppen met data-ga="scherm" wisselen van scherm ---------------------- */

app.addEventListener('click', (e) => {
  const knop = e.target.closest('[data-ga]');
  if (knop && app.contains(knop)) ga(knop.dataset.ga);
});

/* --- Toetsenbord: Enter of spatie = "Volgende" ----------------------------- */

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  // Knoppen, links en invoervelden regelen Enter/spatie zelf.
  if (e.target.closest('button, a, input, select, textarea, label, summary, [role="button"]')) return;
  const volgende = app.querySelector('[data-volgende]:not([disabled])');
  if (volgende) {
    e.preventDefault();
    volgende.click();
  }
});

ga('start');

// Balans testen: open de game met ?debug en kijk in de console.
if (new URLSearchParams(window.location.search).has('debug')) import('./debug.js');

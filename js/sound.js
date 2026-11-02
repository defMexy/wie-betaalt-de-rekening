/*
 * Optioneel kassageluid ("ka-ching"), gemaakt met de Web Audio API (geen geluidsbestand nodig).
 * Standaard uit; de speler zet het aan met de knop rechtsboven.
 */

import { instellingen, zetInstelling } from './storage.js';

let audio = null;

export const geluidAan = () => instellingen().geluid;

export function zetGeluid(aan) {
  zetInstelling('geluid', aan);
  if (aan) speelKassa();
}

function toon(freq, start, duur, volume, type = 'triangle') {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duur);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duur + 0.05);
}

export function speelKassa() {
  if (!geluidAan()) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const nu = audio.currentTime;
    // "ka": korte tik van de la
    toon(180, nu, 0.06, 0.15, 'square');
    // "ching": twee heldere belletjes
    toon(1319, nu + 0.07, 0.5, 0.12);
    toon(1760, nu + 0.12, 0.6, 0.1);
  } catch {
    // Geen geluid mogelijk: niet erg, het spel werkt gewoon.
  }
}

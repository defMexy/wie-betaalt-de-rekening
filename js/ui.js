/*
 * Kleine hulpfuncties voor de schermen: bedragen opmaken, animaties, meldingen.
 * Let op: geen DOM-code bovenin dit bestand (data/dilemmas.js gebruikt euro() ook in Node).
 */

// €1.234 / −€385 / +€1.234 (met plus: true)
export function euro(bedrag, { plus = false } = {}) {
  const n = Math.round(bedrag);
  const tekst = '€' + Math.abs(n).toLocaleString('nl-NL');
  if (n < 0) return '−' + tekst;
  if (plus && n > 0) return '+' + tekst;
  return tekst;
}

// Tekst veilig in HTML zetten.
export function esc(tekst) {
  return String(tekst)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function minderBeweging() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export const wacht = (ms) => new Promise((klaar) => setTimeout(klaar, minderBeweging() ? 0 : ms));

// Laat een getal soepel optellen van "van" naar "naar".
export function telOp(el, naar, { van = 0, duur = 1200, opmaak = euro } = {}) {
  if (!el) return Promise.resolve();
  const id = (el._telOpId = (el._telOpId || 0) + 1); // een nieuwe animatie stopt de vorige
  if (minderBeweging() || duur <= 0 || van === naar) {
    el.textContent = opmaak(naar);
    return Promise.resolve();
  }
  return new Promise((klaar) => {
    const start = performance.now();
    const stap = (nu) => {
      if (el._telOpId !== id) return klaar();
      const t = Math.min(1, (nu - start) / duur);
      const zacht = 1 - Math.pow(1 - t, 3);
      el.textContent = opmaak(van + (naar - van) * zacht);
      if (t < 1) requestAnimationFrame(stap);
      else klaar();
    };
    requestAnimationFrame(stap);
  });
}

// Zwevend "+€500" / "−3" label bij een meter (groen = erbij, rood = eraf).
export function toonVerschil(anker, verschil, { opmaak = euro, goedIsPlus = true } = {}) {
  if (!anker || !verschil) return;
  const goed = goedIsPlus ? verschil > 0 : verschil < 0;
  const label = document.createElement('span');
  label.className = `zweef ${goed ? 'zweef--plus' : 'zweef--min'}`;
  label.textContent = verschil > 0 ? '+' + opmaak(verschil) : opmaak(verschil);
  label.setAttribute('aria-hidden', 'true');
  anker.appendChild(label);
  anker.classList.remove('flits-plus', 'flits-min');
  void anker.offsetWidth; // animatie opnieuw starten
  anker.classList.add(goed ? 'flits-plus' : 'flits-min');
  setTimeout(() => label.remove(), 1800);
}

// Korte melding rechtsboven (bijv. "Inkomen +€12.000").
export function melding(regels, { duur = 4200 } = {}) {
  const bak = document.getElementById('meldingen');
  if (!bak) return;
  const el = document.createElement('div');
  el.className = 'melding';
  el.innerHTML = regels
    .map((r) => `<div class="melding__regel"><span>${esc(r.label)}</span><span class="mono ${r.bedrag >= 0 ? 'plus' : 'min'}">${euro(r.bedrag, { plus: true })}</span></div>`)
    .join('');
  bak.appendChild(el);
  setTimeout(() => {
    el.classList.add('melding--weg');
    setTimeout(() => el.remove(), 400);
  }, duur);
}

// Stippellijn-regel op een bonnetje: "Huisarts ........ €40"
export function bonRegel(label, bedrag, { klasse = '', sub = '', opmaak } = {}) {
  const waarde = opmaak ? opmaak(bedrag) : euro(bedrag);
  return `<div class="bon-regel ${klasse}">
    <span class="bon-regel__label">${label}${sub ? `<small>${sub}</small>` : ''}</span>
    <span class="bon-regel__punt" aria-hidden="true"></span>
    <span class="bon-regel__bedrag mono">${waarde}</span>
  </div>`;
}

/*
 * Simpele schermmanager: elk scherm is een functie die HTML in #app zet.
 *   registreer('start', render)  -> scherm aanmelden
 *   ga('start')                  -> naar een scherm wisselen
 */

const schermen = new Map();
let app = null;

export function registreer(naam, render) {
  schermen.set(naam, render);
}

export function koppel(element) {
  app = element;
}

export function ga(naam, params = {}) {
  const render = schermen.get(naam);
  if (!render || !app) {
    console.error(`Scherm "${naam}" bestaat niet.`);
    return;
  }
  app.dataset.scherm = naam;
  app.innerHTML = '';
  window.scrollTo({ top: 0 });
  render(app, params);
  focusOpScherm();
}

// Zet de focus op de kop van het nieuwe scherm (fijn voor toetsenbord en schermlezer).
export function focusOpScherm(binnen = app) {
  const doel = binnen?.querySelector('[data-focus]') || binnen?.querySelector('h1, h2');
  if (!doel) return;
  doel.setAttribute('tabindex', '-1');
  doel.focus({ preventScroll: true });
}

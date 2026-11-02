/*
 * ============================================================================
 *  CONFIG – alle bedragen en feiten op één plek
 * ============================================================================
 *
 *  ⚠️  Alle bedragen controleren voor inleveren; deze game gebruikt
 *      afgeronde/indicatieve bedragen.
 *
 *  Peiljaar: 2026. Waar "CONTROLEREN" staat, is het bedrag een schatting die
 *  je vóór het inleveren moet nakijken bij de genoemde bron.
 * ============================================================================
 */

export const PEILJAAR = 2026;

/* ---------------------------------------------------------------------------
 * Basisverzekering
 * ------------------------------------------------------------------------- */

// Gemiddelde premie basisverzekering 2026, per maand.
// Bron: zorgwijzer.nl
export const PREMIE_BASIS_PER_MAAND = 159;

// Verplicht eigen risico 2026, per jaar.
// Bron: rijksoverheid.nl
export const EIGEN_RISICO_VERPLICHT = 385;

// Vrijwillig eigen risico: bedrag dat je EXTRA bovenop het verplichte eigen risico kiest.
// Bron: rijksoverheid.nl (maximaal €500 extra)
export const VRIJWILLIG_OPTIES = [0, 250, 500];

// Premiekorting per maand bij vrijwillig eigen risico.
// Indicatief, verschilt per verzekeraar.
export const VRIJWILLIG_KORTING_PER_MAAND = { 0: 0, 250: 10, 500: 20 };

// De huisarts valt NIET onder het eigen risico.
// Bron: rijksoverheid.nl
export const HUISARTS_ONDER_EIGEN_RISICO = false;

// Jongeren onder de 18 betalen geen premie (en hebben geen eigen risico).
// Bron: rijksoverheid.nl
export const PREMIEVRIJ_TOT_LEEFTIJD = 18;

// Verzekeringsplicht vanaf 18 jaar. Wie niet verzekerd is, krijgt een boete van het CAK.
// Bron: rijksoverheid.nl
export const VERZEKERINGSPLICHT_VANAF = 18;

// Boete van het CAK als je onverzekerd bent: ongeveer 3x de gemiddelde maandpremie.
// CONTROLEREN op rijksoverheid.nl / hetcak.nl
export const CAK_BOETE = 3 * PREMIE_BASIS_PER_MAAND;

/* ---------------------------------------------------------------------------
 * Aanvullende verzekering
 * ------------------------------------------------------------------------- */

// Indicatief: een simpel aanvullend pakket voor tandarts en fysio.
export const AANVULLEND = {
  premiePerMaand: 25,          // indicatief
  maxVergoedingPerJaar: 500,   // indicatief: tandarts + fysio samen
};

/* ---------------------------------------------------------------------------
 * Zorgtoeslag (alleenstaande)
 * ------------------------------------------------------------------------- */

// Vereenvoudigd: tot "volledigTotInkomen" krijg je het maximum, daarna loopt het
// rechtlijnig af tot €0 bij "grensInkomen".
// Maximale zorgtoeslag alleenstaande ~€130 per maand: CONTROLEREN op toeslagen.nl
// Inkomensgrenzen: CONTROLEREN op toeslagen.nl
export const ZORGTOESLAG = {
  maxPerMaand: 130,
  volledigTotInkomen: 26000,
  grensInkomen: 40000,
};

/* ---------------------------------------------------------------------------
 * Soorten zorg: wie betaalt wat?
 * ------------------------------------------------------------------------- */

// vergoeding:  'basis'      = basisverzekering betaalt (eventueel na eigen risico)
//              'aanvullend' = alleen vergoed met aanvullende verzekering (tot het maximum)
//              'geen'       = altijd zelf betalen
// eigenRisico: telt deze zorg mee voor het eigen risico?
export const ZORGTYPES = {
  huisarts:    { label: 'Huisarts',          vergoeding: 'basis',      eigenRisico: HUISARTS_ONDER_EIGEN_RISICO },
  basis:       { label: 'Basisverzekering',  vergoeding: 'basis',      eigenRisico: true },
  verloskunde: { label: 'Verloskundige',     vergoeding: 'basis',      eigenRisico: false }, // bron: rijksoverheid.nl
  tandarts:    { label: 'Tandarts',          vergoeding: 'aanvullend', eigenRisico: false }, // volwassenen: niet in basis
  fysio:       { label: 'Fysiotherapie',     vergoeding: 'aanvullend', eigenRisico: false }, // volwassenen: meestal niet in basis
  zelf:        { label: 'Eigen bijdrage',    vergoeding: 'geen',       eigenRisico: false },
};

// Budgetpolis (via een dilemma): bij dure ziekenhuiszorg zonder contract betaal je een deel zelf.
// Indicatief.
export const BUDGETPOLIS = {
  vanafKosten: 2000,   // geldt voor zorgposten vanaf dit bedrag
  eigenDeel: 0.15,     // 15% van wat de verzekeraar anders zou betalen
  maxEigenDeel: 1000,  // maximaal per zorgpost
};

/* ---------------------------------------------------------------------------
 * Levensfasen
 * ------------------------------------------------------------------------- */

// leeftijdsRisico: hoe groot de kans op dure zorg is (vermenigvuldiger voor de kaarten).
// veroudering:     gezondheid die je in deze fase verliest door ouder worden.
// vasteLasten:     deel van je inkomen dat opgaat aan wonen, eten, belasting enz.
//                  Vereenvoudiging: wat overblijft is je ruimte voor zorg en sparen.
//                  Studenten wonen goedkoper, dus houden ze relatief iets meer over.
export const FASEN = [
  { van: 18, tot: 25, naam: 'Student & starter',   leeftijdsRisico: 0.6, veroudering: 0,  vasteLasten: 0.88 },
  { van: 25, tot: 35, naam: 'Aan het werk',        leeftijdsRisico: 0.8, veroudering: 0,  vasteLasten: 0.93 },
  { van: 35, tot: 45, naam: 'Druk, druk, druk',    leeftijdsRisico: 1.0, veroudering: -1, vasteLasten: 0.93 },
  { van: 45, tot: 55, naam: 'Middenin het leven',  leeftijdsRisico: 1.3, veroudering: -2, vasteLasten: 0.93 },
  { van: 55, tot: 65, naam: 'Bijna pensioen',      leeftijdsRisico: 1.7, veroudering: -3, vasteLasten: 0.93 },
  { van: 65, tot: 75, naam: 'Met pensioen',        leeftijdsRisico: 2.2, veroudering: -4, vasteLasten: 0.92 },
  { van: 75, tot: 80, naam: 'Oud en wijs',         leeftijdsRisico: 2.6, veroudering: -4, vasteLasten: 0.92 },
];

// Kaarten met totale kosten vanaf dit bedrag tellen als "dure zorg":
// hun kans stijgt met leeftijd en met de risicofactor van het karakter.
export const DURE_ZORG_VANAF = 1000;

/* ---------------------------------------------------------------------------
 * Geld & spelregels
 * ------------------------------------------------------------------------- */

// Je verliest als je gezondheid op 0 komt of als je dieper in de schulden zit dan dit.
export const SCHULDGRENS = -5000;
export const GEZONDHEID_MAX = 100;

/* ---------------------------------------------------------------------------
 * "Wat als…?" – twee andere werelden (indicatief, om te vergelijken)
 * ------------------------------------------------------------------------- */

export const WAT_ALS = {
  iederVoorZich: {
    // Premie = basispremie × leeftijdsfactor × risicofactor karakter (× chronischFactor als je chronisch ziek bent)
    // Leeftijdsfactoren per levensfase, indicatief. Over een heel leven gemiddeld ongeveer 1.
    leeftijdsFactor: [0.35, 0.45, 0.6, 0.85, 1.2, 1.7, 2.3],
    chronischFactor: 3,                                      // indicatief
    eigenRisico: EIGEN_RISICO_VERPLICHT,
  },
  overheid: {
    // Alle zorg gratis, betaald uit belasting: een percentage van je inkomen boven een vrije voet.
    belastingPercentage: 0.07,     // indicatief
    vrijeVoet: 15000,              // over het eerste deel van je inkomen betaal je niks, indicatief
    wachtMaandenPerBehandeling: 3, // extra wachttijd per ziekenhuisbehandeling, indicatief
    behandelingVanaf: 1000,        // telt als "behandeling met wachtlijst" vanaf dit bedrag
  },
};

/* ---------------------------------------------------------------------------
 * Bronnen (voeg hier gerust meer toe)
 * ------------------------------------------------------------------------- */

export const BRONNEN = [
  {
    naam: 'Rijksoverheid – Zorgverzekering',
    url: 'https://www.rijksoverheid.nl/onderwerpen/zorgverzekering',
    gebruikt: 'Verzekeringsplicht, eigen risico, huisarts, acceptatieplicht.',
  },
  {
    naam: 'Zorgwijzer – Zorgverzekering 2027',
    url: 'https://www.zorgwijzer.nl/zorgverzekering-2027',
    gebruikt: 'Gemiddelde premie, vrijwillig eigen risico, aanvullende verzekering.',
  },
  {
    naam: 'Kassa (BNNVARA) – eigen risico en premie',
    url: 'https://www.bnnvara.nl/kassa/artikelen/lager-eigen-risico-zorgpremie-stijgt-in-2027-naar-200-euro-per-maand',
    gebruikt: 'Discussie over een lager eigen risico en een hogere premie.',
  },
  {
    naam: 'Belastingdienst – Toeslagen (zorgtoeslag)',
    url: 'https://www.belastingdienst.nl/toeslagen',
    gebruikt: 'Zorgtoeslag: hoogte, inkomensgrens, aanvragen.',
  },
];

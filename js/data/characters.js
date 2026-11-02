/*
 * De drie speelbare karakters.
 *
 * inkomen:      bruto jaarinkomen per levensfase (18-25, 25-35, 35-45, 45-55, 55-65, 65-75, 75-80).
 *               Bepaalt hoeveel geld je overhoudt én of je recht hebt op zorgtoeslag.
 * risicofactor: vermenigvuldiger voor de kans op dure gebeurtenissen (1 = gemiddeld).
 * chronisch:    vaste jaarlijkse zorgkosten die vanaf een bepaalde leeftijd beginnen.
 */

export const KARAKTERS = [
  {
    id: 'sem',
    naam: 'Sem',
    avatar: '⚽',
    kort: 'Sportief & gezond',
    bio: 'Je sport veel en bent bijna nooit ziek. Je studeert en werkt in de supermarkt. Na je 25e verdien je een gemiddeld inkomen.',
    risicoLabel: 'Laag risico',
    risiconiveau: 1,
    startgeld: 1000,
    startGezondheid: 95,
    risicofactor: 0.6,
    inkomen: [14000, 40000, 46000, 48000, 48000, 26000, 25000],
    chronisch: null,
  },
  {
    id: 'lisa',
    naam: 'Lisa',
    avatar: '💼',
    kort: 'Gemiddeld gezond',
    bio: 'Je bent gemiddeld gezond. Je doet een mbo-opleiding en krijgt daarna een vaste baan als doktersassistent.',
    risicoLabel: 'Gemiddeld risico',
    risiconiveau: 2,
    startgeld: 1500,
    startGezondheid: 85,
    risicofactor: 1.0,
    inkomen: [21000, 34000, 37000, 38000, 38000, 23000, 22000],
    chronisch: null,
  },
  {
    id: 'daan',
    naam: 'Daan',
    avatar: '🎨',
    kort: 'Chronisch ziek vanaf 25',
    bio: 'Je bent creatief en studeert grafisch ontwerp. Op je 25e hoor je dat je reuma hebt. Vanaf dan heb je elk jaar vaste zorgkosten en werk je parttime.',
    risicoLabel: 'Hoog risico',
    risiconiveau: 3,
    startgeld: 1000,
    startGezondheid: 92,
    risicofactor: 1.3,
    inkomen: [14000, 28000, 29000, 29000, 28000, 20000, 20000],
    chronisch: {
      id: 'reuma',
      naam: 'Reuma',
      emoji: '🩺',
      vanafLeeftijd: 25,
      kostenPerJaar: 5000,        // indicatief: medicijnen, reumatoloog, controles
      type: 'basis',
      omschrijving: 'Reuma: medicijnen & reumatoloog',
      gezondheidBijDiagnose: -8,
      gezondheidPerFase: -1,      // extra gezondheidsverlies per fase door de ziekte
      tekst: 'Je gewrichten doen al maanden pijn. De reumatoloog vertelt dat je reuma hebt: een chronische ziekte. Je hebt vanaf nu elk jaar medicijnen en controles nodig.',
      wistJeDat: 'Ruim de helft van de Nederlanders heeft één of meer chronische aandoeningen. Een verzekeraar mag je daarom niet weigeren voor de basisverzekering: dat heet de acceptatieplicht.',
    },
  },
];

export function vindKarakter(id) {
  return KARAKTERS.find((k) => k.id === id) || null;
}

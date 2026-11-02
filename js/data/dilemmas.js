/*
 * Dilemmakaarten: een echte keuze, met "Wie profiteert / wie betaalt?" erna.
 *
 * situatie:     tekst, of een functie (ctx) => tekst voor bedragen die afhangen van het potje
 * voorwaarde:   (optioneel) (state, ctx) => true/false; alleen trekken als dit klopt
 * keuzes[].gevolg (of een functie (ctx) => gevolg):
 *   geld        bedrag erbij (+) of eraf (-), géén zorgkosten (bijv. boete, sportschool)
 *   toeslag     zorgtoeslag die je (alsnog) krijgt
 *   zorg        zorgposten, net als bij gebeurtenissen; met dekking: 'geen' telt de aanvullende verzekering niet mee
 *   gezondheid  effect op de gezondheidsmeter
 *   premieBasis / premieAanvullend   blijvende premieverandering per maand (vanaf de volgende fase)
 *   vlaggen     blijvende veranderingen, bijv. { budgetpolis: true }
 *   later       id van een gebeurtenis die in de volgende fase sowieso komt
 * ctx = { state, leeftijd, eigenRisicoRuimte, toeslagPerJaar }
 *
 * Alle bedragen zijn indicatief.
 */

import { CAK_BOETE, EIGEN_RISICO_VERPLICHT, PREMIE_BASIS_PER_MAAND } from '../config.js';
import { euro } from '../ui.js';

export const DILEMMAS = [
  {
    id: 'zorgmijden',
    titel: 'Wel of niet naar het ziekenhuis?',
    emoji: '🤔',
    minLeeftijd: 25, maxLeeftijd: 70,
    situatie: (ctx) =>
      `Je hebt al weken pijn in je rug. De huisarts wil je doorsturen naar het ziekenhuis voor onderzoek. ` +
      (ctx.eigenRisicoRuimte > 0
        ? `Dat gaat van je eigen risico af: het kost jou tot ${euro(Math.min(900, ctx.eigenRisicoRuimte))}. Ga je?`
        : `Je eigen risico is dit jaar al op, dus het kost jou niks extra. Ga je?`),
    keuzes: [
      {
        label: 'Ja, ik ga',
        gevolg: { zorg: [{ wat: 'Onderzoek & behandeling ziekenhuis', kosten: 900, type: 'basis' }], gezondheid: 4 },
        uitkomst: 'Ze vinden het probleem op tijd. Na een paar weken gaat het een stuk beter.',
      },
      {
        label: 'Nee, ik wacht af',
        gevolg: { gezondheid: -10, later: 'rughernia' },
        uitkomst: 'Je bespaart nu geld. Maar de pijn gaat niet weg... Dit komt later terug.',
      },
    ],
    wieProfiteert:
      'Zorg mijden lijkt slim voor je portemonnee, maar jij betaalt met je gezondheid. En de verzekeraar (dus iedereen) betaalt later vaak een duurdere behandeling. Onderzoek laat zien dat vooral mensen met weinig geld soms zorg mijden vanwege het eigen risico.',
    wistJeDat: 'Bij veel verzekeraars kun je je eigen risico in termijnen betalen.',
  },
  {
    id: 'opzeggen',
    titel: '"Zeg je verzekering toch op!"',
    emoji: '🙄',
    minLeeftijd: 18, maxLeeftijd: 30,
    situatie: `Een vriend zegt: "Jij bent jong en gezond. Waarom betaal je elke maand ${euro(PREMIE_BASIS_PER_MAAND)}? Zeg je verzekering gewoon op!"`,
    keuzes: [
      {
        label: 'Goed idee, opzeggen!',
        gevolg: { geld: -CAK_BOETE },
        uitkomst: `Dat kan niet zomaar. In Nederland is een basisverzekering verplicht vanaf 18 jaar. Je krijgt een brief van het CAK en daarna een boete van ${euro(CAK_BOETE)}. Blijf je onverzekerd, dan volgt nog een boete en sluit het CAK zelf een verzekering voor je af. De premie houden ze dan in op je loon.`,
      },
      {
        label: 'Nee, ik blijf verzekerd',
        gevolg: {},
        uitkomst: 'Slim. Een basisverzekering is in Nederland verplicht vanaf 18 jaar.',
      },
    ],
    wieProfiteert:
      'De verzekeringsplicht bestaat zodat ook jonge, gezonde mensen meebetalen. Als alleen zieke mensen verzekerd zouden zijn, wordt de premie voor hen onbetaalbaar. Jij betaalt nu mee voor anderen; later betalen jongeren mee voor jou.',
    wistJeDat: 'Wie onverzekerd is, krijgt eerst een brief en daarna boetes van het CAK.',
  },
  {
    id: 'stappen-app',
    titel: 'Korting voor je stappen',
    emoji: '📱',
    minLeeftijd: 18, maxLeeftijd: 60,
    voorwaarde: (state) => state.keuze.aanvullend,
    situatie:
      'Je verzekeraar biedt €5 per maand korting op je aanvullende verzekering als je een app installeert die je stappen en je slaap bijhoudt. Doe je mee?',
    keuzes: [
      {
        label: 'Ja, korting!',
        gevolg: { premieAanvullend: -5, gezondheid: 2 },
        uitkomst: 'Je loopt meer en je krijgt korting. Maar je verzekeraar weet nu ook veel over jou.',
      },
      {
        label: 'Nee, mijn data is van mij',
        gevolg: {},
        uitkomst: 'Je houdt je gegevens voor jezelf, maar mist de korting.',
      },
    ],
    wieProfiteert:
      'Gezonde, sportieve mensen profiteren van zulke kortingen. Mensen die ziek zijn of niet kunnen sporten krijgen ze niet. Als steeds meer mensen korting krijgen voor gezond gedrag, betalen zieke mensen eigenlijk meer. Botst dat met solidariteit?',
    wistJeDat:
      'Voor de basisverzekering mag een verzekeraar geen korting geven voor gezond gedrag: iedereen met dezelfde polis betaalt dezelfde premie. Bij aanvullende verzekeringen mag het wel.',
  },
  {
    id: 'budgetpolis',
    titel: 'De premie stijgt',
    emoji: '📈',
    minLeeftijd: 25, maxLeeftijd: 80,
    situatie:
      'Door de vergrijzing en duurdere zorg stijgt je premie met €10 per maand. Je kunt overstappen naar een budgetpolis: €15 per maand goedkoper. Maar die verzekeraar heeft met minder ziekenhuizen een contract.',
    keuzes: [
      {
        label: 'Ik blijf en betaal meer',
        gevolg: { premieBasis: 10 },
        uitkomst: 'Je premie gaat vanaf de volgende fase €10 per maand omhoog. Je mag wel naar elk ziekenhuis.',
      },
      {
        label: 'Overstappen naar budgetpolis',
        gevolg: { premieBasis: 10 - 15, vlaggen: { budgetpolis: true } },
        uitkomst: 'Je betaalt vanaf de volgende fase €5 per maand minder. Maar ga je naar een ziekenhuis zonder contract, dan betaal je een deel zelf.',
      },
    ],
    wieProfiteert:
      'Door de vergrijzing stijgen de zorgkosten, en iedereen betaalt mee: solidariteit tussen jong en oud. Met een budgetpolis betaal je minder, maar je hebt minder keuze. Verzekeraars besparen geld door scherp in te kopen bij ziekenhuizen.',
    wistJeDat:
      'Je kunt elk jaar overstappen. Opzeggen moet vóór 1 januari; een nieuwe verzekering afsluiten kan tot 1 februari.',
  },
  {
    id: 'eigen-risico-stemming',
    titel: 'Stemming: eigen risico afschaffen?',
    emoji: '🗳️',
    minLeeftijd: 18, maxLeeftijd: 80,
    situatie:
      `Er komt een landelijke stemming: moet het eigen risico worden afgeschaft? Dan hoeft niemand meer ${euro(EIGEN_RISICO_VERPLICHT)} per jaar zelf te betalen. Maar de premie gaat voor iedereen €25 per maand omhoog. Jouw stem beslist!`,
    keuzes: [
      {
        label: 'Voor: afschaffen!',
        gevolg: { premieBasis: 25, vlaggen: { eigenRisicoAfgeschaft: true } },
        uitkomst: 'Het eigen risico wordt afgeschaft vanaf de volgende fase. Iedereen betaalt vanaf dan €25 per maand meer premie.',
      },
      {
        label: 'Tegen',
        gevolg: {},
        uitkomst: 'Het eigen risico blijft. De premie blijft gelijk.',
      },
    ],
    wieProfiteert:
      'Zonder eigen risico profiteren mensen die veel zorg nodig hebben, zoals ouderen en chronisch zieken. Gezonde mensen betalen dan meer premie, ook als ze geen zorg gebruiken. Een eigen risico laat mensen nadenken voordat ze zorg gebruiken, maar het kan ook leiden tot zorg mijden.',
    wistJeDat:
      'Over de hoogte van het eigen risico wordt in de politiek veel gediscussieerd. Kijk voor de laatste plannen op rijksoverheid.nl.',
  },
  {
    id: 'buitenland',
    titel: 'Wachtlijst of buitenland?',
    emoji: '✈️',
    minLeeftijd: 35, maxLeeftijd: 80,
    situatie:
      'Je hebt een knieoperatie nodig. In Nederland is de wachtlijst 6 maanden. Een kliniek in Duitsland kan je over 2 weken helpen. Je verzekeraar betaalt de operatie, maar de reis en het hotel betaal je zelf (€300).',
    keuzes: [
      {
        label: 'Naar Duitsland',
        gevolg: { zorg: [{ wat: 'Knieoperatie (Duitsland)', kosten: 6000, type: 'basis' }], geld: -300, gezondheid: 4 },
        uitkomst: 'Je bent snel geholpen en loopt binnen een paar maanden weer goed. De reis kostte je €300.',
      },
      {
        label: 'Ik wacht hier',
        gevolg: { zorg: [{ wat: 'Knieoperatie (Nederland)', kosten: 6000, type: 'basis' }], gezondheid: -8 },
        uitkomst: 'Je hebt een half jaar veel pijn en kunt minder doen. Daarna word je geopereerd.',
      },
    ],
    wieProfiteert:
      'Wie geld en tijd heeft om te reizen, wordt sneller geholpen. Wie dat niet kan, wacht langer. Wachtlijsten ontstaan doordat er te weinig zorgpersoneel is en steeds meer mensen zorg nodig hebben. Is het eerlijk dat geld bepaalt hoe snel je geholpen wordt?',
    wistJeDat: 'Je kunt je zorgverzekeraar vragen om je te helpen een plek met een kortere wachttijd te vinden (wachtlijstbemiddeling).',
  },
  {
    id: 'roker',
    titel: 'Moet de roker meer betalen?',
    emoji: '🚬',
    minLeeftijd: 25, maxLeeftijd: 80,
    situatie:
      'Je buurman rookt al 40 jaar. Nu heeft hij longkanker. Zijn behandeling kost meer dan €100.000. Hij betaalt dezelfde premie als jij. Vind jij dat hij meer premie zou moeten betalen?',
    keuzes: [
      {
        label: 'Ja, hij koos er zelf voor',
        gevolg: {},
        uitkomst: 'Veel mensen denken er zo over. Maar waar leg je de grens?',
      },
      {
        label: 'Nee, iedereen gelijk',
        gevolg: {},
        uitkomst: 'Zo werkt het nu in Nederland: iedereen betaalt dezelfde premie voor dezelfde polis.',
      },
    ],
    wieProfiteert:
      'Een verzekeraar mag niemand weigeren voor de basisverzekering (acceptatieplicht) en moet iedereen voor dezelfde polis dezelfde premie laten betalen. Maar waar trek je de grens? Iemand die veel suiker eet, op de motor rijdt of gaat skiën, neemt ook risico\'s. Bijna iedereen doet wel iets ongezonds.',
    wistJeDat: 'Rokers betalen al extra belasting (accijns) op tabak. Dat geld gaat naar de schatkist, niet rechtstreeks naar de zorg.',
  },
  {
    id: 'toeslag-vergeten',
    titel: 'Zorgtoeslag laten liggen?',
    emoji: '📬',
    minLeeftijd: 18, maxLeeftijd: 80,
    voorwaarde: (state, ctx) => !state.keuze.toeslag && ctx.toeslagPerJaar > 0,
    situatie: (ctx) =>
      `Je hebt geen zorgtoeslag aangevraagd, maar met jouw inkomen heb je er wel recht op: ${euro(ctx.toeslagPerJaar)} per jaar! Over het vorige jaar kun je het nog aanvragen, tot 1 september. Ga je het regelen?`,
    keuzes: [
      {
        label: 'Ja, ik regel het',
        gevolg: (ctx) => ({ toeslag: ctx.toeslagPerJaar }),
        uitkomst: 'Een half uurtje werk via Mijn toeslagen, en je krijgt het geld alsnog.',
      },
      {
        label: 'Nee, te veel gedoe',
        gevolg: {},
        uitkomst: 'Je laat dit geld liggen.',
      },
    ],
    wieProfiteert:
      'Zorgtoeslag wordt betaald uit belastinggeld. Het is bedoeld zodat mensen met een laag inkomen de premie kunnen betalen. Toch vraagt niet iedereen die er recht op heeft het aan. Door ingewikkelde regels lopen juist de mensen die het nodig hebben het geld soms mis.',
    wistJeDat: 'Zorgtoeslag kun je aanvragen tot 1 september van het jaar erna.',
  },
  {
    id: 'oma',
    titel: 'De zorg van oma',
    emoji: '👵',
    minLeeftijd: 18, maxLeeftijd: 45,
    situatie:
      'Je oma woont in een verpleeghuis en heeft elke dag veel zorg nodig. Dat wordt betaald door alle werkende mensen samen, dus ook door jou. Voelt dat eerlijk?',
    keuzes: [
      {
        label: 'Ja, zij heeft ook voor anderen betaald',
        gevolg: {},
        uitkomst: 'Zo werkt het systeem: elke generatie betaalt voor de ouderen van dat moment.',
      },
      {
        label: 'Nee, ik betaal voor mensen die ik niet ken',
        gevolg: {},
        uitkomst: 'Dat is ook een eerlijk gevoel. Maar zonder dit systeem zouden veel ouderen hun zorg niet kunnen betalen.',
      },
    ],
    wieProfiteert:
      'Jongeren betalen nu mee aan de zorg voor ouderen. Later, als jij oud bent, betalen de jongeren van dan voor jou. Dat werkt alleen als iedereen blijft meedoen. Door de vergrijzing komen er wel steeds meer ouderen per werkende.',
    wistJeDat:
      'Verpleeghuiszorg valt niet onder de zorgverzekering, maar onder de Wet langdurige zorg (Wlz). Die betaal je via een premie op je loon.',
  },
  {
    id: 'aanvullend-opzeggen',
    titel: 'Aanvullende verzekering opzeggen?',
    emoji: '🦷',
    minLeeftijd: 25, maxLeeftijd: 80,
    voorwaarde: (state) => state.keuze.aanvullend,
    situatie:
      'Geld is krap. Je wilt je aanvullende verzekering opzeggen (€25 per maand). Maar je tanden zijn niet zo goed, en de tandarts zegt dat er binnenkort een kroon nodig is (€900).',
    keuzes: [
      {
        label: 'Opzeggen en sparen',
        gevolg: { geld: 300, zorg: [{ wat: 'Kroon (niet verzekerd)', kosten: 900, type: 'tandarts', dekking: 'geen' }], gezondheid: -2 },
        uitkomst: 'Je spaart €300 aan premie. Maar de kroon betaal je nu helemaal zelf.',
      },
      {
        label: 'Toch houden',
        gevolg: { zorg: [{ wat: 'Kroon', kosten: 900, type: 'tandarts' }] },
        uitkomst: 'Je aanvullende verzekering betaalt een deel van de kroon.',
      },
    ],
    wieProfiteert:
      'Bij een aanvullende verzekering mag een verzekeraar je wél weigeren of vragen stellen over je gezondheid. Mensen met slechte tanden zijn dus duurder uit. Wie gezond is, profiteert van een lage premie.',
    wistJeDat: 'Voor de aanvullende verzekering geldt geen acceptatieplicht. Voor de basisverzekering wel.',
  },
  {
    id: 'mantelzorg',
    titel: 'Wie zorgt er voor je moeder?',
    emoji: '🤝',
    minLeeftijd: 40, maxLeeftijd: 65,
    situatie:
      'Je moeder wordt ouder en heeft hulp nodig bij het huishouden en de boodschappen. Ga je haar zelf helpen (mantelzorg), of regel je betaalde hulp?',
    keuzes: [
      {
        label: 'Ik help zelf',
        gevolg: { gezondheid: -6, geld: -500 },
        uitkomst: 'Je moeder is blij met je hulp. Maar het is zwaar naast je werk: je bent vaak moe en werkt wat minder uren.',
      },
      {
        label: 'Betaalde hulp regelen',
        gevolg: { geld: -1500 },
        uitkomst: 'Via de gemeente komt er hulp in huis. Je betaalt een eigen bijdrage en springt zelf af en toe bij.',
      },
    ],
    wieProfiteert:
      'Mantelzorgers betalen niet met geld, maar met tijd en energie. De samenleving bespaart veel geld doordat mensen voor elkaar zorgen. Maar mantelzorgers raken soms zelf overbelast.',
    wistJeDat:
      'Hulp in huis regel je via de gemeente (Wmo). Daarvoor betaal je een vaste, lage eigen bijdrage, hoeveel hulp je ook krijgt.',
  },
  {
    id: 'dure-behandeling',
    titel: 'Een heel dure behandeling',
    emoji: '💊',
    minLeeftijd: 65, maxLeeftijd: 80,
    situatie:
      'Je hebt een ernstige ziekte. Er is een nieuwe behandeling van €50.000. Je kans op herstel wordt een stuk groter. Het zit in het basispakket, dus de verzekering betaalt. Kies je ervoor?',
    keuzes: [
      {
        label: 'Ja, behandel me',
        gevolg: { zorg: [{ wat: 'Nieuwe behandeling', kosten: 50000, type: 'basis' }], gezondheid: 8 },
        uitkomst: 'De behandeling werkt goed. Je voelt je beter dan in jaren.',
      },
      {
        label: 'Nee, laat maar',
        gevolg: { gezondheid: -8 },
        uitkomst: 'Je kiest voor rust in plaats van een zware behandeling. Je ziekte gaat langzaam verder.',
      },
    ],
    wieProfiteert:
      'Iedereen betaalt via de premie mee aan dure behandelingen. Hoe meer dure medicijnen in het basispakket, hoe hoger de premie voor iedereen. Het Zorginstituut Nederland adviseert de minister wat in het basispakket komt. Daarbij kijken ze ook naar: hoeveel kost het per gewonnen gezond levensjaar?',
    wistJeDat: 'Het Zorginstituut Nederland adviseert welke zorg in het basispakket hoort.',
  },
  {
    id: 'sportschool',
    titel: 'Gezonder leven?',
    emoji: '🏋️',
    minLeeftijd: 25, maxLeeftijd: 60,
    situatie:
      'Je wilt gezonder leven. Een sportschoolabonnement kost €30 per maand. Ga je ervoor (voor 5 jaar)?',
    keuzes: [
      {
        label: 'Ja, ik ga sporten!',
        gevolg: { geld: -1800, gezondheid: 8 },
        uitkomst: 'Je voelt je fitter en sterker. Het kost wel €1.800 in 5 jaar.',
      },
      {
        label: 'Nee, te duur',
        gevolg: { gezondheid: -2 },
        uitkomst: 'Je houdt je geld, maar je conditie gaat langzaam achteruit.',
      },
    ],
    wieProfiteert:
      'Als je gezond leeft, gebruik je minder zorg. Daar profiteert iedereen van: lagere zorgkosten betekenen een lagere premie. Maar sporten kost geld en tijd, en niet iedereen kan dat betalen.',
    wistJeDat: 'Sommige gemeenten en werkgevers betalen mee aan sporten, zodat ook mensen met weinig geld kunnen sporten.',
  },
];

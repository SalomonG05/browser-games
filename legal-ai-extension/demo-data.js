// ── Source registry ───────────────────────────────────────────────────
// Each source object: { id, label, type, demoUrl, excerpt }
// type: 'statute' | 'case' | 'forarbete' | 'doktrin' | 'svarsmall' | 'qura'

const SOURCES = {
  'abl-17-1': {
    id: 'abl-17-1',
    label: '17 kap. 1 § ABL',
    type: 'statute',
    demoUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/aktiebolagslag-2005551_sfs-2005-551/#K17',
    excerpt: 'Med värdeöverföring från ett aktiebolag förstås: 1. vinstutdelning, 2. förvärv av egna aktier eller av aktier i moderbolag mot vederlag, 3. minskning av aktiekapitalet eller reservfonden för återbetalning till aktieägarna, och 4. annan affärshändelse som medför att bolagets förmögenhet minskar och som inte har rent affärsmässig karaktär för bolaget.',
  },
  'abl-17-3': {
    id: 'abl-17-3',
    label: '17 kap. 3 § ABL',
    type: 'statute',
    demoUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/aktiebolagslag-2005551_sfs-2005-551/#K17',
    excerpt: 'En värdeöverföring får inte äga rum om den inte är försvarlig med hänsyn till de krav som verksamhetens art, omfattning och risker ställer på storleken av det egna kapitalet, och bolagets konsolideringsbehov, likviditet och ställning i övrigt (försiktighetsregeln).',
  },
  'abl-17-6': {
    id: 'abl-17-6',
    label: '17 kap. 6–7 §§ ABL',
    type: 'statute',
    demoUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/aktiebolagslag-2005551_sfs-2005-551/#K17',
    excerpt: 'Om en värdeöverföring har skett i strid med bestämmelserna i detta kapitel, skall mottagaren återbära vad han eller hon har uppburit, om bolaget visar att mottagaren insett eller bort inse att värdeöverföringen stod i strid med dessa bestämmelser.',
  },
  'nja-2014-877': {
    id: 'nja-2014-877',
    label: 'NJA 2014 s. 877',
    type: 'case',
    demoUrl: '#demo',
    excerpt: 'HD prövade frågan om en utbetalning till aktieägare utgjorde en otillåten värdeöverföring enligt 17 kap. ABL. HD framhöll att försiktighetsregelns tillämpning förutsätter en samlad bedömning av bolagets ekonomiska situation, och att det inte är tillräckligt att beloppsspärren formellt är uppfylld.',
  },
  'prop-200405-85': {
    id: 'prop-200405-85',
    label: 'Prop. 2004/05:85',
    type: 'forarbete',
    demoUrl: '#demo',
    excerpt: 'Förarbetena till 2005 års aktiebolagslag. Värdeöverföringsbegreppet definieras brett och teknikneutralt för att träffa alla transaktioner som minskar bolagets förmögenhet utan affärsmässig grund. Lagstiftaren betonade att försiktighetsregeln utgör en självständig prövning utöver beloppsspärren.',
  },
  'svarsmall-ht2024': {
    id: 'svarsmall-ht2024',
    label: 'Svarsmall Associationsrätt HT2024',
    type: 'svarsmall',
    demoUrl: '#demo',
    excerpt: 'Intern svarsmall för tentamen i associationsrätt HT2024. Maxpoäng uppnås om studenten: (1) definierar värdeöverföringsbegreppet explicit, (2) prövar beloppsspärren och försiktighetsregeln separat, (3) hänvisar till NJA 2014 s. 877 eller likvärdig praxis, (4) analyserar rättsföljden vid olaglig värdeöverföring.',
  },
  'andersson-2023': {
    id: 'andersson-2023',
    label: 'Andersson, Aktiebolagsrätt (2023), s. 214',
    type: 'doktrin',
    demoUrl: '#demo',
    excerpt: 'Andersson behandlar försiktighetsregelns tillämpning vid gränsfall. Av särskilt intresse är diskussionen om hur bolagets konsolideringsbehov ska bedömas när bolaget redovisar vinst men har svag likviditet. Andersson menar att HD:s linje i NJA 2014 s. 877 innebär en skärpning av försiktighetsregeln.',
  },
  'qura-vardeoverforingar': {
    id: 'qura-vardeoverforingar',
    label: 'Qura: Värdeöverföringar i aktiebolag',
    type: 'qura',
    demoUrl: '#demo',
    excerpt: 'Qura-sammanfattning av rättsläget (demo). Tre centrala frågor vid värdeöverföringsbedömning: (1) utgör transaktionen en värdeöverföring enligt 17 kap. 1 § ABL? (2) uppfylls beloppsspärren i 17 kap. 2 § ABL? (3) uppfylls försiktighetsregeln i 17 kap. 3 § ABL? Alla tre led måste prövas. Källa: Qura Legal Intelligence (demo).',
  },
};

// ── Demo result: Associationsrätt / Värdeöverföringar ─────────────────
const DEMO_RESULT_ASSOCIATIONSRATT = {
  grade: 'G',
  score: 64,

  overallAssessment:
    'Svaret identifierar korrekt att frågan rör värdeöverföringar men saknar en systematisk analys. Värdeöverföringsbegreppet definieras aldrig uttryckligen, och försiktighetsregelns rekvisit prövas schablonmässigt utan koppling till bolagets faktiska ekonomiska situation. Källhanteringen är otillräcklig — varken NJA 2014 s. 877 eller förarbetena behandlas. Svaret befinner sig i underkant av godkänt.',

  strengths: [
    { text: 'Korrekt identifiering av 17 kap. ABL som tillämplig reglering', sourceIds: ['abl-17-1'] },
    { text: 'Beloppsspärrens tillämpning är i huvudsak korrekt med rätt utgångspunkt i fritt eget kapital', sourceIds: ['abl-17-1'] },
    { text: 'Tydlig slutsats med ståndpunkt om transaktionens laglighet', sourceIds: [] },
  ],

  weaknesses: [
    { text: 'Värdeöverföringsbegreppet i 17 kap. 1 § ABL definieras aldrig — tillämpningen hänger i luften', sourceIds: ['abl-17-1', 'svarsmall-ht2024'] },
    { text: 'Försiktighetsregeln (17 kap. 3 § ABL) prövas utan rekvisitanalys — det räcker inte att konstatera att "bolaget mår bra"', sourceIds: ['abl-17-3', 'andersson-2023'] },
    { text: 'Tillämpningen på omständigheterna är för kortfattad och saknar konkret koppling till bolagets likviditet och konsolideringsbehov', sourceIds: ['prop-200405-85', 'nja-2014-877'] },
    { text: 'Rättsföljden vid olaglig värdeöverföring (17 kap. 6–7 §§ ABL) analyseras inte', sourceIds: ['abl-17-6'] },
  ],

  missingStatutes: [
    { text: '17 kap. 1 § ABL – definition av värdeöverföring (måste explicit definieras)', sourceIds: ['abl-17-1'] },
    { text: '17 kap. 3 § ABL – försiktighetsregeln, fullständiga rekvisit (art, risker, konsolideringsbehov, likviditet)', sourceIds: ['abl-17-3'] },
    { text: '17 kap. 6–7 §§ ABL – återbäringsskyldighet och bristtäckningsansvar', sourceIds: ['abl-17-6'] },
  ],

  missingCases: [
    { text: 'NJA 2014 s. 877 – HD:s tillämpning av försiktighetsregeln vid gränsfall (obligatorisk)', sourceIds: ['nja-2014-877'] },
  ],

  missingDoctrine: [
    { text: 'Prop. 2004/05:85 – förarbetenas definition av värdeöverföringsbegreppet och lagstiftarens avsikt', sourceIds: ['prop-200405-85'] },
    { text: 'Andersson, Aktiebolagsrätt (2023), s. 214 – försiktighetsregelns tillämpning i gränsfall', sourceIds: ['andersson-2023'] },
  ],

  assessmentMatrix: [
    {
      criterion: 'Identifiering av relevant rättsområde',
      status: 'uppfyllt',
      linkedIssue: 'Studenten identifierar korrekt att 17 kap. ABL aktualiseras och att frågan gäller värdeöverföring.',
      sourceIds: ['svarsmall-ht2024'],
    },
    {
      criterion: 'Definition av centrala rättsbegrepp',
      status: 'saknas',
      linkedIssue: 'Värdeöverföringsbegreppet definieras aldrig trots att det är kärnfrågan — utan definition saknas analysen grund.',
      sourceIds: ['abl-17-1', 'svarsmall-ht2024'],
    },
    {
      criterion: 'Lagrum och rekvisit',
      status: 'bristfälligt',
      linkedIssue: 'Beloppsspärren hanteras men försiktighetsregelns tre rekvisit (art, konsolideringsbehov, likviditet) prövas inte var för sig.',
      sourceIds: ['abl-17-3', 'prop-200405-85'],
    },
    {
      criterion: 'Rättskällehantering',
      status: 'bristfälligt',
      linkedIssue: 'Praxis (NJA 2014 s. 877) och förarbeten (Prop. 2004/05:85) saknas helt — dessa är obligatoriska i en godkänd analys.',
      sourceIds: ['nja-2014-877', 'prop-200405-85'],
    },
    {
      criterion: 'Tillämpning på fakta',
      status: 'delvis',
      linkedIssue: 'Tillämpningen är för kortfattad. Bolagets ekonomiska situation beskrivs men kopplas inte konkret till försiktighetsregelns rekvisit.',
      sourceIds: ['andersson-2023', 'qura-vardeoverforingar'],
    },
    {
      criterion: 'Rättsföljd och konsekvensanalys',
      status: 'saknas',
      linkedIssue: 'Återbäringsskyldigheten och bristtäckningsansvaret i 17 kap. 6–7 §§ ABL analyseras inte alls.',
      sourceIds: ['abl-17-6'],
    },
    {
      criterion: 'Slutsats och juridisk argumentation',
      status: 'delvis',
      linkedIssue: 'Slutsatsen är tydlig men bristfälligt grundad — den saknar stöd i praxis och förarbeten.',
      sourceIds: ['svarsmall-ht2024'],
    },
  ],

  improvedDisposition:
    '1. Inledning – problemformulering och identifiering av rättsfrågor\n' +
    '2. Utgör transaktionen en värdeöverföring? (17 kap. 1 § ABL)\n' +
    '   2.1 Definition av värdeöverföringsbegreppet\n' +
    '   2.2 Subsumtion: faller transaktionen under definitionen?\n' +
    '3. Beloppsspärren (17 kap. 2 § ABL)\n' +
    '   3.1 Rekvisit: fritt eget kapital enligt senaste balansräkning\n' +
    '   3.2 Tillämpning på bolagets siffror\n' +
    '4. Försiktighetsregeln (17 kap. 3 § ABL)\n' +
    '   4.1 Verksamhetens art och risker\n' +
    '   4.2 Konsolideringsbehov\n' +
    '   4.3 Likviditet och ställning i övrigt\n' +
    '   4.4 Tillämpning: NJA 2014 s. 877\n' +
    '5. Rättsföljd vid olaglig värdeöverföring (17 kap. 6–7 §§ ABL)\n' +
    '6. Slutsats',

  modelAnswer:
    'Frågan aktualiserar reglerna om värdeöverföring i 17 kap. ABL. Inledningsvis bör fastslås att "värdeöverföring" i 17 kap. 1 § ABL är ett brett begrepp som träffar alla affärshändelser som minskar bolagets förmögenhet utan rent affärsmässig grund — däribland vinstutdelning. Transaktionen i fallet utgör en värdeöverföring enligt denna definition.\n\nBeloppsspärren i 17 kap. 2 § ABL innebär att värdeöverföringen inte får överstiga bolagets fria egna kapital. I fallet uppgår det fria egna kapitalet till [X kr] enligt senaste fastställda balansräkning, varför en utdelning om [Y kr] formellt ryms inom beloppsspärren.\n\nDetta är emellertid inte tillräckligt. Försiktighetsregeln i 17 kap. 3 § ABL kräver därutöver att värdeöverföringen är försvarlig med hänsyn till (1) verksamhetens art och risker, (2) konsolideringsbehovet och (3) likviditeten. HD prövade en liknande situation i NJA 2014 s. 877 och fastslog att försiktighetsregeln utgör en självständig prövning som kan blockera en formellt beloppsspärrsuppfylld utdelning. Mot bakgrund av bolagets [ekonomiska situation] är värdeöverföringen [tillåten/otillåten] enligt 17 kap. 3 § ABL.\n\nOm transaktionen är otillåten aktualiseras återbäringsskyldighet och bristtäckningsansvar enligt 17 kap. 6–7 §§ ABL.',

  sourcesUsed: [
    'abl-17-1',
    'abl-17-3',
    'abl-17-6',
    'nja-2014-877',
    'prop-200405-85',
    'svarsmall-ht2024',
    'andersson-2023',
    'qura-vardeoverforingar',
  ],
};

// ── Entry point ───────────────────────────────────────────────────────
// TODO: Replace with real API call in production
function getDemoResponse(area, mode) {
  return DEMO_RESULT_ASSOCIATIONSRATT;
}

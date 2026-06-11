const DEMO_RESPONSES = {
  'avtalsrätt:tentarättning': {
    grade: 'VG',
    score: 82,
    samladBedömning:
      'Svaret uppvisar god förståelse för avtalsrättens grundläggande systematik och identifierar korrekt de centrala rättsfigurerna. Argumentationen är välstrukturerad men saknar djupanalys i fråga om ogiltighetsgrundernas rekvisit. Relevanta lagrum citeras men kopplas inte alltid tillräckligt tydligt till de konkreta omständigheterna. Sammantaget ett välgodkänt svar som med komplettering av rättsfall och mer nyanserad tillämpning av 36 § AvtL hade nått högsta betyg.',
    styrkor: [
      'Korrekt identifiering av anbud–accept-modellen enligt 1–9 §§ AvtL',
      'God systematik i genomgången av ogiltighetsgrunderna i 28–36 §§ AvtL',
      'Relevant hänvisning till generalklausulen i 36 § AvtL',
      'Tydlig slutsats med välmotiverad ståndpunkt'
    ],
    saknadeMoment: [
      'Lojalitetspliktens roll vid avtalsförhandlingar saknas helt',
      'Ingen diskussion om condictio indebiti vid ogiltigt avtal',
      'Avsaknad av analys kring passivitetsvirkningar',
      'Reklamationsplikten i 6:2 HB behandlas inte'
    ],
    saknadeLagrum: [
      '29 § AvtL – Svek (relevant för omständigheterna i fallet)',
      '33 § AvtL – Tro och heder',
      '6:2 HB – Handelsbalken (reklamation)',
      '36 § AvtL – fullständiga rekvisit anges inte'
    ],
    saknadeRattsfall: [
      'NJA 1998 s. 390 – underlåtelse att upplysa och svek',
      'NJA 2012 s. 776 – tillämpning av 36 § AvtL',
      'NJA 1989 s. 614 – lojalitetsplikt vid avtalsförhandling',
      'AD 2005 nr 65 – passivitet som accept'
    ],
    bristerITillämpning:
      'Analysen av 36 § AvtL är för schablonartad — rekvisiten "oskäligt" och "med hänsyn till senare inträffade förhållanden" särskiljs inte. Tillämpningen av svek i 30 § AvtL görs utan att subjektiva rekvisit (uppsåt) prövas. Det saknas en tydlig distinktion mellan relativ och absolut ogiltighet, vilket är centralt för rättsföljdsbedömningen.',
    forbattradDisposition:
      '1. Inledning och problemidentifiering\n2. Avtalets uppkomst – anbud och accept (1–9 §§ AvtL)\n3. Relevant ogiltighetsgrund\n   3.1 Svek (30 § AvtL) – objektiva och subjektiva rekvisit\n   3.2 Generalklausulen (36 § AvtL) – skälighetsbedömning\n4. Rättsföljder: relativ vs. absolut ogiltighet\n5. Skadestånd och återgång\n6. Slutsats',
    förslagBattreTentasvar:
      'Ett starkare svar hade inlett med en kort problemformulering som identifierar rättsfrågorna. Under ogiltighetsanalysen bör svek i 30 § AvtL behandlas med fullständig rekvisitprövning (vilseledande, uppsåt, kausalitet). Därefter bör 36 § AvtL appliceras subsidiärt med konkret skälighetsbedömning utifrån parternas ställning, avtalets innehåll och omständigheterna vid avtalstillfället. Avslutningsvis bör rättsföljderna analyseras: vad händer med prestationerna vid ogiltighet? Hänvisa till NJA 1998 s. 390 och NJA 2012 s. 776.',
    kallgrund: [
      'Adlercreutz & Gorton, Avtalsrätt I, 13 uppl. (2016)',
      'Grönfors & Dotevall, Avtalslagen – En kommentar, 5 uppl. (2023)',
      'Ramberg & Ramberg, Allmän avtalsrätt, 11 uppl. (2022)',
      'NJA 1998 s. 390; NJA 2012 s. 776'
    ]
  },

  'associationsrätt:tentarättning': {
    grade: 'G',
    score: 63,
    samladBedömning:
      'Svaret visar grundläggande förståelse för aktiebolagsrättens struktur men saknar precision i fråga om styrelsens ansvar och kapitalbristreglernas tillämpning. Relevanta bestämmelser i ABL identifieras men inte korrekt tillämpade på det givna scenariot. Svaret behöver väsentligt djupare analys för att nå VG.',
    styrkor: [
      'Korrekt identifiering av den centrala rättsfrågan (styrelsens personliga ansvar)',
      'God översikt av ABL:s ansvarsregler i 29 kap.',
      'Relevant diskussion om bolagets rättskapacitet'
    ],
    saknadeMoment: [
      'Kapitalbristreglerna i 25 kap. ABL analyseras inte tillräckligt',
      'Business Judgment Rule och dess svenska tillämpning saknas',
      'Ingen diskussion om skadeståndsansvaret gentemot tredje man',
      'Avsaknad av analys av revisorns roll vid kapitalbrister'
    ],
    saknadeLagrum: [
      '25 kap. 13–20 §§ ABL – kontrollbalansräkning och likvidationsplikt',
      '29 kap. 1 § ABL – skadeståndsansvar för styrelseledamot',
      '8 kap. 4 § ABL – styrelseledamots lojalitetsplikt',
      '9 kap. 44 § ABL – revisorns anmälningsplikt'
    ],
    saknadeRattsfall: [
      'NJA 2005 s. 44 – styrelseledamots personliga ansvar',
      'NJA 2013 s. 725 – kapitalbristreglernas tillämpning',
      'RH 2009:42 – business judgment rule i svensk rätt'
    ],
    bristerITillämpning:
      'Tillämpningen av 25 kap. ABL:s fristberäkning är felaktig — ansvarstidpunkten räknas från det att styrelsen borde ha upprättat kontrollbalansräkning, inte från faktisk konkurs. Personligt ansvar enligt 25 kap. 18 § ABL förutsätter att rekvisiten prövas stegvis, vilket inte görs i svaret.',
    forbattradDisposition:
      '1. Inledning – identifiering av rättsfrågor\n2. Bolagets organisation och styrelsens befogenheter (8 kap. ABL)\n3. Kapitalskyddsregler och kritisk kapitalunderskridning\n   3.1 Kontrollbalansräkningens upprättande (25 kap. 13 § ABL)\n   3.2 Kontrollstämma och handlingsalternativ\n4. Personligt ansvar – rekvisit och tidsgräns (25 kap. 18 § ABL)\n5. Skadestånd mot styrelseledamot (29 kap. ABL)\n6. Slutsats',
    förslagBattreTentasvar:
      'Börja med att fastslå att styrelsens huvudsakliga skyldighet vid misstänkt kapitalunderskridning är att upprätta kontrollbalansräkning (25 kap. 13 § ABL). Analysera sedan fristens löpande och de handlingar som kan avbryta personligt ansvar. Koppla varje steg till det konkreta scenariot och hänvisa till NJA 2005 s. 44 för bedömningsprincipen.',
    kallgrund: [
      'Sandström, Svensk aktiebolagsrätt, 6 uppl. (2020)',
      'Nerep, Adestam & Samuelsson, Aktiebolagslagen – En kommentar (2022)',
      'Prop. 2004/05:85 – Ny aktiebolagslag'
    ]
  },

  'straffrätt:tentarättning': {
    grade: 'G',
    score: 67,
    samladBedömning:
      'Svaret identifierar relevant brottsrubricering och uppvisar förståelse för grundläggande straffrättsliga rekvisit. Analys av subjektiv täckning och uppsåtets former är dock alltför knapphändig. Konkurrenslära behandlas inte alls, vilket är centralt för det givna scenariot. Svaret befinner sig i underkanten av godkänt.',
    styrkor: [
      'Korrekt identifiering av de objektiva rekvisiten för brottet',
      'Relevant diskussion om gärningsculpa',
      'God förståelse för brottskonkurrensens yttre ram'
    ],
    saknadeMoment: [
      'Uppsåtets former (direkt, indirekt, eventuellt uppsåt) analyseras inte',
      'Konkurrenslära (konsumtion, specialitet, subsidiaritet) saknas',
      'Nödvärnsrätten i 24 kap. 1 § BrB berörs inte trots relevansen',
      'Straffmätning och påföljdsval diskuteras inte'
    ],
    saknadeLagrum: [
      '1 kap. 2 § BrB – uppsåtskravet',
      '23 kap. 1 § BrB – försök',
      '24 kap. 1 § BrB – nödvärn',
      '29 kap. 1–3 §§ BrB – straffmätningsprinciper'
    ],
    saknadeRattsfall: [
      'NJA 2004 s. 176 – eventuellt uppsåt (likgiltighetsuppsåt)',
      'NJA 2016 s. 763 – nödvärn och excess',
      'NJA 2011 s. 563 – medverkan och uppsåt'
    ],
    bristerITillämpning:
      'Eventuellt uppsåt (likgiltighetsuppsåt) tillämpas felaktigt — det räcker inte att gärningsmannen insåg risken, utan det krävs att denne var likgiltig inför effektens inträde (NJA 2004 s. 176). Denna distinktion saknas helt i svaret och leder till en felaktig slutsats om brottsrubriceringen.',
    forbattradDisposition:
      '1. Inledning och gärningsbeskrivning\n2. Objektiva rekvisit – brottsbeskrivningsenlighet\n3. Subjektiv täckning\n   3.1 Uppsåtets former – direkt, indirekt, eventuellt\n   3.2 Oaktsamhet som alternativ\n4. Ansvarsfrihetsgrunder (nödvärn, nöd m.m.)\n5. Brottskonkurrens\n6. Påföljd och straffmätning\n7. Slutsats',
    förslagBattreTentasvar:
      'Inled med att klarlägga gärningen och identifiera tillämpliga straffbud. Pröva sedan metodiskt objektiva rekvisit, följt av en detaljerad analys av uppsåtets form med hänvisning till likgiltighetsuppsåtet (NJA 2004 s. 176). Behandla ansvarsfrihetsgrunder, brottskonkurrens och avsluta med en kortfattad påföljdsdiskussion.',
    kallgrund: [
      'Asp, Ulväng & Jareborg, Kriminalrättens grunder, 2 uppl. (2013)',
      'Holmqvist m.fl., Brottsbalken – En kommentar (2024)',
      'Prop. 2000/01:85 – Likgiltighetsuppsåt'
    ]
  },

  'statsrätt:tentarättning': {
    grade: 'VG',
    score: 88,
    samladBedömning:
      'Svaret uppvisar utmärkt förståelse för konstitutionell systematik och identifierar korrekt de relevanta bestämmelserna i RF. Analysen är välstrukturerad och knyter samman normhierarki, lagprövning och proportionalitetsprincipen på ett övertygande sätt. Enstaka brister i behandlingen av EU-rättens företräde och EKMR-tolkning hindrar högsta betyg.',
    styrkor: [
      'Utmärkt analys av normhierarkin och RF:s konstitutionella ställning',
      'Korrekt tillämpning av 11 kap. 14 § RF om lagprövning',
      'God förståelse för proportionalitetsprincipen vid fri- och rättighetsinskränkningar',
      'Välmotiverad koppling till Europakonventionen artikel 8'
    ],
    saknadeMoment: [
      'EU-rättens företräde och konsekvenser för nationell lagstiftning analyseras inte',
      'Riksdagsordningens ställning i normhierarkin berörs inte',
      'Konstitutionsutskottets granskningsroll saknas'
    ],
    saknadeLagrum: [
      '2 kap. RF – grundläggande fri- och rättigheter (fullständig genomgång)',
      '11 kap. 14 § RF – lagprövning',
      '10 kap. 6 § RF – EU-rättens konstitutionella grund',
      'Artikel 8 EKMR – rätten till privatliv'
    ],
    saknadeRattsfall: [
      'RÅ 2010 ref. 71 – lagprövning och proportionalitet',
      'HFD 2016 ref. 79 – EKMR och nationell rätt',
      'EU-domstolen C-617/10, Åkerberg Fransson – EU-stadgans tillämpning'
    ],
    bristerITillämpning:
      'Proportionalitetsbedömningen saknar de tre delbedömningarna (lämplighet, nödvändighet, proportionalitet i strikt mening) som är standard i svenska förvaltningsdomstolars praxis. Utan denna tredelade struktur framstår slutsatsen som otillräckligt motiverad.',
    forbattradDisposition:
      '1. Inledning – konstitutionell rättsfråga\n2. Normhierarki och RF:s ställning\n3. Grundlagsskyddad rättighet (2 kap. RF)\n4. Inskränkningsförutsättningar (2 kap. 20–25 §§ RF)\n   4.1 Ändamålsenlighet\n   4.2 Proportionalitetsprincipen (tre steg)\n5. EKMR och EU-rätten\n6. Lagprövning (11 kap. 14 § RF)\n7. Slutsats',
    förslagBattreTentasvar:
      'Inled med att identifiera vilken grundlagsskyddad rättighet som aktualiseras och typen av inskränkning. Genomför därefter en fullständig proportionalitetsbedömning i tre steg och komplettera med analys av EKMR artikel 8 samt EU-rättens företräde om europarättsliga element finns i scenariot.',
    kallgrund: [
      'Bull & Sterzel, Regeringsformen – En kommentar, 3 uppl. (2015)',
      'Warnling-Nerep m.fl., Statsrättens grunder, 5 uppl. (2019)',
      'SOU 2021:42 – Grundlagsutredningen'
    ]
  },

  'avtalsrätt:vanligjuridiskgranskning': {
    grade: null,
    score: null,
    samladBedömning:
      'Texten utgör ett välstrukturerat avtalsrättsligt resonemang med tydlig koppling till gällande rätt. Några centrala frågor behandlas dock ofullständigt och bör fördjupas inför publicering eller praktisk användning. Nedan följer en strukturerad juridisk granskning.',
    styrkor: [
      'Tydlig och logisk argumentation som är lätt att följa',
      'Korrekt användning av avtalsrättslig terminologi',
      'Välgrundad slutsats med stöd i lagtext'
    ],
    saknadeMoment: [
      'Avsnitt om parts möjlighet att åberopa jämkning saknas',
      'Inga fordringsrättsliga konsekvenser vid hävning diskuteras',
      'Internationellt privaträttslig dimension (lagvalsfrågan) berörs inte'
    ],
    saknadeLagrum: [
      '36 § AvtL – jämkning',
      '28 § AvtL – tvång',
      'Köplagen 39 § – hävning och skadestånd'
    ],
    saknadeRattsfall: [
      'NJA 2002 s. 630 – jämkning av standardavtal',
      'NJA 1994 s. 359 – hävningsrätt och väsentlig kontraktsbrott'
    ],
    bristerITillämpning:
      'Hävningsrekvisitet "väsentlig kontraktsbrist" tillämpas utan koppling till praxis. Domstolarna gör en helhetsbedömning som inkluderar parts möjlighet att avhjälpa bristen — detta bör inkluderas i analysen.',
    forbattradDisposition:
      '1. Avtalets innehåll och tolkning\n2. Kontraktsbrott – objektiv bedömning\n3. Väsentlighetsbedömning\n4. Hävningsrätt och dess utövande\n5. Rättsföljder vid hävning\n6. Alternativa anspråk (skadestånd, prisavdrag)\n7. Slutsats och rekommendation',
    förslagBattreTentasvar:
      'För en fullständig juridisk promemoria bör texten kompletteras med ett avsnitt om reklamationsplikt, en analys av skadeståndets beräkning (positiva och negativa kontraktsintresset) samt en kort kommentar om preskription.',
    kallgrund: [
      'Hellner, Hager & Persson, Speciell avtalsrätt II, 7 uppl. (2016)',
      'Ramberg & Herre, Köplagen – En kommentar (2019)',
      'NJA 1994 s. 359; NJA 2002 s. 630'
    ]
  }
};

// Entry point — swap this function for a real API call in production
function getDemoResponse(area, mode) {
  const key = `${area}:${mode}`;
  return DEMO_RESPONSES[key] || DEMO_RESPONSES['avtalsrätt:tentarättning'];
}

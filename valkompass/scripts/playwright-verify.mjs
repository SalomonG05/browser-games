// Playwright verification script — körs mot http://localhost:3000
// Testar S-profil och SD-profil, kontrollerar positionsvärden och badge-logik

import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  let PASS = true;
  const findings = [];

  function ok(msg) { console.log("  ✅", msg); }
  function fail(msg) { console.log("  ❌", msg); PASS = false; findings.push(msg); }
  function warn(msg) { console.log("  ⚠️", msg); findings.push("⚠️ " + msg); }
  function probe(msg) { console.log("  🔍", msg); }

  // ── 1. Hämta och verifiera frågelistan ──────────────────────────────────
  console.log("\n=== STEG 1: Kontrollera /api/questions ===");
  const res = await page.request.get(`${BASE}/api/questions`);
  const qs = await res.json();
  ok(`${qs.length} APPROVED frågor returnerade`);

  // Inga dubbletter i text
  const texts = qs.map(q => q.questionText.toLowerCase().slice(0, 50));
  const dups = texts.filter((t, i) => texts.indexOf(t) !== i);
  if (dups.length > 0) fail(`Dubbla frågetextsprefix: ${dups}`);
  else ok("Inga dubbletter i frågetexter");

  // Kolla att inga nästintill identiska frågor om bygglov finns
  const bygglov = qs.filter(q => q.questionText.toLowerCase().includes("bygglov"));
  if (bygglov.length > 1) warn(`${bygglov.length} bygglovsfrågor kvar: ${bygglov.map(q => q.questionText)}`);
  else ok("Exakt 1 bygglovsfråga");

  // Kolla att SD=-2 på klimatfrågan
  const klimat = qs.find(q => q.questionText.toLowerCase().includes("klimatsatsningar") && q.questionText.includes("offentliga"));
  if (!klimat) fail("Klimatfråga om offentliga resurser saknas");
  else {
    const sd = klimat.positions.find(p => p.partyId === "sverigedemokraterna");
    if (!sd) fail("SD saknas på klimatfrågan");
    else if (sd.positionValue === -2) ok(`SD positionValue=-2 på klimatfrågan ✓`);
    else fail(`SD positionValue=${sd.positionValue} på klimatfrågan (ska vara -2)`);

    const mp = klimat.positions.find(p => p.partyId === "miljopartiet");
    if (mp?.positionValue === 2) ok(`MP positionValue=+2 på klimatfrågan ✓`);
    else fail(`MP positionValue=${mp?.positionValue} på klimatfrågan (ska vara +2)`);
  }

  // Kolla migrationsfrågan
  const mig = qs.find(q => q.questionText.toLowerCase().includes("restriktiv") && q.questionText.toLowerCase().includes("asyl"));
  if (!mig) fail("Migrationsfråga om restriktiv asylpolitik saknas");
  else {
    const mp = mig.positions.find(p => p.partyId === "miljopartiet");
    const v = mig.positions.find(p => p.partyId === "vansterpartiet");
    const sd = mig.positions.find(p => p.partyId === "sverigedemokraterna");
    if (mp?.positionValue === -2) ok(`MP positionValue=-2 på migrationsfrågan ✓`);
    else fail(`MP positionValue=${mp?.positionValue} på migration (ska vara -2)`);
    if (v?.positionValue === -2) ok(`V positionValue=-2 på migrationsfrågan ✓`);
    else fail(`V positionValue=${v?.positionValue} på migration (ska vara -2)`);
    if (sd?.positionValue === 2) ok(`SD positionValue=+2 på migrationsfrågan ✓`);
    else fail(`SD positionValue=${sd?.positionValue} på migration (ska vara +2)`);
  }

  // ── 2. S-profil: testa scoring direkt mot /api/score ───────────────────
  console.log("\n=== STEG 2: S-profil via /api/score ===");

  // Bygg svar: JA (+2) på S-typiska frågor, NEJ (-2) på SD-typiska frågor
  const answers = qs.map(q => {
    const text = q.questionText.toLowerCase();
    let answer = 0; // neutral default
    let importance = 1;

    // S-profil: JA på klimat, välfärd, hyresrätter, grön industri
    if (text.includes("klimatsatsningar") || text.includes("hyresrätter") ||
        text.includes("grön industriomställning") || text.includes("välfärd") ||
        text.includes("eu") && text.includes("klimat")) {
      answer = 2; importance = 2;
    }
    // S-profil: NEJ på restriktiv migration, sänkta skatter, privatiseringar
    if (text.includes("restriktiv") && text.includes("asyl")) { answer = -2; importance = 2; }
    if (text.includes("skatten") && text.includes("sänkas") && text.includes("drivmedel")) { answer = -1; }
    if (text.includes("anställningskostnader") || text.includes("arbetsgivaravgifter")) { answer = -1; }

    return { questionId: q.id, answer, importance, skipped: false };
  });

  const scoreRes = await page.request.post(`${BASE}/api/score`, {
    data: { answers },
    headers: { "Content-Type": "application/json" },
  });

  if (!scoreRes.ok()) {
    fail(`/api/score svarade ${scoreRes.status()}`);
  } else {
    const { scores, totalQuestions } = await scoreRes.json();
    console.log(`  Totalfrågor: ${totalQuestions}`);
    console.log("  Ranking (S-profil):");
    scores.forEach((s, i) =>
      console.log(`    ${i+1}. ${(s.party?.shortName ?? s.partyId).padEnd(4)} ${String(s.matchPercent).padStart(3)}%  (matchade: ${s.questionsMatched})`)
    );

    const sResult = scores.find(s => s.partyId === "socialdemokraterna");
    const sdResult = scores.find(s => s.partyId === "sverigedemokraterna");
    const mpResult = scores.find(s => s.partyId === "miljopartiet");

    if (!sResult || !sdResult) { fail("S eller SD saknas i resultaten"); }
    else {
      if (sResult.matchPercent >= 50) ok(`S matchprocent=${sResult.matchPercent}% (rimligt för S-profil)`);
      else warn(`S matchprocent=${sResult.matchPercent}% — oväntat lågt för S-profil`);

      if (sdResult.matchPercent < sResult.matchPercent) ok(`SD (${sdResult.matchPercent}%) lägre än S (${sResult.matchPercent}%) för S-profil ✓`);
      else warn(`SD (${sdResult.matchPercent}%) >= S (${sResult.matchPercent}%) — oväntat för S-profil`);

      // SD ska inte ha högt resultat för en klimatpositiv väljare
      if (sdResult.matchPercent < 40) ok(`SD matchprocent=${sdResult.matchPercent}% lågt för klimatpositiv S-profil ✓`);
      else warn(`SD matchprocent=${sdResult.matchPercent}% — kan tyda på att SD-positioner fortfarande är felvända`);

      // Kolla questionsMatched > 0 för alla partier
      scores.forEach(s => {
        if (s.questionsMatched === 0) warn(`${s.partyId} har questionsMatched=0 — kan tyda på att inga positions är kopplade`);
      });

      // importance=0-frågor ska inte räknas
      const zeroImportanceAnswers = answers.filter(a => a.importance === 0);
      probe(`${zeroImportanceAnswers.length} svar med importance=0 i S-profilen (alla är 0 eller 1, inga 0:or sätts manuellt)`);
    }
  }

  // ── 3. SD-profil ─────────────────────────────────────────────────────────
  console.log("\n=== STEG 3: SD-profil via /api/score ===");

  const sdAnswers = qs.map(q => {
    const text = q.questionText.toLowerCase();
    let answer = 0;
    let importance = 1;

    // SD-profil: JA på hårdare straff, restriktiv migration, sänkta skatter
    if (text.includes("restriktiv") && text.includes("asyl")) { answer = 2; importance = 2; }
    if (text.includes("rehabilitering") && text.includes("straff")) { answer = -2; importance = 2; } // SD = NEJ till rehabilitering
    if (text.includes("skatten") && text.includes("sänkas")) { answer = 2; }
    // SD-profil: NEJ på klimatsatsningar
    if (text.includes("klimatsatsningar") && text.includes("offentliga")) { answer = -2; importance = 2; }
    if (text.includes("grön industriomställning")) { answer = -1; }

    return { questionId: q.id, answer, importance, skipped: false };
  });

  const sdScoreRes = await page.request.post(`${BASE}/api/score`, {
    data: { answers: sdAnswers },
    headers: { "Content-Type": "application/json" },
  });

  if (!sdScoreRes.ok()) {
    fail(`/api/score SD-profil svarade ${sdScoreRes.status()}`);
  } else {
    const { scores: sdScores } = await sdScoreRes.json();
    console.log("  Ranking (SD-profil):");
    sdScores.forEach((s, i) =>
      console.log(`    ${i+1}. ${(s.party?.shortName ?? s.partyId).padEnd(4)} ${String(s.matchPercent).padStart(3)}%`)
    );

    const sdRes = sdScores.find(s => s.partyId === "sverigedemokraterna");
    const mpRes = sdScores.find(s => s.partyId === "miljopartiet");
    const vRes = sdScores.find(s => s.partyId === "vansterpartiet");

    if (sdRes && sdRes.matchPercent >= 50) ok(`SD matchprocent=${sdRes.matchPercent}% hög för SD-profil ✓`);
    else warn(`SD matchprocent=${sdRes?.matchPercent}% — oväntat lågt för SD-profil`);

    if (mpRes && mpRes.matchPercent < 50) ok(`MP matchprocent=${mpRes.matchPercent}% lågt för SD-profil ✓`);
    else warn(`MP matchprocent=${mpRes?.matchPercent}% — oväntat högt för SD-profil`);

    if (vRes && vRes.matchPercent < 50) ok(`V matchprocent=${vRes.matchPercent}% lågt för SD-profil ✓`);
    else warn(`V matchprocent=${vRes?.matchPercent}% — oväntat högt för SD-profil`);
  }

  // ── 4. Testa importance=0 inte räknas ────────────────────────────────────
  console.log("\n=== STEG 4: Importance=0 ska inte räknas ===");

  const importanceZeroAnswers = qs.map(q => ({
    questionId: q.id,
    answer: 2,
    importance: 0, // Alla = "Inte viktig"
    skipped: false,
  }));

  const imp0Res = await page.request.post(`${BASE}/api/score`, {
    data: { answers: importanceZeroAnswers },
    headers: { "Content-Type": "application/json" },
  });

  if (imp0Res.ok()) {
    const { scores: imp0Scores } = await imp0Res.json();
    const allZeroMatch = imp0Scores.every(s => s.questionsMatched === 0);
    probe(`Alla svar importance=0: questionsMatched=${imp0Scores[0]?.questionsMatched}`);
    if (allZeroMatch) ok("importance=0 → questionsMatched=0 för alla partier ✓");
    else {
      const nonZero = imp0Scores.filter(s => s.questionsMatched > 0);
      warn(`${nonZero.length} partier har questionsMatched>0 trots importance=0`);
    }
  }

  // ── 5. UI smoke test: /kompass laddas ─────────────────────────────────────
  console.log("\n=== STEG 5: UI smoke-test /kompass ===");
  await page.goto(`${BASE}/kompass`);
  await page.waitForTimeout(2000);

  const h2 = await page.locator("h2").first().textContent().catch(() => null);
  if (h2 && h2.length > 10) ok(`Första frågetext laddad: "${h2.slice(0, 60)}..."`);
  else fail(`Kunde inte ladda frågetext, h2=${h2}`);

  const progressText = await page.locator("text=Fråga 1 av").textContent().catch(() => null);
  if (progressText) ok(`Progressindikator: "${progressText}"`);
  else warn("Progressindikator 'Fråga 1 av' hittades inte");

  // Verifiera att frågetexten inte liknar den gamla (v2) dubbletten om bygglov
  const allH2s = await page.locator("h2").allTextContents();
  const oldBygglovText = "Bör byråkratin och reglerna kring bygglov förenklas?";
  if (allH2s.some(t => t.includes(oldBygglovText))) {
    fail(`Gamla dubblett-bygglovsfrågan syns i UI: "${oldBygglovText}"`);
  } else {
    probe("Gamla bygglovsfrågan (nknobjdc) syns inte på sida 1 av /kompass ✓");
  }

  // ── RAPPORT ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log(`VERDICT: ${PASS ? "PASS" : "FAIL"}`);
  if (findings.length > 0) {
    console.log("\nFindings:");
    findings.forEach(f => console.log(" ", f));
  }

  await browser.close();
  process.exit(PASS ? 0 : 1);
}

run().catch(err => {
  console.error("Playwright-fel:", err.message);
  process.exit(1);
});

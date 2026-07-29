// Verifierar resultat-sidans nya copy och partifärger
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let PASS = true;
  const findings = [];
  const ok   = m => console.log("  ✅", m);
  const fail = m => { console.log("  ❌", m); PASS = false; findings.push(m); };
  const warn = m => { console.log("  ⚠️ ", m); findings.push("⚠️ " + m); };
  const probe= m => console.log("  🔍", m);

  // Hämta frågor + generera svar
  const qs = await (await page.request.get(`${BASE}/api/questions`)).json();
  const answers = qs.map(q => ({
    questionId: q.id,
    answer: q.questionText.toLowerCase().includes("restriktiv") ? -2 : 2,
    importance: 1,
    skipped: false,
  }));
  const scoreData = await (await page.request.post(`${BASE}/api/score`, {
    data: { answers },
    headers: { "Content-Type": "application/json" },
  })).json();

  const { scores, totalQuestions } = scoreData;
  const topParty = scores[0];
  const questionsSkipped = topParty.questionsSkipped;
  const questionsAnswered = totalQuestions - questionsSkipped;

  // Ladda resultat-sidan med data i sessionStorage
  await page.goto(`${BASE}/resultat`);
  await page.evaluate(data => sessionStorage.setItem("valkompass_result", JSON.stringify(data)), scoreData);
  await page.reload();
  await page.waitForTimeout(1500);

  // ── Intro-text ─────────────────────────────────────────────────────────
  console.log("\n=== TEXT: intro ===");
  const intro = await page.locator("p.text-sm.text-gray-500").first().textContent();
  const introClean = intro?.replace(/\s+/g, " ").trim() ?? "";
  console.log("  Text:", introClean);

  if (introClean.includes(`Du svarade på`)) ok("Intro innehåller 'Du svarade på'");
  else fail("Intro saknar 'Du svarade på'");

  if (introClean.includes(String(questionsAnswered))) ok(`Intro visar rätt antal svarade frågor: ${questionsAnswered}`);
  else fail(`Intro visar inte ${questionsAnswered}`);

  if (introClean.includes(String(totalQuestions))) ok(`Intro visar totalantal frågor: ${totalQuestions}`);
  else fail(`Intro visar inte ${totalQuestions}`);

  if (!introClean.includes("Matchningen baseras på")) ok("Gammal missvisande text borttagen");
  else fail("Gammal text 'Matchningen baseras på N frågor' kvar");

  // ── Per-parti frågeantal ────────────────────────────────────────────────
  console.log("\n=== TEXT: per parti ===");
  const perParty = await page.locator("p.text-xs.text-gray-400").allTextContents();
  probe(`${perParty.length} per-parti rader hittade`);
  perParty.forEach(t => console.log("   ", t.trim()));

  if (perParty.length === scores.length) ok(`${perParty.length} rader = ${scores.length} partier ✓`);
  else warn(`${perParty.length} rader, ${scores.length} partier — matchar inte`);

  const hasBesatPa = perParty.every(t => t.includes("Baserat på") && t.includes("av 51"));
  if (hasBesatPa) ok("Alla rader innehåller 'Baserat på X av 51 frågor'");
  else warn("Inte alla per-parti rader har korrekt format");

  // ── Partifärger via computed styles ────────────────────────────────────
  console.log("\n=== FÄRGER ===");
  // Staplar: .rounded-full.h-4 som INTE är bg-gray-100 (progress-background)
  const barDivs = await page.locator(".rounded-full.h-4").all();
  const coloredBars = [];
  for (const bar of barDivs) {
    const cls = await bar.getAttribute("class");
    if (cls && !cls.includes("bg-gray-100") && !cls.includes("bg-gray-200")) {
      const color = cls.match(/bg-[a-z]+-[0-9]+/)?.[0];
      if (color) coloredBars.push(color);
    }
  }
  probe(`Stapelfärger: ${coloredBars.join(", ")}`);

  // Förväntat: S=röd, M=blå — de ska skiljas åt tydligt
  const expectedColors = {
    "bg-red-600":    "Socialdemokraterna (S)",
    "bg-red-900":    "Vänsterpartiet (V)",
    "bg-blue-500":   "Moderaterna (M)",
    "bg-indigo-700": "Kristdemokraterna (KD)",
    "bg-sky-500":    "Liberalerna (L)",
    "bg-yellow-500": "Sverigedemokraterna (SD)",
    "bg-green-600":  "Centerpartiet (C)",
    "bg-emerald-500":"Miljöpartiet (MP)",
  };
  for (const [cls, label] of Object.entries(expectedColors)) {
    if (coloredBars.includes(cls)) ok(`${cls} → ${label} ✓`);
    else warn(`${cls} (${label}) hittades inte bland stapelklasserna`);
  }

  // S och M ska vara olika färger
  if (coloredBars.includes("bg-red-600") && coloredBars.includes("bg-blue-500")) {
    ok("S (röd) och M (blå) tydligt åtskilda ✓");
  } else {
    warn("Kunde inte bekräfta att S och M har olika färger");
  }

  // ── Rapport ────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log(`VERDICT: ${PASS ? "PASS" : "FAIL"}`);
  if (findings.length) { console.log("\nFindings:"); findings.forEach(f => console.log(" ", f)); }

  await browser.close();
  process.exit(PASS ? 0 : 1);
}

run().catch(e => { console.error(e.message); process.exit(1); });

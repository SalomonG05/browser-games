"use client";

import { useState } from "react";

// ── Typer ──────────────────────────────────────────────────────────────────

type ExportPosition = {
  id: string;
  partyId: string;
  topic: string;
  specificQuestion: string;
  summary: string;
  positionValue: number | null;
  confidence: string;
  sourceQuote: string;
  sourceUrl: string;
  aiInterpretation: string;
  reviewStatus: string;
  conflictingSources: boolean;
  party: { name: string; shortName: string };
  source: { url: string; title: string | null; sourceType: string };
};

type ExportQuestion = {
  id: string;
  topic: string;
  questionText: string;
  description: string | null;
  reviewStatus: string;
  positions: Array<{
    position: {
      id: string;
      partyId: string;
      positionValue: number | null;
      summary: string;
      sourceQuote: string;
      sourceUrl: string;
      confidence: string;
      aiInterpretation: string;
      reviewStatus: string;
      conflictingSources: boolean;
      party: { shortName: string; name: string };
    };
  }>;
};

// ── Statiska val ───────────────────────────────────────────────────────────

const PARTIES = [
  { id: "socialdemokraterna", short: "S" },
  { id: "moderaterna", short: "M" },
  { id: "sverigedemokraterna", short: "SD" },
  { id: "vansterpartiet", short: "V" },
  { id: "centerpartiet", short: "C" },
  { id: "kristdemokraterna", short: "KD" },
  { id: "liberalerna", short: "L" },
  { id: "miljopartiet", short: "MP" },
];

const TOPICS = [
  "ekonomi", "skatter", "jobb", "skola", "vård", "klimat", "energi",
  "migration", "lag_ordning", "bostäder", "försvar", "eu",
  "landsbygd", "jämställdhet", "socialförsäkring",
];

// ── Markdown-formatering ───────────────────────────────────────────────────

function fmtVal(v: number | null): string {
  if (v === null) return "okänd";
  return v > 0 ? `+${v}` : String(v);
}

function formatQuestionsMarkdown(questions: ExportQuestion[]): string {
  const lines: string[] = [
    "# Valkompass — Export för ChatGPT-granskning",
    "",
    `Exportdatum: ${new Date().toLocaleDateString("sv-SE")}`,
    `Antal frågor: ${questions.length}`,
    "",
    "---",
    "",
    "## Instruktioner för granskare",
    "",
    "Granska varje fråga och dess partipositioner. Svara med:",
    "- **GODKÄNN** — frågan och positionerna är korrekta, neutrala och välgrundade",
    "- **ÄNDRA** — ange vad som bör ändras (frågeformulering, positionsvärde eller sammanfattning)",
    "- **AVVISA** — ange varför (otydlig, okälla, ej relevant, inte tillräcklig partiåtskillnad)",
    "",
    "---",
    "",
  ];

  questions.forEach((q, i) => {
    lines.push(`## Fråga ${i + 1}`);
    lines.push(`**question_id:** ${q.id}`);
    lines.push(`**topic:** ${q.topic}`);
    lines.push(`**question:** ${q.questionText}`);
    if (q.description) lines.push(`**description:** ${q.description}`);
    lines.push(`**review_status:** ${q.reviewStatus}`);
    lines.push("");
    lines.push("### Partipositioner");
    lines.push("");

    q.positions.forEach((qp) => {
      const p = qp.position;
      lines.push(`- **${p.party.shortName}: ${fmtVal(p.positionValue)}**`);
      lines.push(`  Sammanfattning: ${p.summary}`);
      lines.push(`  Citat: "${p.sourceQuote}"`);
      lines.push(`  Källa: ${p.sourceUrl}`);
      lines.push(`  Confidence: ${p.confidence}`);
      lines.push(`  AI-tolkning: ${p.aiInterpretation}`);
      if (p.conflictingSources) lines.push(`  ⚠ Motstridiga signaler i källan`);
      lines.push("");
    });

    lines.push("### Granskningsfrågor");
    lines.push("");
    lines.push("- Är frågan neutral och tydlig?");
    lines.push("- Finns verklig meningsskiljaktighet mellan partierna?");
    lines.push("- Stödjer citaten positionerna?");
    lines.push("- Bör frågan godkännas, ändras eller avvisas?");
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

function formatPositionsMarkdown(positions: ExportPosition[]): string {
  const lines: string[] = [
    "# Valkompass — Partipositioner för granskning",
    "",
    `Exportdatum: ${new Date().toLocaleDateString("sv-SE")}`,
    `Antal positioner: ${positions.length}`,
    "",
    "---",
    "",
  ];

  let currentTopic = "";
  positions.forEach((pos, i) => {
    if (pos.topic !== currentTopic) {
      currentTopic = pos.topic;
      lines.push(`## ${pos.topic}`);
      lines.push("");
    }

    lines.push(`### Position ${i + 1} — ${pos.party.shortName}`);
    lines.push(`**position_id:** ${pos.id}`);
    lines.push(`**party:** ${pos.party.name} (${pos.party.shortName})`);
    lines.push(`**topic:** ${pos.topic}`);
    lines.push(`**issue:** ${pos.specificQuestion}`);
    lines.push(`**position_summary:** ${pos.summary}`);
    lines.push(`**position_value:** ${fmtVal(pos.positionValue)}`);
    lines.push(`**confidence:** ${pos.confidence}`);
    lines.push(`**review_status:** ${pos.reviewStatus}`);
    lines.push(`**evidence_quote:** "${pos.sourceQuote}"`);
    lines.push(`**source_url:** ${pos.sourceUrl}`);
    lines.push(`**ai_interpretation:** ${pos.aiInterpretation}`);
    if (pos.conflictingSources) lines.push(`⚠ Motstridiga signaler i källan`);
    lines.push("");
  });

  return lines.join("\n");
}

// ── Komponent ──────────────────────────────────────────────────────────────

export default function ExportTab() {
  const [filters, setFilters] = useState({
    type: "questions" as "questions" | "positions",
    reviewStatus: "",
    topic: "",
    partyId: "",
    top40: false,
  });
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [itemCount, setItemCount] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setOutput("");
    setItemCount(null);

    const params = new URLSearchParams({ type: filters.type });
    if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.type === "positions" && filters.partyId) params.set("partyId", filters.partyId);
    if (filters.top40) params.set("top40", "true");

    const res = await fetch(`/api/admin/export?${params}`);
    const data = await res.json();

    let markdown = "";
    if (filters.type === "questions") {
      markdown = formatQuestionsMarkdown(data as ExportQuestion[]);
      setItemCount((data as ExportQuestion[]).length);
    } else {
      markdown = formatPositionsMarkdown(data as ExportPosition[]);
      setItemCount((data as ExportPosition[]).length);
    }

    setOutput(markdown);
    setLoading(false);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const f = filters;
  const setF = (patch: Partial<typeof filters>) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-6">
      {/* Filter-panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Exportinställningar</h2>

        {/* Typ */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="type" value="questions" checked={f.type === "questions"} onChange={() => setF({ type: "questions", top40: false })} className="accent-blue-600" />
            <span className="text-sm">Valkompassfrågor</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="type" value="positions" checked={f.type === "positions"} onChange={() => setF({ type: "positions", top40: false })} className="accent-blue-600" />
            <span className="text-sm">Partipositioner</span>
          </label>
        </div>

        {/* Filter-rad */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Status</label>
            <select value={f.reviewStatus} onChange={(e) => setF({ reviewStatus: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">Alla</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="NEEDS_MORE_SOURCE">Needs More Source</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Sakområde</label>
            <select value={f.topic} onChange={(e) => setF({ topic: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">Alla</option>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {f.type === "positions" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Parti</label>
              <select value={f.partyId} onChange={(e) => setF({ partyId: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                {PARTIES.map((p) => <option key={p.id} value={p.id}>{p.short} — {p.id}</option>)}
              </select>
            </div>
          )}

          {f.type === "questions" && (
            <div className="flex flex-col gap-1 justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <input type="checkbox" checked={f.top40} onChange={(e) => setF({ top40: e.target.checked })} className="accent-blue-600" />
                <span className="text-sm">Topp 40 frågor</span>
              </label>
              <p className="text-xs text-gray-400 -mt-1">Sorteras efter täckning, konfidensgrad och partiåtskillnad</p>
            </div>
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Genererar..." : "Generera export"}
        </button>
      </div>

      {/* Output */}
      {output && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {itemCount !== null && (
                <span className="font-medium">{itemCount} {f.type === "questions" ? "frågor" : "positioner"}</span>
              )}{" "}
              exporterade · {Math.round(output.length / 1000)} kB text
            </p>
            <button
              onClick={copyAll}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-gray-800 text-white hover:bg-gray-900"}`}
            >
              {copied ? "✓ Kopierat!" : "Kopiera export för ChatGPT-granskning"}
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            rows={30}
            className="w-full font-mono text-xs border border-gray-300 rounded-lg p-4 bg-gray-50 resize-y focus:outline-none"
          />
          <button
            onClick={copyAll}
            className={`w-full py-2 rounded text-sm font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-gray-800 text-white hover:bg-gray-900"}`}
          >
            {copied ? "✓ Kopierat!" : "Kopiera export för ChatGPT-granskning"}
          </button>
        </div>
      )}

      {!output && !loading && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Välj filter och klicka <strong>Generera export</strong> för att skapa markdown-text redo att klistra in i ChatGPT.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  party: { name: string; shortName: string; website: string };
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

// ── Constants ─────────────────────────────────────────────────────────────────

const PARTIES = [
  { id: "socialdemokraterna", short: "S" },
  { id: "moderaterna",        short: "M" },
  { id: "sverigedemokraterna",short: "SD" },
  { id: "vansterpartiet",     short: "V" },
  { id: "centerpartiet",      short: "C" },
  { id: "kristdemokraterna",  short: "KD" },
  { id: "liberalerna",        short: "L" },
  { id: "miljopartiet",       short: "MP" },
];

const TOPICS = [
  "ekonomi", "skatter", "jobb", "skola", "vård", "klimat", "energi",
  "migration", "lag_ordning", "bostäder", "försvar", "eu",
  "landsbygd", "jämställdhet", "socialförsäkring",
];

// ── Markdown formatters ───────────────────────────────────────────────────────

function fmtVal(v: number | null): string {
  if (v === null) return "okänd";
  return v > 0 ? `+${v}` : String(v);
}

function buildFilterSummary(f: PosFilters): string {
  const parts: string[] = [];
  if (f.confidence) parts.push(`confidence=${f.confidence}`);
  if (f.reviewStatus) parts.push(`status=${f.reviewStatus}`);
  if (f.topic) parts.push(`topic=${f.topic}`);
  if (f.partyId) parts.push(`parti=${f.partyId}`);
  if (f.onlyConcrete) parts.push("konkreta Bör-frågor");
  if (f.excludeDuplicates) parts.push("ej dubbletter");
  if (f.officialOnly) parts.push("officiella källor");
  return parts.join(", ") || "inga filter";
}

function formatPositionsMarkdown(positions: ExportPosition[], filters: PosFilters): string {
  const lines: string[] = [
    "# Valkompass — Partipositioner för ChatGPT-granskning",
    "",
    `Exportdatum: ${new Date().toLocaleDateString("sv-SE")}`,
    `Antal positioner: ${positions.length}`,
    `Filter: ${buildFilterSummary(filters)}`,
    "",
    "## Instruktioner",
    "",
    "Granska varje position. Svara med ett av:",
    "- **GODKÄNN** — positionen är korrekt och källan stöder påståendet",
    "- **ÄNDRA** — ange vad som bör ändras (issue-formulering, position_value, sammanfattning)",
    "- **AVVISA** — ange orsak (svag källa, otydlig, ej konkret policy, slogan)",
    "",
    "---",
    "",
  ];

  positions.forEach((pos, i) => {
    lines.push(`## ${i + 1}. ${pos.party.shortName} — ${pos.topic}`);
    lines.push("");
    lines.push(`**position_id:** ${pos.id}`);
    lines.push(`**party:** ${pos.party.name} (${pos.party.shortName})`);
    lines.push(`**topic:** ${pos.topic}`);
    lines.push(`**issue:** ${pos.specificQuestion}`);
    lines.push(`**position_value:** ${fmtVal(pos.positionValue)}`);
    lines.push(`**confidence:** ${pos.confidence}`);
    lines.push(`**evidence_quote:** "${pos.sourceQuote}"`);
    lines.push(`**source_url:** ${pos.sourceUrl}`);
    lines.push(`**ai_interpretation:** ${pos.aiInterpretation}`);
    if (pos.conflictingSources) lines.push(`**OBS:** Motstridiga signaler i källan`);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

function formatQuestionsMarkdown(questions: ExportQuestion[]): string {
  const lines: string[] = [
    "# Valkompass — Frågor för ChatGPT-granskning",
    "",
    `Exportdatum: ${new Date().toLocaleDateString("sv-SE")}`,
    `Antal frågor: ${questions.length}`,
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
    lines.push("");
    lines.push("### Partipositioner");
    lines.push("");
    q.positions.forEach((qp) => {
      const p = qp.position;
      lines.push(`- **${p.party.shortName}: ${fmtVal(p.positionValue)}**  `);
      lines.push(`  Citat: "${p.sourceQuote}"  `);
      lines.push(`  Källa: ${p.sourceUrl}  `);
      lines.push(`  Confidence: ${p.confidence}`);
      lines.push("");
    });
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

// ── State types ───────────────────────────────────────────────────────────────

type PosFilters = {
  confidence: string;
  reviewStatus: string;
  topic: string;
  partyId: string;
  excludeDuplicates: boolean;
  onlyConcrete: boolean;
  officialOnly: boolean;
  maxCount: number;
};

const DEFAULT_POS_FILTERS: PosFilters = {
  confidence: "HIGH",
  reviewStatus: "PENDING",
  topic: "",
  partyId: "",
  excludeDuplicates: true,
  onlyConcrete: true,
  officialOnly: false,
  maxCount: 60,
};

const TOP60_FILTERS: PosFilters = {
  confidence: "HIGH",
  reviewStatus: "PENDING",
  topic: "",
  partyId: "",
  excludeDuplicates: true,
  onlyConcrete: true,
  officialOnly: true,
  maxCount: 60,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExportTab() {
  const [exportType, setExportType] = useState<"positions" | "questions">("positions");

  // Position filters
  const [posFilters, setPosFilters] = useState<PosFilters>(DEFAULT_POS_FILTERS);

  // Question filters (existing)
  const [qFilters, setQFilters] = useState({ reviewStatus: "", topic: "", top40: false });

  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [itemCount, setItemCount] = useState<number | null>(null);

  async function generate(overrideType?: "positions" | "questions", overrideFilters?: PosFilters) {
    const type = overrideType ?? exportType;
    const pf   = overrideFilters ?? posFilters;

    setLoading(true);
    setOutput("");
    setItemCount(null);

    const params = new URLSearchParams({ type });

    if (type === "positions") {
      if (pf.confidence)         params.set("confidence",        pf.confidence);
      if (pf.reviewStatus)       params.set("reviewStatus",      pf.reviewStatus);
      if (pf.topic)              params.set("topic",             pf.topic);
      if (pf.partyId)            params.set("partyId",           pf.partyId);
      if (pf.excludeDuplicates)  params.set("excludeDuplicates", "true");
      if (pf.onlyConcrete)       params.set("onlyConcrete",      "true");
      if (pf.officialOnly)       params.set("officialOnly",      "true");
      params.set("maxCount", String(pf.maxCount));
    } else {
      if (qFilters.reviewStatus) params.set("reviewStatus", qFilters.reviewStatus);
      if (qFilters.topic)        params.set("topic",        qFilters.topic);
      if (qFilters.top40)        params.set("top40",        "true");
    }

    const res  = await fetch(`/api/admin/export?${params}`);
    const data = await res.json();

    let markdown = "";
    if (type === "positions") {
      markdown = formatPositionsMarkdown(data as ExportPosition[], pf);
      setItemCount((data as ExportPosition[]).length);
    } else {
      markdown = formatQuestionsMarkdown(data as ExportQuestion[]);
      setItemCount((data as ExportQuestion[]).length);
    }

    setOutput(markdown);
    setLoading(false);
  }

  async function generateTop60() {
    setPosFilters(TOP60_FILTERS);
    setExportType("positions");
    await generate("positions", TOP60_FILTERS);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const setP = (patch: Partial<PosFilters>) => setPosFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-6">
      {/* Type toggle */}
      <div className="flex gap-4 bg-white border border-gray-200 rounded-lg px-5 py-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="exportType" value="positions" checked={exportType === "positions"} onChange={() => setExportType("positions")} className="accent-blue-600" />
          <span className="text-sm font-medium">Partipositioner</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="exportType" value="questions" checked={exportType === "questions"} onChange={() => setExportType("questions")} className="accent-blue-600" />
          <span className="text-sm font-medium">Valkompassfrågor</span>
        </label>
      </div>

      {/* ── Positions filter panel ── */}
      {exportType === "positions" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Filter — positioner</h2>

          {/* Row 1: dropdowns */}
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Confidence</label>
              <select value={posFilters.confidence} onChange={(e) => setP({ confidence: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Status</label>
              <select value={posFilters.reviewStatus} onChange={(e) => setP({ reviewStatus: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                <option value="PENDING">Pending</option>
                <option value="READY_FOR_APPROVAL">Ready for Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Sakområde</label>
              <select value={posFilters.topic} onChange={(e) => setP({ topic: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Parti</label>
              <select value={posFilters.partyId} onChange={(e) => setP({ partyId: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                {PARTIES.map((p) => <option key={p.id} value={p.id}>{p.short}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Max antal</label>
              <input
                type="number"
                min={1}
                max={500}
                value={posFilters.maxCount}
                onChange={(e) => setP({ maxCount: Math.max(1, parseInt(e.target.value) || 60) })}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-20"
              />
            </div>
          </div>

          {/* Row 2: checkboxes */}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={posFilters.excludeDuplicates} onChange={(e) => setP({ excludeDuplicates: e.target.checked })} className="accent-blue-600" />
              <span className="text-sm">Exkludera dubbletter</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={posFilters.onlyConcrete} onChange={(e) => setP({ onlyConcrete: e.target.checked })} className="accent-blue-600" />
              <span className="text-sm">Endast konkreta &ldquo;Bör&rdquo;-frågor</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={posFilters.officialOnly} onChange={(e) => setP({ officialOnly: e.target.checked })} className="accent-blue-600" />
              <span className="text-sm">Officiella partiwebbplatser</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => generate()}
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Genererar..." : "Generera export"}
            </button>
            <button
              onClick={generateTop60}
              disabled={loading}
              className="bg-indigo-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Genererar..." : "Exportera topp 60 för ChatGPT-granskning"}
            </button>
          </div>
        </div>
      )}

      {/* ── Questions filter panel ── */}
      {exportType === "questions" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Filter — valkompassfrågor</h2>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Status</label>
              <select value={qFilters.reviewStatus} onChange={(e) => setQFilters((f) => ({ ...f, reviewStatus: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Sakområde</label>
              <select value={qFilters.topic} onChange={(e) => setQFilters((f) => ({ ...f, topic: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Alla</option>
                {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 justify-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={qFilters.top40} onChange={(e) => setQFilters((f) => ({ ...f, top40: e.target.checked }))} className="accent-blue-600" />
                <span className="text-sm">Topp 40 frågor</span>
              </label>
            </div>
          </div>

          <button
            onClick={() => generate()}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Genererar..." : "Generera export"}
          </button>
        </div>
      )}

      {/* ── Output area ── */}
      {output && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{itemCount}</span>{" "}
              {exportType === "positions" ? "positioner" : "frågor"}{" "}
              &middot; {Math.round(output.length / 1000)} kB text
            </p>
            <button
              onClick={copyAll}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-gray-800 text-white hover:bg-gray-900"}`}
            >
              {copied ? "✓ Kopierat!" : "Kopiera allt"}
            </button>
          </div>

          <textarea
            readOnly
            value={output}
            rows={32}
            className="w-full font-mono text-xs border border-gray-300 rounded-lg p-4 bg-gray-50 resize-y focus:outline-none"
          />

          <button
            onClick={copyAll}
            className={`w-full py-2 rounded text-sm font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-gray-800 text-white hover:bg-gray-900"}`}
          >
            {copied ? "✓ Kopierat!" : "Kopiera allt"}
          </button>
        </div>
      )}

      {!output && !loading && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Välj filter och klicka <strong>Generera export</strong> — eller använd{" "}
          <strong>Exportera topp 60</strong> för direktexport till ChatGPT.
        </div>
      )}
    </div>
  );
}

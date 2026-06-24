"use client";

import { useEffect, useState, useCallback } from "react";

type Position = {
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
  reviewNote: string | null;
  conflictingSources: boolean;
  party: { name: string; shortName: string };
  source: { url: string; title: string | null; fetchedAt: string; sourceType: string };
};

type Question = {
  id: string;
  topic: string;
  questionText: string;
  description: string | null;
  reviewStatus: string;
  positions: Array<{
    position: { partyId: string; positionValue: number | null; party: { shortName: string } };
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  NEEDS_MORE_SOURCE: "bg-orange-100 text-orange-800",
  NEEDS_REVIEW: "bg-purple-100 text-purple-800",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "text-green-700",
  MEDIUM: "text-yellow-700",
  LOW: "text-red-700",
  UNKNOWN: "text-gray-500",
};

const SCALE_LABELS: Record<string, string> = {
  "-2": "−2 (Starkt emot)",
  "-1": "−1 (Delvis emot)",
  "0": "0 (Neutral)",
  "1": "+1 (Delvis för)",
  "2": "+2 (Starkt för)",
};

export default function AdminPage() {
  const [tab, setTab] = useState<"positions" | "questions">("positions");
  const [positions, setPositions] = useState<Position[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ partyId: "", topic: "", reviewStatus: "PENDING" });
  const [editing, setEditing] = useState<Record<string, { summary: string; positionValue: string; reviewNote: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.partyId) params.set("partyId", filters.partyId);
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
    const res = await fetch(`/api/admin/positions?${params}`);
    setPositions(await res.json());
    setLoading(false);
  }, [filters]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/questions");
    setQuestions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "positions") fetchPositions();
    else fetchQuestions();
  }, [tab, fetchPositions, fetchQuestions]);

  const allParties = [...new Set(positions.map((p) => p.partyId))].sort();
  const allTopics = [...new Set(positions.map((p) => p.topic))].sort();

  function startEdit(pos: Position) {
    setEditing((prev) => ({
      ...prev,
      [pos.id]: {
        summary: pos.summary,
        positionValue: pos.positionValue?.toString() ?? "",
        reviewNote: pos.reviewNote ?? "",
      },
    }));
  }

  async function updatePosition(id: string, patch: Record<string, unknown>) {
    setSaving(id);
    await fetch(`/api/admin/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await fetchPositions();
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setSaving(null);
  }

  async function updateQuestion(id: string, patch: Record<string, unknown>) {
    setSaving(id);
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await fetchQuestions();
    setSaving(null);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Granska och godkänn partipositioner och valkompassfrågor.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("positions")}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === "positions" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Partipositioner
        </button>
        <button
          onClick={() => setTab("questions")}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === "questions" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Valkompassfrågor
        </button>
      </div>

      {/* POSITIONS TAB */}
      {tab === "positions" && (
        <>
          <div className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded-lg border border-gray-200">
            <select value={filters.reviewStatus} onChange={(e) => setFilters((f) => ({ ...f, reviewStatus: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">Alla statusar</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="NEEDS_MORE_SOURCE">Needs More Source</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>
            <select value={filters.partyId} onChange={(e) => setFilters((f) => ({ ...f, partyId: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">Alla partier</option>
              {allParties.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.topic} onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">Alla sakområden</option>
              {allTopics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="ml-auto text-xs text-gray-400 self-center">{positions.length} positioner</span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Laddar...</div>
          ) : positions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              Inga positioner hittades.<br />
              <span className="text-xs">Kör <code className="bg-gray-100 px-1 rounded">npm run crawl</code> och sedan <code className="bg-gray-100 px-1 rounded">npm run extract</code>.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((pos) => {
                const isExpanded = expandedId === pos.id;
                const editState = editing[pos.id];
                return (
                  <div key={pos.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => { setExpandedId(isExpanded ? null : pos.id); if (!editing[pos.id]) startEdit(pos); }}>
                      <span className="shrink-0 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">{pos.party.shortName}</span>
                      <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{pos.topic}</span>
                      <span className="flex-1 text-sm font-medium">{pos.specificQuestion}</span>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${CONFIDENCE_COLORS[pos.confidence] ?? ""}`}>{pos.confidence}</span>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[pos.reviewStatus] ?? ""}`}>{pos.reviewStatus}</span>
                      {pos.positionValue !== null && <span className="shrink-0 text-xs text-gray-600 font-mono">{pos.positionValue > 0 ? "+" : ""}{pos.positionValue}</span>}
                      <span className="shrink-0 text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Källcitat</p>
                            <blockquote className="text-sm italic text-gray-700 bg-white border-l-4 border-blue-300 pl-3 py-2 rounded-r">&ldquo;{pos.sourceQuote}&rdquo;</blockquote>
                            <a href={pos.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block truncate">{pos.sourceUrl}</a>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">AI-tolkning</p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">{pos.aiInterpretation}</p>
                            {pos.conflictingSources && <p className="text-xs text-orange-600 mt-1">⚠ Motstridiga signaler i källan</p>}
                          </div>
                        </div>
                        {editState && (
                          <div className="space-y-3 bg-white border border-gray-200 rounded p-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Sammanfattning</label>
                              <textarea value={editState.summary} onChange={(e) => setEditing((prev) => ({ ...prev, [pos.id]: { ...prev[pos.id], summary: e.target.value } }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none" rows={2} />
                            </div>
                            <div className="flex gap-4 items-end">
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Position</label>
                                <select value={editState.positionValue} onChange={(e) => setEditing((prev) => ({ ...prev, [pos.id]: { ...prev[pos.id], positionValue: e.target.value } }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                                  <option value="">Okänd</option>
                                  {[-2, -1, 0, 1, 2].map((v) => <option key={v} value={v}>{SCALE_LABELS[v.toString()]}</option>)}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Anteckning</label>
                                <input type="text" value={editState.reviewNote} onChange={(e) => setEditing((prev) => ({ ...prev, [pos.id]: { ...prev[pos.id], reviewNote: e.target.value } }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap pt-1">
                              <button onClick={() => updatePosition(pos.id, { summary: editState.summary, positionValue: editState.positionValue !== "" ? parseFloat(editState.positionValue) : null, reviewNote: editState.reviewNote || null, reviewStatus: "APPROVED" })} disabled={saving === pos.id} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">✓ Godkänn</button>
                              <button onClick={() => updatePosition(pos.id, { reviewStatus: "REJECTED" })} disabled={saving === pos.id} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">✗ Avvisa</button>
                              <button onClick={() => updatePosition(pos.id, { reviewStatus: "NEEDS_MORE_SOURCE" })} disabled={saving === pos.id} className="bg-orange-500 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-50">? Mer källa</button>
                              <button onClick={() => updatePosition(pos.id, { summary: editState.summary, positionValue: editState.positionValue !== "" ? parseFloat(editState.positionValue) : null, reviewNote: editState.reviewNote || null })} disabled={saving === pos.id} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-300 disabled:opacity-50">Spara</button>
                              {saving === pos.id && <span className="text-xs text-gray-400 self-center">Sparar...</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* QUESTIONS TAB */}
      {tab === "questions" && (
        <>
          {loading ? (
            <div className="text-center py-16 text-gray-400">Laddar...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              Inga frågor hittades.<br />
              <span className="text-xs">Godkänn positioner och kör sedan <code className="bg-gray-100 px-1 rounded">npm run generate-questions</code>.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div key={q.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-0.5">{q.topic}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.questionText}</p>
                    {q.description && <p className="text-xs text-gray-400 mt-0.5">{q.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.positions.map((qp) => (
                        <span key={qp.position.partyId} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {qp.position.party.shortName} {qp.position.positionValue !== null ? (qp.position.positionValue > 0 ? "+" : "") + qp.position.positionValue : "?"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[q.reviewStatus] ?? ""}`}>{q.reviewStatus}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => updateQuestion(q.id, { reviewStatus: "APPROVED" })} disabled={saving === q.id || q.reviewStatus === "APPROVED"} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40">✓</button>
                    <button onClick={() => updateQuestion(q.id, { reviewStatus: "REJECTED" })} disabled={saving === q.id || q.reviewStatus === "REJECTED"} className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-600 disabled:opacity-40">✗</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

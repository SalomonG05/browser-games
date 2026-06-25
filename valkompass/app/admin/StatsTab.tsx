"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = {
  byStatus: Record<string, number>;
  byParty: Array<{ partyId: string; name: string; shortName: string; count: number; pct: number }>;
  byTopic: Array<{ topic: string; count: number }>;
  duplicateEstimate: number;
  balanceWarning: string | null;
};

type CleanupResult = { duplicatesRemoved: number; flaggedNeedsReview: number; markedReady: number };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Väntar",
  READY_FOR_APPROVAL: "Redo",
  NEEDS_REVIEW: "Behöver granskning",
  NEEDS_MORE_SOURCE: "Behöver källa",
  APPROVED: "Godkänd",
  REJECTED: "Avvisad",
};

const STATUS_CHIP: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  NEEDS_MORE_SOURCE: "bg-orange-100 text-orange-800",
  NEEDS_REVIEW: "bg-purple-100 text-purple-800",
  READY_FOR_APPROVAL: "bg-teal-100 text-teal-800",
};

const STATUS_ORDER = [
  "READY_FOR_APPROVAL",
  "PENDING",
  "NEEDS_REVIEW",
  "NEEDS_MORE_SOURCE",
  "APPROVED",
  "REJECTED",
];

export default function StatsTab({ onRefresh }: { onRefresh: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [approveResult, setApproveResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      setStats(await res.json());
    } catch {
      setError("Kunde inte hämta statistik.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function runCleanup() {
    setCleaning(true);
    setCleanupResult(null);
    setApproveResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setCleanupResult(await res.json());
      fetchStats();
      onRefresh();
    } catch (e) {
      setError(`Städning misslyckades: ${e}`);
    } finally {
      setCleaning(false);
    }
  }

  async function approveReady() {
    setApproving(true);
    setApproveResult(null);
    setCleanupResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/approve-ready", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApproveResult(data.approved);
      fetchStats();
      onRefresh();
    } catch (e) {
      setError(`Godkännande misslyckades: ${e}`);
    } finally {
      setApproving(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Laddar statistik...</div>;
  if (!stats) return null;

  const readyCount = stats.byStatus["READY_FOR_APPROVAL"] ?? 0;
  const totalNonRejected = stats.byParty.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-6">
      {/* Balance warning */}
      {stats.balanceWarning && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex gap-3 items-start">
          <span className="text-orange-500 text-lg shrink-0 mt-0.5">⚠</span>
          <p className="text-sm text-orange-800">{stats.balanceWarning}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Status overview */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statusöversikt</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((status) => {
            const count = status === "EST_DUPLICATES"
              ? stats.duplicateEstimate
              : (stats.byStatus[status] ?? 0);
            return (
              <div key={status} className={`rounded-lg px-4 py-3 text-center min-w-[110px] ${STATUS_CHIP[status] ?? "bg-gray-100 text-gray-700"}`}>
                <div className="text-2xl font-bold tabular-nums">{count}</div>
                <div className="text-xs font-medium mt-0.5">{STATUS_LABELS[status] ?? status}</div>
              </div>
            );
          })}
          <div className="rounded-lg px-4 py-3 text-center min-w-[110px] bg-blue-50 text-blue-700">
            <div className="text-2xl font-bold tabular-nums">{stats.duplicateEstimate}</div>
            <div className="text-xs font-medium mt-0.5">Est. dubbletter</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 items-start">
        <div>
          <button
            onClick={runCleanup}
            disabled={cleaning}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {cleaning ? "Städar..." : "Städa positioner automatiskt"}
          </button>
          <p className="text-xs text-gray-400 mt-1">Deduplicerar, flaggar svaga, markerar starka</p>
        </div>
        <div>
          <button
            onClick={approveReady}
            disabled={approving || readyCount === 0}
            className="bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {approving ? "Godkänner..." : `Godkänn alla READY_FOR_APPROVAL (${readyCount})`}
          </button>
          <p className="text-xs text-gray-400 mt-1">Positioner med hög confidence och konkret källa</p>
        </div>
      </div>

      {/* Cleanup result */}
      {cleanupResult && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800">
          <p className="font-semibold mb-1">Städning klar</p>
          <ul className="space-y-0.5">
            <li>Dubbletter borttagna: <strong>{cleanupResult.duplicatesRemoved}</strong></li>
            <li>Flaggade NEEDS_REVIEW: <strong>{cleanupResult.flaggedNeedsReview}</strong></li>
            <li>Markerade READY_FOR_APPROVAL: <strong>{cleanupResult.markedReady}</strong></li>
          </ul>
        </div>
      )}

      {/* Approve result */}
      {approveResult !== null && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
          Godkände <strong>{approveResult}</strong> positioner.
        </div>
      )}

      {/* Per-party breakdown */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Positioner per parti <span className="normal-case font-normal">({totalNonRejected} totalt, ej avvisade)</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Parti</th>
                <th className="px-4 py-2 text-right w-20">Antal</th>
                <th className="px-4 py-2 text-left">Andel</th>
              </tr>
            </thead>
            <tbody>
              {stats.byParty.map((p) => (
                <tr key={p.partyId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-1.5 py-0.5 rounded mr-2">
                      {p.shortName}
                    </span>
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{p.count}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[80px]">
                        <div
                          className={`h-2 rounded-full transition-all ${p.pct > 30 ? "bg-orange-400" : "bg-blue-400"}`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className={`text-xs tabular-nums w-8 text-right ${p.pct > 30 ? "text-orange-600 font-semibold" : "text-gray-500"}`}>
                        {p.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-topic breakdown */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Positioner per sakområde</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Sakområde</th>
                <th className="px-4 py-2 text-right w-20">Antal</th>
              </tr>
            </thead>
            <tbody>
              {stats.byTopic.map((t) => (
                <tr key={t.topic} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">{t.topic}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

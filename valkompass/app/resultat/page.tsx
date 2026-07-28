"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TopicScore = {
  topic: string;
  matchPercent: number;
  questionsMatched: number;
};

type QuestionRef = {
  questionId: string;
  questionText: string;
  diff: number;
};

type PartyResult = {
  partyId: string;
  matchPercent: number;
  questionsMatched: number;
  questionsMissing: number;
  questionsSkipped: number;
  topicBreakdown: TopicScore[];
  closeQuestions: QuestionRef[];
  farQuestions: QuestionRef[];
  party: { id: string; name: string; shortName: string; website: string };
};

type Result = {
  scores: PartyResult[];
  totalQuestions: number;
};

const PARTY_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-red-500", "bg-purple-500",
  "bg-orange-500", "bg-teal-500", "bg-rose-500", "bg-amber-500",
];

export default function ResultatPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("valkompass_result");
    if (raw) setResult(JSON.parse(raw));
  }, []);

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500 mb-4">Inget resultat hittades.</p>
        <Link href="/kompass" className="text-blue-600 hover:underline">← Gör testet</Link>
      </div>
    );
  }

  const { scores, totalQuestions } = result;
  const maxMatch = scores[0]?.matchPercent ?? 100;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Ditt resultat</h1>
        <p className="text-sm text-gray-500">
          Matchningen baseras på {scores[0]?.questionsMatched ?? 0} {(scores[0]?.questionsMatched ?? 0) === 1 ? "fråga" : "frågor"} (av {totalQuestions} totalt).
          Frågor som hoppades över eller saknar partiposition räknas inte.
        </p>
      </div>

      {/* Party bars */}
      <div className="space-y-4 mb-10">
        {scores.map((s, i) => {
          const barColor = PARTY_COLORS[i % PARTY_COLORS.length];
          const dataLabel =
            s.questionsMatched < 5  ? "Mycket begränsat underlag" :
            s.questionsMatched < 10 ? "Begränsat underlag" : null;
          return (
            <div key={s.partyId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{s.party.name}</span>
                  <span className="text-xs text-gray-400">({s.party.shortName})</span>
                  {dataLabel && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      ⚠ {dataLabel} ({s.questionsMatched}/{totalQuestions})
                    </span>
                  )}
                </div>
                <span className="font-bold text-lg">{s.matchPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 cursor-pointer" onClick={() => setExpanded(expanded === s.partyId ? null : s.partyId)}>
                <div
                  className={`${barColor} h-4 rounded-full transition-all`}
                  style={{ width: `${maxMatch > 0 ? (s.matchPercent / maxMatch) * 100 : 0}%` }}
                />
              </div>

              {/* Expanded detail */}
              {expanded === s.partyId && (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4 text-sm">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold text-xs text-gray-500 uppercase mb-2">Ämnesvis matchning</p>
                      <div className="space-y-1">
                        {s.topicBreakdown.sort((a, b) => b.matchPercent - a.matchPercent).map((t) => (
                          <div key={t.topic} className="flex justify-between">
                            <span className="text-gray-700">{t.topic}</span>
                            <span className="font-medium text-gray-900">{t.matchPercent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-500 uppercase mb-2">Nära enighet</p>
                      <ul className="space-y-1 mb-3">
                        {s.closeQuestions.map((q) => (
                          <li key={q.questionId} className="text-gray-700 text-xs">
                            ✓ {q.questionText}
                          </li>
                        ))}
                      </ul>
                      <p className="font-semibold text-xs text-gray-500 uppercase mb-2">Störst skillnad</p>
                      <ul className="space-y-1">
                        {s.farQuestions.map((q) => (
                          <li key={q.questionId} className="text-gray-700 text-xs">
                            ✗ {q.questionText}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
                    <span>{s.questionsMatched} frågor matchade</span>
                    {s.questionsMissing > 0 && <span className="text-amber-600">{s.questionsMissing} frågor saknade partiposition</span>}
                    <a href={s.party.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-auto">
                      {s.party.website} →
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 mb-6">
        <strong>Om matchningen:</strong> Procenten beräknas som hur nära ditt svar är partiets position på en skala −2 till +2.
        Viktiga frågor väger tyngre. Frågor du hoppade över räknas inte. Partier med få godkända positioner
        markeras med varning — deras matchning är mer osäker.
      </div>

      <div className="flex gap-3">
        <Link href="/kompass" className="text-sm text-blue-600 hover:underline">← Gör om testet</Link>
      </div>
    </div>
  );
}

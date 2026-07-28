"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  topic: string;
  questionText: string;
  description: string | null;
  weightingEnabled: boolean;
  positions: Array<{ partyId: string; positionValue: number }>;
};

type Answer = {
  questionId: string;
  answer: number | null;
  importance: number;
  skipped: boolean;
};

const SCALE_OPTS = [
  { value: -2, label: "−2", sub: "Instämmer inte alls" },
  { value: -1, label: "−1", sub: "Instämmer delvis inte" },
  { value: 0, label: "0", sub: "Neutral" },
  { value: 1, label: "+1", sub: "Instämmer delvis" },
  { value: 2, label: "+2", sub: "Instämmer helt" },
];

const IMPORTANCE_OPTS = [
  { value: 0, label: "Inte viktig" },
  { value: 1, label: "Ganska viktig" },
  { value: 2, label: "Mycket viktig" },
];

export default function KompassPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [importance, setImportance] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Laddar frågor...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">Inga frågor tillgängliga</h2>
        <p className="text-gray-500 text-sm">
          Inga godkända frågor finns ännu. Gå till{" "}
          <a href="/admin" className="text-blue-600 hover:underline">adminvyn</a> för att granska och godkänna partipositioner och frågor.
        </p>
      </div>
    );
  }

  const question = questions[current];
  const progress = Math.round((current / questions.length) * 100);

  function commitAnswer(skipped: boolean) {
    const answer: Answer = {
      questionId: question.id,
      answer: skipped ? null : selectedAnswer,
      importance: skipped ? 1 : importance,
      skipped,
    };
    const updated = [...answers, answer];
    setAnswers(updated);

    if (current + 1 >= questions.length) {
      submitAnswers(updated);
    } else {
      setCurrent((c) => c + 1);
      setSelectedAnswer(null);
      setImportance(1);
    }
  }

  async function submitAnswers(finalAnswers: Answer[]) {
    setSubmitting(true);
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers }),
    });
    const data = await res.json();
    sessionStorage.setItem("valkompass_result", JSON.stringify(data));
    router.push("/resultat");
  }

  if (submitting) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Beräknar matchning...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Fråga {current + 1} av {questions.length}</span>
          <span>{progress}% klar</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mb-3">
          {question.topic}
        </span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{question.questionText}</h2>
      </div>

      {/* Scale */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Din ståndpunkt:</p>
        <div className="grid grid-cols-5 gap-2">
          {SCALE_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedAnswer(opt.value)}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center ${
                selectedAnswer === opt.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-lg font-bold">{opt.label}</span>
              <span className="text-xs leading-tight mt-1 hidden sm:block">{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Importance */}
      {question.weightingEnabled && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Hur viktig är denna fråga för dig?</p>
          <div className="flex gap-2">
            {IMPORTANCE_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setImportance(opt.value)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  importance === opt.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => commitAnswer(false)}
          disabled={selectedAnswer === null}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {current + 1 >= questions.length ? "Se resultat →" : "Nästa fråga →"}
        </button>
        <button
          onClick={() => commitAnswer(true)}
          className="px-5 py-3 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition-colors"
        >
          Hoppa över
        </button>
      </div>
    </div>
  );
}

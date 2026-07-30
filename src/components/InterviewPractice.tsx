"use client";

import { useState } from "react";
import { Lock, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import type { InterviewQuestionDto } from "@/types/interview";
import { useT } from "@/lib/i18n/useT";

// Flashcard-style practice: question always visible, answer-guidance revealed
// on demand (same interaction pattern as GlossaryTerm) so the user answers in
// their own words first instead of immediately reading the model answer.
export function InterviewPractice() {
  const { user, loading: authLoading } = useAuth();
  const apiKey = useStoredApiKey();
  const [questions, setQuestions] = useState<InterviewQuestionDto[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setRevealed(new Set());
    try {
      const res = await fetch("/api/interview/generate", {
        method: "POST",
        headers: { ...(apiKey ? { "x-gemini-api-key": apiKey } : {}) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.generationFailedError);
      setQuestions(data.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.generationFailedError);
    } finally {
      setLoading(false);
    }
  }

  function toggleReveal(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Lock className="w-10 h-10 mb-1 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.interviewPractice.loginPrompt}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1.5 flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4" strokeWidth={2.25} /> {t.interviewPractice.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{t.interviewPractice.description}</p>
        {!apiKey && (
          <p className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 text-amber-800 dark:text-amber-400 text-xs mb-3">
            {t.interviewPractice.apiKeyWarning}
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {loading ? t.common.generating : questions.length > 0 ? t.interviewPractice.regenerateButton : t.interviewPractice.generateButton}
        </button>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {questions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <li key={i} className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{t.interviewPractice.basedOnLabel}{q.basedOn}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Q{i + 1}. {q.question}</p>
              {revealed.has(i) ? (
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-400 text-xs mb-1">{t.interviewPractice.answerPointsLabel}</p>
                  <p className="whitespace-pre-line">{q.answerPoints}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleReveal(i)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t.interviewPractice.showAnswerPoints}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

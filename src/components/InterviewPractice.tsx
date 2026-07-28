"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import type { InterviewQuestionDto } from "@/types/interview";

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
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました");
      setQuestions(data.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました");
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
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-gray-500 text-sm">模擬面接AIを使うにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">🎓 模擬面接AI</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          「保存済み」に入れた記事をもとに、Geminiが技術面接で聞かれそうな質問を作成します。まず自分の言葉で考えてから、回答のポイントを確認しましょう。
        </p>
        {!apiKey && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 text-xs mb-3">
            右上の「APIキー設定」から自分のGemini APIキーを登録してください（未登録の場合は生成に失敗します）。
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {loading ? "生成中..." : questions.length > 0 ? "質問を作り直す" : "質問を生成する"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {questions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <li key={i} className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
              <p className="text-[11px] text-gray-400 mb-1">元記事: {q.basedOn}</p>
              <p className="font-semibold text-gray-800 mb-2">Q{i + 1}. {q.question}</p>
              {revealed.has(i) ? (
                <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2 text-sm text-gray-700">
                  <p className="font-semibold text-indigo-700 text-xs mb-1">回答のポイント</p>
                  <p className="whitespace-pre-line">{q.answerPoints}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleReveal(i)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  回答のポイントを見る ▼
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

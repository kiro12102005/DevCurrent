"use client";

import { useState } from "react";
import { Bug, Lightbulb, MessageCircle, Send, CircleCheckBig } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const FEEDBACK_TYPES = [
  { key: "bug", icon: Bug, label: "バグ報告" },
  { key: "suggestion", icon: Lightbulb, label: "改善提案" },
  { key: "other", icon: MessageCircle, label: "その他" },
] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number]["key"];

const MESSAGE_MAX_LENGTH = 2000;

// Deliberately not gated behind login - a bug report shouldn't require an
// account (POST /api/feedback works either way).
export function FeedbackForm() {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          ...(!user && email.trim() ? { email: email.trim() } : {}),
          pageContext: "mypage-feedback",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送信に失敗しました");
      setDone(true);
      setMessage("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center gap-2">
        <CircleCheckBig className="w-8 h-8 text-emerald-500" strokeWidth={2} />
        <p className="text-sm font-semibold text-gray-800">送信ありがとうございました</p>
        <p className="text-xs text-gray-500">いただいた内容は開発の参考にさせていただきます。</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 text-xs text-indigo-600 hover:underline"
        >
          もう一件送る
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
      <h3 className="font-bold text-gray-800 mb-1">フィードバック</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">
        不具合報告・改善提案など、お気軽にお寄せください。
      </p>

      <div className="flex gap-2 mb-3 flex-wrap">
        {FEEDBACK_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              type === t.key ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={4}
          required
          placeholder={
            type === "bug" ? "どの画面で・何をしたら・どうなったかを教えてください" : "内容を入力してください"
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-[11px] text-gray-400 text-right">{message.length} / {MESSAGE_MAX_LENGTH}</p>

        {!user && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="返信が必要な場合はメールアドレス（任意）"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2.25} /> {submitting ? "送信中..." : "送信する"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Bug, Lightbulb, MessageCircle, Send, CircleCheckBig } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { hapticSuccess } from "@/lib/haptics";
import { useT } from "@/lib/i18n/useT";

const FEEDBACK_TYPE_KEYS = ["bug", "suggestion", "other"] as const;
const FEEDBACK_TYPE_ICON = { bug: Bug, suggestion: Lightbulb, other: MessageCircle } as const;
type FeedbackType = (typeof FEEDBACK_TYPE_KEYS)[number];

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
  const t = useT();

  const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
    bug: t.feedbackForm.typeBug,
    suggestion: t.feedbackForm.typeSuggestion,
    other: t.feedbackForm.typeOther,
  };

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
      if (!res.ok) throw new Error(data.error ?? t.common.saveFailedError);
      hapticSuccess();
      setDone(true);
      setMessage("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.saveFailedError);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center text-center gap-2">
        <CircleCheckBig className="w-8 h-8 text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.feedbackForm.doneTitle}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t.feedbackForm.doneDesc}</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {t.feedbackForm.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{t.feedbackForm.title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{t.feedbackForm.description}</p>

      <div className="flex gap-2 mb-3 flex-wrap">
        {FEEDBACK_TYPE_KEYS.map((key) => {
          const Icon = FEEDBACK_TYPE_ICON[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                type === key ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2.25} /> {FEEDBACK_TYPE_LABEL[key]}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={4}
          required
          placeholder={type === "bug" ? t.feedbackForm.placeholderBug : t.feedbackForm.placeholderOther}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">{message.length} / {MESSAGE_MAX_LENGTH}</p>

        {!user && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.feedbackForm.emailPlaceholder}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2.25} /> {submitting ? t.common.submitting : t.feedbackForm.submitButton}
        </button>
      </form>
    </div>
  );
}

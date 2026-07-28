"use client";

import { useEffect, useState } from "react";
import { Newspaper, Search, Bot, User } from "lucide-react";

const STORAGE_KEY = "onboarding_dismissed_v1";

const STEPS = [
  { icon: Newspaper, title: "フィード", desc: "Qiita/Zenn/Hacker News/ArXivから自動収集。日別・週間で見逃さずキャッチアップ。" },
  { icon: Search, title: "URLで要約", desc: "気になる記事のURLを貼ると、深掘り要約・メリデメ・用語解説をAIが生成。" },
  { icon: Bot, title: "AIツール", desc: "今話題のAIサービス・アプリをカテゴリ別にチェック。" },
  { icon: User, title: "マイページ", desc: "保存した記事・学習マップ・模擬面接・共有ページはここに集約されています。" },
];

// Shown once per browser (localStorage-gated) - the app has grown to 4 tabs
// + a マイページ hub with 4 more sub-sections, so a first-time visitor
// benefits from a 10-second orientation instead of guessing.
export function OnboardingModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // deferred to a microtask so this effect doesn't set state synchronously
    // during its own commit phase (see react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setShow(true);
      }
    });
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold brand-gradient-text mb-1">技術トレンド キャッチアップへようこそ</h2>
        <p className="text-xs text-gray-500 mb-4">4つのタブでできることを簡単にご紹介します。</p>

        <ul className="flex flex-col gap-3 mb-5">
          {STEPS.map((s) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className="shrink-0 rounded-lg bg-indigo-50 text-indigo-600 p-2">
                <s.icon className="w-5 h-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-lg brand-gradient px-4 py-2.5 text-sm font-semibold text-white"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}

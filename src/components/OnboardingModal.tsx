"use client";

import { useEffect, useState } from "react";
import { Newspaper, Search, Bot, User } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

const STORAGE_KEY = "onboarding_dismissed_v1";

const STEP_ICON = [Newspaper, Search, Bot, User] as const;

// Shown once per browser (localStorage-gated) - the app has grown to 4 tabs
// + a マイページ hub with 4 more sub-sections, so a first-time visitor
// benefits from a 10-second orientation instead of guessing.
export function OnboardingModal() {
  const [show, setShow] = useState(false);
  const t = useT();

  const STEPS = [
    { icon: STEP_ICON[0], title: t.onboardingModal.stepFeedTitle, desc: t.onboardingModal.stepFeedDesc },
    { icon: STEP_ICON[1], title: t.onboardingModal.stepSummarizeTitle, desc: t.onboardingModal.stepSummarizeDesc },
    { icon: STEP_ICON[2], title: t.onboardingModal.stepToolsTitle, desc: t.onboardingModal.stepToolsDesc },
    { icon: STEP_ICON[3], title: t.onboardingModal.stepMyPageTitle, desc: t.onboardingModal.stepMyPageDesc },
  ];

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
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-5 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold brand-gradient-text mb-1">{t.onboardingModal.welcomeTitle}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t.onboardingModal.welcomeDesc}</p>

        <ul className="flex flex-col gap-3 mb-5">
          {STEPS.map((s) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className="shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 p-2">
                <s.icon className="w-5 h-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-lg brand-gradient px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t.onboardingModal.startButton}
        </button>
      </div>
    </div>
  );
}

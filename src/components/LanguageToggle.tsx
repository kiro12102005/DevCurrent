"use client";

import { Globe } from "lucide-react";
import { useLanguage, setStoredLanguage, type Language } from "@/lib/i18n/language";
import { hapticTap } from "@/lib/haptics";

const NEXT_LANGUAGE: Record<Language, Language> = {
  ja: "en",
  en: "zh",
  zh: "ja",
};

// Label is always shown in the language it represents, so it never needs a
// dictionary lookup itself (avoids "what language is 'current language' in"
// chicken-and-egg problem). Kept to 1-2 characters to match ThemeToggle's
// compact footprint - the header icon row has previously squeezed the
// logo/title to zero width on a 390px screen.
const LANGUAGE_LABEL: Record<Language, string> = {
  ja: "日本語",
  en: "EN",
  zh: "中文",
};

export function LanguageToggle() {
  const lang = useLanguage();

  return (
    <button
      type="button"
      onClick={() => {
        hapticTap();
        setStoredLanguage(NEXT_LANGUAGE[lang]);
      }}
      aria-label={`Language: ${LANGUAGE_LABEL[lang]} (tap to switch)`}
      title={`Language: ${LANGUAGE_LABEL[lang]}`}
      className="flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-700 px-2 h-7 shrink-0 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
    >
      <Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
      <span className="text-[10px] font-semibold leading-none">{LANGUAGE_LABEL[lang]}</span>
    </button>
  );
}

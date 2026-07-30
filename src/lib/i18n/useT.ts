import { useLanguage } from "./language";
import ja, { type Dictionary } from "./dictionaries/ja";
import en from "./dictionaries/en";
import zh from "./dictionaries/zh";

const DICTIONARIES: Record<string, Dictionary> = { ja, en, zh };

// Nested-object accessor (t.feedList.searchPlaceholder) rather than a flat
// t("feedList.searchPlaceholder") string API - gives autocomplete and a
// compile error on typoed/renamed keys, which matters at this dictionary's
// size. Falls back to the ja tree if a language's dictionary is somehow
// missing a branch at runtime (defense in depth - the Dictionary type on
// en.ts/zh.ts should already prevent this at build time).
export function useT(): Dictionary {
  const lang = useLanguage();
  return DICTIONARIES[lang] ?? ja;
}

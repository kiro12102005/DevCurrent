// Hiragana/Katakana ranges - a title with none of these is almost certainly
// not Japanese (Kanji alone isn't a reliable signal since Chinese shares it).
const JAPANESE_KANA_PATTERN = /[぀-ヿ]/;

export function looksJapanese(text: string): boolean {
  return JAPANESE_KANA_PATTERN.test(text);
}

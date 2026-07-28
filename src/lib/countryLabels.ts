export const COUNTRY_FLAG: Record<string, string> = {
  日本: "🇯🇵",
  アメリカ: "🇺🇸",
  中国: "🇨🇳",
  イギリス: "🇬🇧",
  ドイツ: "🇩🇪",
  フランス: "🇫🇷",
  カナダ: "🇨🇦",
  インド: "🇮🇳",
  韓国: "🇰🇷",
  イスラエル: "🇮🇱",
  その他: "🌐",
};

// Returns null for "不明"/missing so callers can simply omit the badge.
export function countryFlag(country: string | null | undefined): string | null {
  if (!country || country === "不明") return null;
  return COUNTRY_FLAG[country] ?? "🌐";
}

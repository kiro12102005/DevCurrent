// Full date (with year) so recency is unambiguous across a year boundary -
// a bare "7/26" doesn't tell you if that's this year or last year.
export function formatArticleDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

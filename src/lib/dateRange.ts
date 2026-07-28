// JST (UTC+9) day boundaries - this app's audience/content is Japanese, so
// "today" and date labels should follow Japan time, not the server's/browser's
// local timezone.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function jstTodayString(): string {
  const jstNow = new Date(Date.now() + JST_OFFSET_MS);
  return jstNow.toISOString().slice(0, 10);
}

export function jstDateStringDaysAgo(daysAgo: number): string {
  const jstNow = new Date(Date.now() + JST_OFFSET_MS);
  jstNow.setUTCDate(jstNow.getUTCDate() - daysAgo);
  return jstNow.toISOString().slice(0, 10);
}

// [start, end) UTC instants corresponding to the JST calendar day `dateStr` (YYYY-MM-DD)
export function jstDayRange(dateStr: string): [Date, Date] {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
}

// [start, end) for the 7 JST calendar days ending on and including `dateStr`
export function jstWeekRange(dateStr: string): [Date, Date] {
  const [, dayEnd] = jstDayRange(dateStr);
  const start = new Date(dayEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return [start, dayEnd];
}

const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

// e.g. "7/27(日)" - for JST date strings
export function formatShortDateWithWeekday(dateStr: string): string {
  const [start] = jstDayRange(dateStr);
  const jstDate = new Date(start.getTime() + JST_OFFSET_MS);
  const month = jstDate.getUTCMonth() + 1;
  const day = jstDate.getUTCDate();
  const weekday = WEEKDAY_LABELS_JA[jstDate.getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

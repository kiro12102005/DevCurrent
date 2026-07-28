import { describe, it, expect } from "vitest";
import { jstDayRange, jstWeekRange, formatShortDateWithWeekday } from "./dateRange";

describe("jstDayRange", () => {
  it("returns a [start, end) pair exactly 24h apart, anchored to JST midnight", () => {
    const [start, end] = jstDayRange("2024-06-15");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    // 2024-06-15T00:00:00+09:00 === 2024-06-14T15:00:00Z
    expect(start.toISOString()).toBe("2024-06-14T15:00:00.000Z");
  });
});

describe("jstWeekRange", () => {
  it("spans exactly 7 days and ends where the day range for that date ends", () => {
    const [weekStart, weekEnd] = jstWeekRange("2024-06-15");
    const [, dayEnd] = jstDayRange("2024-06-15");
    expect(weekEnd.getTime()).toBe(dayEnd.getTime());
    expect(weekEnd.getTime() - weekStart.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("formatShortDateWithWeekday", () => {
  it("formats a known JST date with the correct Japanese weekday", () => {
    // 2024-01-01 was a Monday
    expect(formatShortDateWithWeekday("2024-01-01")).toBe("1/1(月)");
  });

  it("handles a different known weekday correctly", () => {
    // 2024-01-06 was a Saturday
    expect(formatShortDateWithWeekday("2024-01-06")).toBe("1/6(土)");
  });
});

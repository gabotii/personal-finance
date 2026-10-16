import { describe, expect, it } from "vitest";

import { isValidISODate, isValidMonth, monthRange, shiftMonth, todayISO } from "./dates";

describe("date helpers", () => {
  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 3)).toBe("2027-02");
    expect(shiftMonth("2026-05", 0)).toBe("2026-05");
  });

  it("computes month ranges including leap years", () => {
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(monthRange("2026-04")).toEqual({ from: "2026-04-01", to: "2026-04-30" });
  });

  it("validates ISO dates and months", () => {
    expect(isValidISODate("2026-02-28")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("26-02-01")).toBe(false);
    expect(isValidMonth("2026-12")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth(null)).toBe(false);
  });

  it("returns today in YYYY-MM-DD for a given timezone", () => {
    expect(todayISO("America/Santiago")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

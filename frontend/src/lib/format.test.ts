import { describe, expect, it } from "vitest";

import { formatDate, formatMoney, formatMonth, formatPercent } from "./format";

// Intl may use narrow no-break spaces; normalize whitespace for stable assertions.
const normalize = (value: string) => value.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("formats CLP without decimals", () => {
    expect(formatMoney("1250000.00", "CLP")).toBe("$1.250.000");
  });

  it("formats USD and EUR with two decimals", () => {
    expect(normalize(formatMoney("1234.5", "USD"))).toMatch(/1\.234,50/);
    expect(normalize(formatMoney("10", "EUR"))).toMatch(/10,00/);
  });

  it("uses a real minus sign and optional plus sign", () => {
    expect(formatMoney("-20000.00", "CLP")).toBe("−$20.000");
    expect(formatMoney("20000.00", "CLP", { signDisplay: "always" })).toBe("+$20.000");
    expect(formatMoney("0.00", "CLP", { signDisplay: "always" })).toBe("$0");
  });

  it("supports compact notation for chart axes", () => {
    expect(normalize(formatMoney("1500000", "CLP", { compact: true }))).toMatch(/1,5/);
  });
});

describe("formatPercent", () => {
  it("renders null as an em dash", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("formats with one decimal and optional sign", () => {
    expect(normalize(formatPercent("53.33"))).toBe("53,3 %");
    expect(normalize(formatPercent("12.5", { signDisplay: "always" }))).toBe("+12,5 %");
    expect(normalize(formatPercent("-4"))).toBe("−4,0 %");
  });
});

describe("dates", () => {
  it("formats ISO dates without timezone shifts", () => {
    expect(formatDate("2026-01-01")).toMatch(/1 ene 2026/);
  });

  it("capitalizes month names", () => {
    expect(formatMonth("2026-10")).toMatch(/^Octubre/);
    expect(formatMonth("2026-10", "short")).toMatch(/^Oct/);
  });
});

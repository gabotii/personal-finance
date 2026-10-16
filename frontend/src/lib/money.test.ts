import { describe, expect, it } from "vitest";

import { formatAmountInput, isNegative, isZero, parseAmountInput } from "./money";

describe("parseAmountInput", () => {
  it("accepts CLP amounts with thousands separators and rejects decimals", () => {
    expect(parseAmountInput("25.000", "CLP")).toBe("25000");
    expect(parseAmountInput("25 000", "CLP")).toBe("25000");
    expect(parseAmountInput("$1.250.000", "CLP")).toBe("1250000");
    expect(parseAmountInput("1500", "CLP")).toBe("1500");
  });

  it("detects the decimal separator for USD/EUR", () => {
    expect(parseAmountInput("15,50", "USD")).toBe("15.50");
    expect(parseAmountInput("15.5", "EUR")).toBe("15.5");
    expect(parseAmountInput("1.234,56", "EUR")).toBe("1234.56");
    expect(parseAmountInput("1,234.56", "USD")).toBe("1234.56");
    expect(parseAmountInput("US$ 99", "USD")).toBe("99");
    expect(parseAmountInput(",5", "USD")).toBe("0.5");
  });

  it("never reinterprets ambiguous separators", () => {
    expect(parseAmountInput("12,5", "CLP")).toBeNull();
    expect(parseAmountInput("1.5", "CLP")).toBeNull();
    expect(parseAmountInput("1.2.3", "CLP")).toBeNull();
    expect(parseAmountInput("1.234", "EUR")).toBe("1234");
    expect(parseAmountInput("12.34.56", "USD")).toBeNull();
  });

  it("rejects empty, zero, negative and malformed values", () => {
    for (const value of ["", "   ", "0", "0,00", "-10", "abc", "12a", "1e5"]) {
      expect(parseAmountInput(value, "USD")).toBeNull();
    }
  });

  it("rejects amounts above the storage limit", () => {
    expect(parseAmountInput("999999999999", "CLP")).toBe("999999999999");
    expect(parseAmountInput("1000000000000", "CLP")).toBeNull();
  });

  it("strips leading zeros", () => {
    expect(parseAmountInput("000150", "CLP")).toBe("150");
  });
});

describe("formatAmountInput", () => {
  it("groups digits using the es-CL locale", () => {
    expect(formatAmountInput("25000.00", "CLP")).toBe("25.000");
    expect(formatAmountInput("1234.5", "USD")).toBe("1.234,5");
  });
});

describe("sign helpers", () => {
  it("recognises zero and negative decimal strings", () => {
    expect(isZero("0.00")).toBe(true);
    expect(isZero("-0.00")).toBe(true);
    expect(isZero("0.01")).toBe(false);
    expect(isNegative("-12.00")).toBe(true);
    expect(isNegative("-0.00")).toBe(false);
    expect(isNegative("12.00")).toBe(false);
  });
});

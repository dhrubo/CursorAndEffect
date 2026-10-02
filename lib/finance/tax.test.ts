import { describe, expect, it } from "vitest";
import { marginalSavingsTaxRate, personalAllowance, taxBand, taxFreeInterestAllowance } from "./tax";

describe("UK tax rules", () => {
  it("assigns bands by gross income", () => {
    expect(taxBand(12000)).toBe("none");
    expect(taxBand(38000)).toBe("basic");
    expect(taxBand(72000)).toBe("higher");
    expect(taxBand(150000)).toBe("additional");
  });

  it("tapers the personal allowance above £100k", () => {
    expect(personalAllowance(100000)).toBe(12570);
    expect(personalAllowance(110000)).toBe(7570);
    expect(personalAllowance(130000)).toBe(0);
  });

  it("gives the right tax-free interest allowance", () => {
    expect(taxFreeInterestAllowance(38000)).toBe(1000);
    expect(taxFreeInterestAllowance(72000)).toBe(500);
    expect(taxFreeInterestAllowance(150000)).toBe(0);
    // Starting rate for savings: £5,000 band reduced by income above the personal allowance.
    expect(taxFreeInterestAllowance(15570)).toBe(1000 + 2000);
  });

  it("only taxes interest above the allowance", () => {
    expect(marginalSavingsTaxRate(72000, 400)).toBe(0);
    expect(marginalSavingsTaxRate(72000, 800)).toBe(0.4);
  });
});

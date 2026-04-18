import { describe, expect, it } from 'vitest';
import { calculateFinancials, defaultFinancialInputs } from './financialEngine';

describe('financialEngine', () => {
  it('calculates positive LCOE in plausible range', () => {
    const result = calculateFinancials(defaultFinancialInputs(), 10, 20);
    expect(result.lcoe).toBeGreaterThan(5);
    expect(result.lcoe).toBeLessThan(50);
  });

  it('increases NPV when tariff escalation is higher', () => {
    const lowEsc = calculateFinancials(
      { ...defaultFinancialInputs(), tariffEscalation: 0.0 },
      10,
      20,
    );
    const highEsc = calculateFinancials(
      { ...defaultFinancialInputs(), tariffEscalation: 0.1 },
      10,
      20,
    );

    expect(highEsc.npv).toBeGreaterThan(lowEsc.npv);
  });

  it('returns null IRR when all annual cash flows are negative', () => {
    const result = calculateFinancials(
      {
        ...defaultFinancialInputs(),
        annualSolarKwh: 0,
        annualOpexKes: 100000,
      },
      6,
      5,
    );

    expect(result.cashFlows.every((v) => v < 0)).toBe(true);
    expect(result.irr).toBeNull();
  });

  it('returns payback less than project life for viable setup', () => {
    const result = calculateFinancials(defaultFinancialInputs(), 10, 20);
    expect(result.paybackYears).toBeLessThan(25);
  });

  it('has cumulative discounted cash flow matching NPV + CapEx at year 25', () => {
    const result = calculateFinancials(defaultFinancialInputs(), 10, 20);
    const year25Cumulative = result.cumulativeCashFlows[24];
    expect(year25Cumulative).toBeCloseTo(result.npv + result.capexKes, 6);
  });
});

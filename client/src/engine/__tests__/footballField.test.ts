import { describe, it, expect } from 'vitest';
import { generateFootballFieldData } from '../footballField';
import type { DCFInputs } from '../types';

const BASE_INPUTS: DCFInputs = {
  companyName: 'TestCo',
  companyDescription: '',
  sector: 'Technology',
  projectionYears: 5,
  historicalRevenue: [800, 900, 1000],
  historicalEBITDA: [160, 190, 220],
  historicalDA: [40, 45, 50],
  historicalCapex: [60, 65, 70],
  historicalNWC: [80, 90, 100],
  revenueGrowthRates: [10, 9, 8, 7, 6],
  ebitdaMargins: [22, 23, 24, 25, 25],
  daPercentRevenue: 5,
  capexPercentRevenue: 7,
  nwcPercentRevenueChange: 10,
  taxRate: 25,
  riskFreeRate: 4.0,
  equityRiskPremium: 5.5,
  beta: 1.0,
  preTaxCostOfDebt: 5.0,
  debtToEquity: 0.3,
  terminalValueMethod: 'gordon-growth',
  terminalGrowthRate: 2.5,
  exitMultiple: 10,
  netDebt: 200,
  dilutedShares: 100,
};

describe('generateFootballFieldData', () => {
  it('produces multiple valuation ranges', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    expect(ranges.length).toBeGreaterThanOrEqual(3);
  });

  it('each range has low <= base <= high', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    ranges.forEach((r) => {
      expect(r.low).toBeLessThanOrEqual(r.base);
      expect(r.base).toBeLessThanOrEqual(r.high);
    });
  });

  it('each range has a non-empty label', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    ranges.forEach((r) => {
      expect(r.label.length).toBeGreaterThan(0);
    });
  });

  it('includes Gordon Growth methodology', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    const gordon = ranges.find((r) => r.label.includes('Gordon'));
    expect(gordon).toBeDefined();
  });

  it('includes Exit Multiple methodology', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    const em = ranges.find((r) => r.label.includes('Exit Multiple'));
    expect(em).toBeDefined();
  });

  it('ranges have positive values for valid inputs', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    ranges.forEach((r) => {
      expect(r.base).toBeGreaterThan(0);
    });
  });

  it('each range has a distinct color', () => {
    const ranges = generateFootballFieldData(BASE_INPUTS);
    const colors = ranges.map((r) => r.color);
    const unique = new Set(colors);
    expect(unique.size).toBe(colors.length);
  });
});

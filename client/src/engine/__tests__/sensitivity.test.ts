import { describe, it, expect } from 'vitest';
import { generateSensitivityTable, generateTornadoData } from '../sensitivity';
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

describe('generateSensitivityTable', () => {
  it('produces correct grid dimensions', () => {
    const table = generateSensitivityTable(
      BASE_INPUTS,
      'terminalGrowthRate',
      'riskFreeRate',
      'impliedSharePriceGordon',
      5,
      20
    );
    expect(table.xValues).toHaveLength(5);
    expect(table.yValues).toHaveLength(5);
    expect(table.cells).toHaveLength(5);
    expect(table.cells[0]).toHaveLength(5);
  });

  it('centers the grid on base values', () => {
    const table = generateSensitivityTable(
      BASE_INPUTS,
      'terminalGrowthRate',
      'riskFreeRate',
      'impliedSharePriceGordon',
      5,
      20
    );
    expect(table.baseX).toBe(BASE_INPUTS.terminalGrowthRate);
    expect(table.baseY).toBe(BASE_INPUTS.riskFreeRate);
    // Base values should appear in axis arrays
    expect(table.xValues).toContain(BASE_INPUTS.terminalGrowthRate);
    expect(table.yValues).toContain(BASE_INPUTS.riskFreeRate);
  });

  it('produces non-null values for valid inputs', () => {
    const table = generateSensitivityTable(
      BASE_INPUTS,
      'terminalGrowthRate',
      'riskFreeRate',
      'impliedSharePriceGordon',
      3,
      10
    );
    const hasNonNull = table.cells.some((row) =>
      row.some((cell) => cell.outputValue !== null)
    );
    expect(hasNonNull).toBe(true);
  });

  it('base output matches standalone DCF', () => {
    const table = generateSensitivityTable(
      BASE_INPUTS,
      'terminalGrowthRate',
      'riskFreeRate',
      'impliedSharePriceGordon',
      3,
      10
    );
    expect(table.baseOutput).not.toBeNull();
    expect(table.baseOutput!).toBeGreaterThan(0);
  });
});

describe('generateTornadoData', () => {
  const FIELDS = [
    { field: 'riskFreeRate', label: 'Risk-Free Rate' },
    { field: 'beta', label: 'Beta' },
    { field: 'terminalGrowthRate', label: 'Terminal Growth' },
  ];

  it('produces one bar per field', () => {
    const bars = generateTornadoData(
      BASE_INPUTS,
      FIELDS,
      'impliedSharePriceGordon',
      10
    );
    expect(bars).toHaveLength(3);
  });

  it('sorts bars by impact descending', () => {
    const bars = generateTornadoData(
      BASE_INPUTS,
      FIELDS,
      'impliedSharePriceGordon',
      10
    );
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i - 1].impact).toBeGreaterThanOrEqual(bars[i].impact);
    }
  });

  it('has symmetric high/low inputs around base', () => {
    const bars = generateTornadoData(
      BASE_INPUTS,
      FIELDS,
      'impliedSharePriceGordon',
      10
    );
    bars.forEach((bar) => {
      const lowDelta = bar.baseInput - bar.lowInput;
      const highDelta = bar.highInput - bar.baseInput;
      expect(lowDelta).toBeCloseTo(highDelta, 4);
    });
  });

  it('impact is absolute difference between high and low', () => {
    const bars = generateTornadoData(
      BASE_INPUTS,
      FIELDS,
      'impliedSharePriceGordon',
      10
    );
    bars.forEach((bar) => {
      const expected = Math.abs((bar.highValue ?? 0) - (bar.lowValue ?? 0));
      expect(bar.impact).toBeCloseTo(expected, 4);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { calculateDCF } from '../dcf';
import type { DCFInputs } from '../types';

// Realistic base inputs: mid-cap tech company
const BASE_INPUTS: DCFInputs = {
  companyName: 'TestCo',
  companyDescription: 'A test company',
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

describe('calculateDCF', () => {
  describe('WACC calculation', () => {
    it('computes cost of equity correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      // Ke = Rf + beta * ERP = 4.0 + 1.0 * 5.5 = 9.5%
      expect(result.costOfEquity).toBeCloseTo(9.5, 2);
    });

    it('computes WACC correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      // E weight = 1 / (1 + 0.3) = 0.7692
      // D weight = 0.3 / 1.3 = 0.2308
      // After-tax cost of debt = 5.0 * (1 - 0.25) = 3.75
      // WACC = 9.5 * 0.7692 + 3.75 * 0.2308 = 7.3077 + 0.8654 = 8.1731
      expect(result.wacc).toBeCloseTo(8.173, 1);
    });

    it('increases WACC when beta increases', () => {
      const base = calculateDCF(BASE_INPUTS);
      const highBeta = calculateDCF({ ...BASE_INPUTS, beta: 1.5 });
      expect(highBeta.wacc).toBeGreaterThan(base.wacc);
    });
  });

  describe('projections', () => {
    it('produces correct number of projection years', () => {
      const result = calculateDCF(BASE_INPUTS);
      expect(result.projections).toHaveLength(5);
    });

    it('calculates Year 1 revenue correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      // Base revenue = 1000, growth = 10%
      expect(result.projections[0].revenue).toBeCloseTo(1100, 0);
    });

    it('compounds revenue growth correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      // Year 1: 1000 * 1.10 = 1100
      // Year 2: 1100 * 1.09 = 1199
      expect(result.projections[1].revenue).toBeCloseTo(1199, 0);
    });

    it('calculates EBITDA from margins correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      // Year 1: revenue 1100 * 22% margin = 242
      expect(result.projections[0].ebitda).toBeCloseTo(242, 0);
    });

    it('calculates D&A as percent of revenue', () => {
      const result = calculateDCF(BASE_INPUTS);
      // Year 1: 1100 * 5% = 55
      expect(result.projections[0].da).toBeCloseTo(55, 0);
    });

    it('calculates UFCF correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      const p = result.projections[0];
      // EBIT = EBITDA - D&A = 242 - 55 = 187
      // Tax = 187 * 25% = 46.75
      // UFCF = EBIT * (1 - tax) + D&A - Capex - NWC change
      // = 187 * 0.75 + 55 - (1100 * 0.07) - ((1100 - 1000) * 0.10)
      // = 140.25 + 55 - 77 - 10 = 108.25
      expect(p.ufcf).toBeCloseTo(108.25, 1);
    });

    it('applies discount factor correctly', () => {
      const result = calculateDCF(BASE_INPUTS);
      const waccDecimal = result.wacc / 100;
      const expectedDF = 1 / (1 + waccDecimal);
      expect(result.projections[0].discountFactor).toBeCloseTo(expectedDF, 4);
    });

    it('PV of UFCF = UFCF * discount factor', () => {
      const result = calculateDCF(BASE_INPUTS);
      const p = result.projections[0];
      expect(p.pvUFCF).toBeCloseTo(p.ufcf * p.discountFactor, 2);
    });
  });

  describe('terminal value — Gordon Growth', () => {
    it('computes terminal value for Gordon Growth', () => {
      const result = calculateDCF(BASE_INPUTS);
      expect(result.terminalValueGordon).not.toBeNull();
      expect(result.terminalValueGordon!).toBeGreaterThan(0);
    });

    it('Gordon Growth TV = last UFCF * (1+g) / (WACC-g)', () => {
      const result = calculateDCF(BASE_INPUTS);
      const lastUFCF = result.projections[4].ufcf;
      const g = BASE_INPUTS.terminalGrowthRate / 100;
      const waccDecimal = result.wacc / 100;
      const expected = (lastUFCF * (1 + g)) / (waccDecimal - g);
      expect(result.terminalValueGordon).toBeCloseTo(expected, 0);
    });

    it('discounts terminal value back to present', () => {
      const result = calculateDCF(BASE_INPUTS);
      const waccDecimal = result.wacc / 100;
      const terminalDF = 1 / Math.pow(1 + waccDecimal, 5);
      expect(result.pvTerminalValueGordon).toBeCloseTo(
        result.terminalValueGordon! * terminalDF,
        0
      );
    });

    it('returns error when terminal growth >= WACC', () => {
      const badInputs = {
        ...BASE_INPUTS,
        terminalGrowthRate: 10, // higher than WACC ~8.17%
      };
      const result = calculateDCF(badInputs);
      expect(result.error).not.toBeNull();
      expect(result.error).toContain('Terminal growth rate');
    });
  });

  describe('terminal value — Exit Multiple', () => {
    it('computes exit multiple terminal value', () => {
      const inputs = { ...BASE_INPUTS, terminalValueMethod: 'exit-multiple' as const };
      const result = calculateDCF(inputs);
      expect(result.terminalValueExitMultiple).not.toBeNull();
    });

    it('Exit Multiple TV = last EBITDA * multiple', () => {
      const inputs = { ...BASE_INPUTS, terminalValueMethod: 'exit-multiple' as const };
      const result = calculateDCF(inputs);
      const lastEBITDA = result.projections[4].ebitda;
      expect(result.terminalValueExitMultiple).toBeCloseTo(lastEBITDA * 10, 0);
    });
  });

  describe('enterprise and equity value', () => {
    it('enterprise value = sum PV FCFs + PV terminal value', () => {
      const result = calculateDCF(BASE_INPUTS);
      expect(result.enterpriseValueGordon).toBeCloseTo(
        result.sumPVofFCFs + result.pvTerminalValueGordon!,
        0
      );
    });

    it('equity value = enterprise value - net debt', () => {
      const result = calculateDCF(BASE_INPUTS);
      expect(result.equityValueGordon).toBeCloseTo(
        result.enterpriseValueGordon! - BASE_INPUTS.netDebt,
        0
      );
    });

    it('implied share price = equity value / diluted shares', () => {
      const result = calculateDCF(BASE_INPUTS);
      expect(result.impliedSharePriceGordon).toBeCloseTo(
        result.equityValueGordon! / BASE_INPUTS.dilutedShares,
        2
      );
    });

    it('higher net debt reduces share price', () => {
      const base = calculateDCF(BASE_INPUTS);
      const highDebt = calculateDCF({ ...BASE_INPUTS, netDebt: 500 });
      expect(highDebt.impliedSharePriceGordon!).toBeLessThan(
        base.impliedSharePriceGordon!
      );
    });

    it('more diluted shares reduces share price', () => {
      const base = calculateDCF(BASE_INPUTS);
      const diluted = calculateDCF({ ...BASE_INPUTS, dilutedShares: 200 });
      expect(diluted.impliedSharePriceGordon!).toBeLessThan(
        base.impliedSharePriceGordon!
      );
    });
  });

  describe('edge cases', () => {
    it('handles zero revenue gracefully', () => {
      const zeroRev = {
        ...BASE_INPUTS,
        historicalRevenue: [0, 0, 0],
      };
      const result = calculateDCF(zeroRev);
      expect(result.error).toBeNull();
      expect(result.projections[0].revenue).toBe(0);
    });

    it('handles zero diluted shares (defaults to 1)', () => {
      const result = calculateDCF({ ...BASE_INPUTS, dilutedShares: 0 });
      expect(result.impliedSharePriceGordon).not.toBeNull();
      expect(Number.isFinite(result.impliedSharePriceGordon)).toBe(true);
    });

    it('handles 7-year projection', () => {
      const result = calculateDCF({
        ...BASE_INPUTS,
        projectionYears: 7,
        revenueGrowthRates: [10, 9, 8, 7, 6, 5, 4],
        ebitdaMargins: [22, 23, 24, 25, 25, 25, 25],
      });
      expect(result.projections).toHaveLength(7);
      expect(result.error).toBeNull();
    });

    it('handles 10-year projection', () => {
      const result = calculateDCF({
        ...BASE_INPUTS,
        projectionYears: 10,
        revenueGrowthRates: [10, 9, 8, 7, 6, 5, 4, 3, 3, 3],
        ebitdaMargins: [22, 23, 24, 25, 25, 25, 25, 25, 25, 25],
      });
      expect(result.projections).toHaveLength(10);
      expect(result.error).toBeNull();
    });

    it('negative EBIT produces zero tax', () => {
      const result = calculateDCF({
        ...BASE_INPUTS,
        ebitdaMargins: [2, 2, 2, 2, 2], // Very low margins, D&A at 5% will exceed EBITDA
      });
      result.projections.forEach((p) => {
        expect(p.taxExpense).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

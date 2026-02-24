import { calculateDCF } from './dcf';
import type { DCFInputs, DCFOutputs } from './types';

export interface FootballFieldRange {
  label: string;
  low: number;
  base: number;
  high: number;
  color: string;
}

function extractPrice(outputs: DCFOutputs, method: 'gordon-growth' | 'exit-multiple'): number | null {
  return method === 'gordon-growth'
    ? outputs.impliedSharePriceGordon
    : outputs.impliedSharePriceExitMultiple;
}

export function generateFootballFieldData(inputs: DCFInputs): FootballFieldRange[] {
  const ranges: FootballFieldRange[] = [];

  // 1. Gordon Growth — vary terminal growth rate ±1pp
  const gordonBase = calculateDCF({ ...inputs, terminalValueMethod: 'gordon-growth' });
  const gordonLow = calculateDCF({
    ...inputs,
    terminalValueMethod: 'gordon-growth',
    terminalGrowthRate: Math.max(inputs.terminalGrowthRate - 1, 0),
  });
  const gordonHigh = calculateDCF({
    ...inputs,
    terminalValueMethod: 'gordon-growth',
    terminalGrowthRate: inputs.terminalGrowthRate + 1,
  });

  const gBase = extractPrice(gordonBase, 'gordon-growth');
  const gLow = extractPrice(gordonLow, 'gordon-growth');
  const gHigh = extractPrice(gordonHigh, 'gordon-growth');

  if (gBase !== null && gLow !== null && gHigh !== null) {
    ranges.push({
      label: 'DCF — Gordon Growth',
      low: Math.min(gLow, gHigh),
      base: gBase,
      high: Math.max(gLow, gHigh),
      color: '#3b82f6',
    });
  }

  // 2. Exit Multiple — vary multiple ±2x
  const emBase = calculateDCF({ ...inputs, terminalValueMethod: 'exit-multiple' });
  const emLow = calculateDCF({
    ...inputs,
    terminalValueMethod: 'exit-multiple',
    exitMultiple: Math.max(inputs.exitMultiple - 2, 1),
  });
  const emHigh = calculateDCF({
    ...inputs,
    terminalValueMethod: 'exit-multiple',
    exitMultiple: inputs.exitMultiple + 2,
  });

  const eBase = extractPrice(emBase, 'exit-multiple');
  const eLow = extractPrice(emLow, 'exit-multiple');
  const eHigh = extractPrice(emHigh, 'exit-multiple');

  if (eBase !== null && eLow !== null && eHigh !== null) {
    ranges.push({
      label: 'DCF — Exit Multiple',
      low: Math.min(eLow, eHigh),
      base: eBase,
      high: Math.max(eLow, eHigh),
      color: '#8b5cf6',
    });
  }

  // 3. WACC sensitivity — vary WACC ±2pp (via risk-free rate)
  const waccLow = calculateDCF({
    ...inputs,
    riskFreeRate: inputs.riskFreeRate + 2,
  });
  const waccHigh = calculateDCF({
    ...inputs,
    riskFreeRate: Math.max(inputs.riskFreeRate - 2, 0),
  });

  const wBase = extractPrice(gordonBase.error ? emBase : gordonBase, inputs.terminalValueMethod);
  const wLow = extractPrice(waccLow, inputs.terminalValueMethod);
  const wHigh = extractPrice(waccHigh, inputs.terminalValueMethod);

  if (wBase !== null && wLow !== null && wHigh !== null) {
    ranges.push({
      label: 'WACC Sensitivity',
      low: Math.min(wLow, wHigh),
      base: wBase,
      high: Math.max(wLow, wHigh),
      color: '#f59e0b',
    });
  }

  // 4. Revenue growth sensitivity — vary all growth rates ±3pp
  const revLowRates = inputs.revenueGrowthRates.map((r) => r - 3);
  const revHighRates = inputs.revenueGrowthRates.map((r) => r + 3);

  const revLow = calculateDCF({ ...inputs, revenueGrowthRates: revLowRates });
  const revHigh = calculateDCF({ ...inputs, revenueGrowthRates: revHighRates });

  const rBase = extractPrice(gordonBase.error ? emBase : gordonBase, inputs.terminalValueMethod);
  const rLow = extractPrice(revLow, inputs.terminalValueMethod);
  const rHigh = extractPrice(revHigh, inputs.terminalValueMethod);

  if (rBase !== null && rLow !== null && rHigh !== null) {
    ranges.push({
      label: 'Revenue Growth ±3%',
      low: Math.min(rLow, rHigh),
      base: rBase,
      high: Math.max(rLow, rHigh),
      color: '#22c55e',
    });
  }

  // 5. Margin sensitivity — vary EBITDA margins ±5pp
  const marginLow = inputs.ebitdaMargins.map((m) => Math.max(m - 5, 0));
  const marginHigh = inputs.ebitdaMargins.map((m) => m + 5);

  const mLowResult = calculateDCF({ ...inputs, ebitdaMargins: marginLow });
  const mHighResult = calculateDCF({ ...inputs, ebitdaMargins: marginHigh });

  const mBase = extractPrice(gordonBase.error ? emBase : gordonBase, inputs.terminalValueMethod);
  const mLow = extractPrice(mLowResult, inputs.terminalValueMethod);
  const mHigh = extractPrice(mHighResult, inputs.terminalValueMethod);

  if (mBase !== null && mLow !== null && mHigh !== null) {
    ranges.push({
      label: 'EBITDA Margin ±5%',
      low: Math.min(mLow, mHigh),
      base: mBase,
      high: Math.max(mLow, mHigh),
      color: '#ec4899',
    });
  }

  return ranges;
}

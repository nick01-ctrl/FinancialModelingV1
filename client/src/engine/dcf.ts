import type { DCFInputs, DCFOutputs, YearlyProjection } from './types';

export function calculateDCF(inputs: DCFInputs): DCFOutputs {
  // Calculate WACC
  const costOfEquity =
    inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium;
  const equityWeight = 1 / (1 + inputs.debtToEquity);
  const debtWeight = inputs.debtToEquity / (1 + inputs.debtToEquity);
  const afterTaxCostOfDebt = inputs.preTaxCostOfDebt * (1 - inputs.taxRate / 100);
  const wacc = costOfEquity * equityWeight + afterTaxCostOfDebt * debtWeight;

  // Validate: terminal growth rate must be < WACC for Gordon Growth
  if (
    inputs.terminalValueMethod === 'gordon-growth' &&
    inputs.terminalGrowthRate >= wacc
  ) {
    return {
      wacc,
      costOfEquity,
      projections: [],
      sumPVofFCFs: 0,
      terminalValueGordon: null,
      terminalValueExitMultiple: null,
      pvTerminalValueGordon: null,
      pvTerminalValueExitMultiple: null,
      enterpriseValueGordon: null,
      enterpriseValueExitMultiple: null,
      equityValueGordon: null,
      equityValueExitMultiple: null,
      impliedSharePriceGordon: null,
      impliedSharePriceExitMultiple: null,
      error: `Terminal growth rate (${inputs.terminalGrowthRate.toFixed(1)}%) must be less than WACC (${wacc.toFixed(1)}%). This produces a negative or infinite terminal value.`,
    };
  }

  // Base revenue = last historical year
  const baseRevenue = inputs.historicalRevenue[inputs.historicalRevenue.length - 1] || 0;
  const baseNWC = inputs.historicalNWC[inputs.historicalNWC.length - 1] || 0;

  // Build yearly projections
  const projections: YearlyProjection[] = [];
  let prevRevenue = baseRevenue;
  let prevNWC = baseNWC;
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < inputs.projectionYears; i++) {
    const growthRate = (inputs.revenueGrowthRates[i] || 0) / 100;
    const revenue = prevRevenue * (1 + growthRate);
    const margin = (inputs.ebitdaMargins[i] || 0) / 100;
    const ebitda = revenue * margin;
    const da = revenue * (inputs.daPercentRevenue / 100);
    const capex = revenue * (inputs.capexPercentRevenue / 100);
    const revenueChange = revenue - prevRevenue;
    const nwcChange = revenueChange * (inputs.nwcPercentRevenueChange / 100);
    const ebit = ebitda - da;
    const taxExpense = Math.max(ebit * (inputs.taxRate / 100), 0);

    // UFCF = EBIT * (1 - tax) + D&A - Capex - Change in NWC
    // Equivalent to: EBITDA * (1 - tax) + D&A * tax - Capex - NWC change
    const ufcf = ebit * (1 - inputs.taxRate / 100) + da - capex - nwcChange;

    const waccDecimal = wacc / 100;
    const discountFactor = 1 / Math.pow(1 + waccDecimal, i + 1);
    const pvUFCF = ufcf * discountFactor;

    projections.push({
      year: currentYear + i,
      revenue,
      ebitda,
      da,
      capex,
      nwcChange,
      taxExpense,
      ufcf,
      discountFactor,
      pvUFCF,
    });

    prevRevenue = revenue;
  }

  const sumPVofFCFs = projections.reduce((sum, p) => sum + p.pvUFCF, 0);

  // Terminal Value calculations
  const lastProjection = projections[projections.length - 1];
  const lastUFCF = lastProjection?.ufcf || 0;
  const lastEBITDA = lastProjection?.ebitda || 0;
  const waccDecimal = wacc / 100;
  const n = inputs.projectionYears;
  const terminalDiscountFactor = 1 / Math.pow(1 + waccDecimal, n);

  // Gordon Growth
  let terminalValueGordon: number | null = null;
  let pvTerminalValueGordon: number | null = null;
  const g = inputs.terminalGrowthRate / 100;
  if (waccDecimal > g) {
    terminalValueGordon = (lastUFCF * (1 + g)) / (waccDecimal - g);
    pvTerminalValueGordon = terminalValueGordon * terminalDiscountFactor;
  }

  // Exit Multiple
  let terminalValueExitMultiple: number | null = null;
  let pvTerminalValueExitMultiple: number | null = null;
  terminalValueExitMultiple = lastEBITDA * inputs.exitMultiple;
  pvTerminalValueExitMultiple = terminalValueExitMultiple * terminalDiscountFactor;

  // Enterprise Value
  const enterpriseValueGordon =
    pvTerminalValueGordon !== null ? sumPVofFCFs + pvTerminalValueGordon : null;
  const enterpriseValueExitMultiple =
    pvTerminalValueExitMultiple !== null
      ? sumPVofFCFs + pvTerminalValueExitMultiple
      : null;

  // Equity Value
  const equityValueGordon =
    enterpriseValueGordon !== null ? enterpriseValueGordon - inputs.netDebt : null;
  const equityValueExitMultiple =
    enterpriseValueExitMultiple !== null
      ? enterpriseValueExitMultiple - inputs.netDebt
      : null;

  // Implied Share Price
  const shares = inputs.dilutedShares || 1;
  const impliedSharePriceGordon =
    equityValueGordon !== null ? equityValueGordon / shares : null;
  const impliedSharePriceExitMultiple =
    equityValueExitMultiple !== null ? equityValueExitMultiple / shares : null;

  return {
    wacc,
    costOfEquity,
    projections,
    sumPVofFCFs,
    terminalValueGordon,
    terminalValueExitMultiple,
    pvTerminalValueGordon,
    pvTerminalValueExitMultiple,
    enterpriseValueGordon,
    enterpriseValueExitMultiple,
    equityValueGordon,
    equityValueExitMultiple,
    impliedSharePriceGordon,
    impliedSharePriceExitMultiple,
    error: null,
  };
}

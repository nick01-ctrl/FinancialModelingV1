import type {
  DCFInputs,
  DCFOutputs,
  ProjectionYear,
} from '../../../../shared/types/dcf';

// ============================================================
// DCF Calculation Engine
// Pure function: no side effects, deterministic output.
// All monetary values are in millions (matching input convention).
// ============================================================

/**
 * Calculate a complete Discounted Cash Flow valuation from the
 * provided inputs.  Throws on invalid configurations (e.g.
 * terminal growth rate >= WACC, zero diluted shares).
 */
export function calculateDCF(inputs: DCFInputs): DCFOutputs {
  // ----------------------------------------------------------
  // 0. Input validation
  // ----------------------------------------------------------
  const terminalGrowthRate = inputs.terminalGrowthRate.value;
  const dilutedShares = inputs.dilutedSharesOutstanding.value;

  if (dilutedShares === 0) {
    throw new Error(
      'Diluted shares outstanding cannot be zero. Please provide a positive share count.',
    );
  }

  // ----------------------------------------------------------
  // 1. WACC Calculation
  // ----------------------------------------------------------
  const riskFreeRate = inputs.riskFreeRate.value;
  const equityRiskPremium = inputs.equityRiskPremium.value;
  const beta = inputs.beta.value;
  const preTaxCostOfDebt = inputs.preTaxCostOfDebt.value;
  const taxRate = inputs.taxRate.value;
  const debtToEquityRatio = inputs.debtToEquityRatio.value;

  const costOfEquity = riskFreeRate + beta * equityRiskPremium;
  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRate);

  const equityWeight = 1 / (1 + debtToEquityRatio);
  const debtWeight = debtToEquityRatio / (1 + debtToEquityRatio);

  const wacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt;

  // Validate terminal growth rate vs WACC (needed for Gordon Growth)
  if (terminalGrowthRate >= wacc) {
    throw new Error(
      `Terminal growth rate (${(terminalGrowthRate * 100).toFixed(2)}%) must be less than WACC (${(wacc * 100).toFixed(2)}%). ` +
      'A perpetuity growth rate at or above the discount rate produces an infinite (or negative) terminal value.',
    );
  }

  // ----------------------------------------------------------
  // 2. Revenue Projections & Full P&L
  // ----------------------------------------------------------
  const { projectionPeriod, historicalFinancials } = inputs;

  // Determine base-year revenue: last historical year, or fallback to 100
  const sortedHistoricals = [...historicalFinancials].sort(
    (a, b) => a.year - b.year,
  );
  const lastHistorical = sortedHistoricals[sortedHistoricals.length - 1];
  const baseRevenue =
    lastHistorical && lastHistorical.revenue > 0
      ? lastHistorical.revenue
      : 100;
  const baseYear = lastHistorical ? lastHistorical.year : new Date().getFullYear();

  // Determine last historical year's revenue for first-year NWC delta
  const daPercent = inputs.daAsPercentOfRevenue.value;
  const capexPercent = inputs.capexAsPercentOfRevenue.value;
  const nwcPercent = inputs.nwcAsPercentOfRevenueChange.value;

  const projections: ProjectionYear[] = [];
  let priorRevenue = baseRevenue;

  for (let i = 0; i < projectionPeriod; i++) {
    const growthRate = inputs.revenueGrowthRates[i]?.value ?? 0;
    const ebitdaMargin = inputs.ebitdaMargins[i]?.value ?? 0;

    const revenue = priorRevenue * (1 + growthRate);
    const ebitda = revenue * ebitdaMargin;
    const da = revenue * daPercent;
    const ebit = ebitda - da;

    // Taxes floored at 0 (no tax benefit on negative EBIT in this model)
    const taxes = Math.max(0, ebit * taxRate);
    const nopat = ebit - taxes;

    const capex = revenue * capexPercent;
    const revenueChange = revenue - priorRevenue;
    const changeInNWC = revenueChange * nwcPercent;

    const unleveredFCF = nopat + da - capex - changeInNWC;

    const n = i + 1;
    const discountFactor = 1 / Math.pow(1 + wacc, n);
    const pvOfFCF = unleveredFCF * discountFactor;

    projections.push({
      year: baseYear + n,
      revenue,
      revenueGrowth: growthRate,
      ebitda,
      ebitdaMargin,
      depreciationAmortization: da,
      ebit,
      taxes,
      nopat,
      capex,
      changeInNWC,
      unleveredFCF,
      discountFactor,
      pvOfFCF,
    });

    priorRevenue = revenue;
  }

  // ----------------------------------------------------------
  // 3. Sum of PV of FCFs
  // ----------------------------------------------------------
  const sumOfPVofFCFs = projections.reduce((sum, p) => sum + p.pvOfFCF, 0);

  // ----------------------------------------------------------
  // 4. Terminal Value (both methods always calculated)
  // ----------------------------------------------------------
  const finalYear = projections[projections.length - 1];
  const finalFCF = finalYear.unleveredFCF;
  const finalEBITDA = finalYear.ebitda;
  const exitMultipleInput = inputs.exitMultiple.value;
  const n = projectionPeriod;

  // Gordon Growth Model
  const terminalValueGordon =
    (finalFCF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);

  // Exit Multiple Method
  const terminalValueExitMultiple = finalEBITDA * exitMultipleInput;

  // Select terminal value based on chosen method
  const selectedTerminalValue =
    inputs.terminalValueMethod === 'gordon_growth'
      ? terminalValueGordon
      : terminalValueExitMultiple;

  // PV of Terminal Value
  const tvDiscountFactor = 1 / Math.pow(1 + wacc, n);
  const pvOfTerminalValue = selectedTerminalValue * tvDiscountFactor;

  // ----------------------------------------------------------
  // 5. Implied cross-method metrics
  // ----------------------------------------------------------

  // Implied terminal growth rate from exit multiple:
  //   TV_exit = FCF_final * (1 + g) / (WACC - g)
  //   => g = (TV_exit * WACC - FCF_final) / (TV_exit + FCF_final)
  let impliedTerminalGrowthFromMultiple: number;
  if (finalFCF !== 0) {
    const tvExit = terminalValueExitMultiple;
    impliedTerminalGrowthFromMultiple =
      (tvExit * wacc - finalFCF) / (tvExit + finalFCF);
  } else {
    // When FCF is zero, the Gordon model relationship breaks down
    impliedTerminalGrowthFromMultiple = 0;
  }

  // Implied exit multiple from Gordon growth:
  //   TV_gordon = EBITDA_final * multiple
  //   => multiple = TV_gordon / EBITDA_final
  let impliedExitMultipleFromGrowth: number;
  if (finalEBITDA !== 0) {
    impliedExitMultipleFromGrowth = terminalValueGordon / finalEBITDA;
  } else {
    // When EBITDA is zero, an exit multiple is undefined
    impliedExitMultipleFromGrowth = 0;
  }

  // ----------------------------------------------------------
  // 6. Valuation
  // ----------------------------------------------------------
  const netDebt = inputs.netDebt.value;

  const enterpriseValue = sumOfPVofFCFs + pvOfTerminalValue;
  const equityValue = enterpriseValue - netDebt;
  const impliedSharePrice = equityValue / dilutedShares;

  // ----------------------------------------------------------
  // 7. EV Bridge
  // ----------------------------------------------------------
  const evBridge = {
    pvOfFCFs: sumOfPVofFCFs,
    pvOfTerminalValue,
    enterpriseValue,
    lessNetDebt: netDebt,
    equityValue,
    dilutedShares,
    impliedSharePrice,
  };

  // ----------------------------------------------------------
  // 8. Assemble output
  // ----------------------------------------------------------
  return {
    projections,

    // WACC
    costOfEquity,
    afterTaxCostOfDebt,
    wacc,
    equityWeight,
    debtWeight,

    // Terminal Value
    terminalValueGordon,
    terminalValueExitMultiple,
    selectedTerminalValue,
    pvOfTerminalValue,
    impliedTerminalGrowthFromMultiple,
    impliedExitMultipleFromGrowth,

    // Valuation
    sumOfPVofFCFs,
    enterpriseValue,
    equityValue,
    impliedSharePrice,

    // EV Bridge
    evBridge,
  };
}

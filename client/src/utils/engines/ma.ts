import type {
  MAInputs,
  MAOutputs,
  ProFormaYear,
  CompanyFinancials,
} from '../../../../shared/types/ma';

// ============================================================
// M&A / Merger Model Calculation Engine
// ============================================================

/**
 * Helper to extract .value from a FieldValue<number>.
 */
function v(field: { value: number }): number {
  return field.value;
}

/**
 * Main entry point: given MAInputs, compute full MAOutputs including
 * deal metrics, purchase price allocation, pro forma projections,
 * break-even synergies, and pro forma balance sheet at close.
 */
export function calculateMA(inputs: MAInputs): MAOutputs {
  const { acquirer, target, dealTerms, synergies, purchasePriceAllocation, projectionPeriod } =
    inputs;

  // ----------------------------------------------------------
  // 1. Deal Metrics
  // ----------------------------------------------------------
  const totalPurchasePrice = v(dealTerms.offerPricePerShare) * v(target.dilutedShares);
  const cashComponent = totalPurchasePrice * v(dealTerms.cashPercent);
  const stockComponent = totalPurchasePrice * v(dealTerms.stockPercent);
  const debtComponent = totalPurchasePrice * v(dealTerms.debtPercent);
  const newSharesIssued = stockComponent / v(dealTerms.acquirerSharePrice);

  // Implied EV = Purchase Price + Target Net Debt
  const targetNetDebt = v(target.totalDebt) - v(target.cashAndEquivalents);
  const impliedEV = totalPurchasePrice + targetNetDebt;

  // ----------------------------------------------------------
  // 2. Purchase Price Allocation
  // ----------------------------------------------------------
  const ppAndEWriteUp = v(target.ppAndE) * v(purchasePriceAllocation.ppAndEWriteUpPercent);
  const intangiblesStepUp = v(purchasePriceAllocation.intangiblesStepUp);
  const deferredTaxLiability =
    (ppAndEWriteUp + intangiblesStepUp) * v(purchasePriceAllocation.deferredTaxLiabilityRate);
  const totalFairValueOfNetAssets =
    v(target.totalEquity) + ppAndEWriteUp + intangiblesStepUp - deferredTaxLiability;
  const goodwill = totalPurchasePrice - totalFairValueOfNetAssets;

  // ----------------------------------------------------------
  // 3. Pro Forma Projections
  // ----------------------------------------------------------
  const years = Math.min(Math.max(projectionPeriod, 3), 10);
  const proFormaYears: ProFormaYear[] = [];

  // Additional D&A from write-ups (straight-line)
  const annualPPEDAndA = ppAndEWriteUp / 10;
  const annualIntangiblesDAndA = intangiblesStepUp / 15;
  const totalAdditionalDAndA = annualPPEDAndA + annualIntangiblesDAndA;

  // Additional interest expense from new debt
  const additionalInterestExpense = debtComponent * v(dealTerms.newDebtInterestRate);

  // One-time costs (Year 1 only)
  const oneTimeCosts =
    v(synergies.transactionCosts) +
    v(synergies.financingCosts) +
    v(synergies.restructuringCosts);

  // Pro forma diluted shares (constant across projection)
  const proFormaDilutedShares = v(acquirer.dilutedShares) + newSharesIssued;

  // Tax rate: use acquirer's tax rate for pro forma adjustments
  const taxRate = v(acquirer.taxRate);

  for (let i = 1; i <= years; i++) {
    // Acquirer standalone projections
    const acquirerRevenue =
      v(acquirer.revenue) * Math.pow(1 + v(acquirer.revenueGrowth), i);
    const acquirerEbitda = acquirerRevenue * v(acquirer.ebitdaMargin);
    const acquirerNetIncome = computeStandaloneNetIncome(acquirer, acquirerRevenue, acquirerEbitda);
    const acquirerEPS = acquirerNetIncome / v(acquirer.dilutedShares);

    // Target standalone projections
    const targetRevenue =
      v(target.revenue) * Math.pow(1 + v(target.revenueGrowth), i);
    const targetEbitda = targetRevenue * v(target.ebitdaMargin);
    const targetNetIncome = computeStandaloneNetIncome(target, targetRevenue, targetEbitda);

    // Synergies realized in this year
    const costSynergiesRealized = computeSynergyRealized(
      v(synergies.runRateCostSynergies),
      synergies.costSynergyPhaseInSchedule,
      i
    );
    const revenueSynergiesRealized = computeSynergyRealized(
      v(synergies.runRateRevenueSynergies),
      synergies.revenueSynergyPhaseInSchedule,
      i
    );
    const totalSynergies = costSynergiesRealized + revenueSynergiesRealized;

    // One-time costs apply in Year 1 only
    const yearOneTimeCosts = i === 1 ? oneTimeCosts : 0;

    // Pro forma combined
    const proFormaRevenue = acquirerRevenue + targetRevenue + revenueSynergiesRealized;
    const proFormaEbitda = acquirerEbitda + targetEbitda + totalSynergies;

    // Net income adjustments (pre-tax impact, then tax-effected)
    // Cost synergies increase EBITDA, revenue synergies increase revenue/EBITDA
    // Additional interest and D&A reduce pre-tax income
    // One-time costs reduce pre-tax income
    const preTaxAdjustments =
      totalSynergies - additionalInterestExpense - totalAdditionalDAndA - yearOneTimeCosts;
    const afterTaxAdjustments = preTaxAdjustments * (1 - taxRate);

    const proFormaNetIncome = acquirerNetIncome + targetNetIncome + afterTaxAdjustments;
    const proFormaEPS = proFormaNetIncome / proFormaDilutedShares;

    // Accretion / Dilution
    const epsAccretionDilution = proFormaEPS - acquirerEPS;
    const epsAccretionDilutionPercent =
      acquirerEPS !== 0 ? epsAccretionDilution / Math.abs(acquirerEPS) : 0;

    proFormaYears.push({
      year: i,
      acquirerRevenue,
      acquirerEbitda,
      acquirerNetIncome,
      acquirerEPS,
      targetRevenue,
      targetEbitda,
      targetNetIncome,
      costSynergiesRealized,
      revenueSynergiesRealized,
      totalSynergies,
      additionalInterestExpense,
      additionalDAndA: totalAdditionalDAndA,
      oneTimeCosts: yearOneTimeCosts,
      proFormaRevenue,
      proFormaEbitda,
      proFormaNetIncome,
      proFormaEPS,
      proFormaDilutedShares,
      epsAccretionDilution,
      epsAccretionDilutionPercent,
      isAccretive: epsAccretionDilution > 0,
    });
  }

  // ----------------------------------------------------------
  // 4. Break-even Synergies (binary search)
  // ----------------------------------------------------------
  const breakEvenSynergies = computeBreakEvenSynergies(inputs, {
    additionalInterestExpense,
    totalAdditionalDAndA,
    oneTimeCosts,
    proFormaDilutedShares,
    taxRate,
  });

  // ----------------------------------------------------------
  // 5. Pro Forma Balance Sheet at Close (Year 0)
  // ----------------------------------------------------------
  const proFormaBalanceSheet = computeProFormaBalanceSheet(inputs, {
    goodwill,
    ppAndEWriteUp,
    intangiblesStepUp,
    cashComponent,
    debtComponent,
    stockComponent,
    deferredTaxLiability,
  });

  return {
    totalPurchasePrice,
    impliedEV,
    cashComponent,
    stockComponent,
    debtComponent,
    newSharesIssued,
    goodwill,
    ppAndEWriteUp,
    intangiblesStepUp,
    deferredTaxLiability,
    totalFairValueOfNetAssets,
    proFormaYears,
    breakEvenSynergies,
    proFormaBalanceSheet,
  };
}

// ============================================================
// Helper: compute standalone net income from projected
// revenue / EBITDA using the company's historical ratios.
// ============================================================
function computeStandaloneNetIncome(
  company: CompanyFinancials,
  projectedRevenue: number,
  projectedEbitda: number
): number {
  // Derive D&A, interest, and tax as proportions of base-year
  const baseRevenue = v(company.revenue);
  const baseEbitda = v(company.ebitda);
  const baseEbit = v(company.ebit);
  const baseDAndA = baseEbitda - baseEbit;
  const taxRate = v(company.taxRate);

  // Scale D&A proportionally to EBITDA growth
  const scaleFactor = baseEbitda !== 0 ? projectedEbitda / baseEbitda : 1;
  const projectedDAndA = baseDAndA * scaleFactor;
  const projectedEbit = projectedEbitda - projectedDAndA;

  // Interest expense: assume constant (same capital structure standalone)
  const baseNetIncome = v(company.netIncome);
  const basePreTaxIncome = taxRate < 1 ? baseNetIncome / (1 - taxRate) : baseNetIncome;
  const baseInterestExpense = baseEbit - basePreTaxIncome;
  const interestExpense = baseInterestExpense; // held constant

  const projectedPreTaxIncome = projectedEbit - interestExpense;
  const projectedNetIncome = projectedPreTaxIncome * (1 - taxRate);

  return projectedNetIncome;
}

// ============================================================
// Helper: compute synergy realized for a given year
// ============================================================
function computeSynergyRealized(
  runRate: number,
  schedule: number[],
  year: number
): number {
  if (year <= 0) return 0;
  // If year exceeds the phase-in schedule, full run-rate is achieved
  if (year > schedule.length) return runRate;
  return runRate * schedule[year - 1];
}

// ============================================================
// Helper: binary search for break-even synergies
// Find the minimum total annual synergies (cost) that make
// Year 1 pro forma EPS >= acquirer standalone EPS.
// ============================================================
interface BreakEvenParams {
  additionalInterestExpense: number;
  totalAdditionalDAndA: number;
  oneTimeCosts: number;
  proFormaDilutedShares: number;
  taxRate: number;
}

function computeBreakEvenSynergies(inputs: MAInputs, params: BreakEvenParams): number {
  const { acquirer, target } = inputs;
  const {
    additionalInterestExpense,
    totalAdditionalDAndA,
    oneTimeCosts,
    proFormaDilutedShares,
    taxRate,
  } = params;

  // Year 1 acquirer standalone
  const acquirerRevenue1 = v(acquirer.revenue) * (1 + v(acquirer.revenueGrowth));
  const acquirerEbitda1 = acquirerRevenue1 * v(acquirer.ebitdaMargin);
  const acquirerNetIncome1 = computeStandaloneNetIncome(acquirer, acquirerRevenue1, acquirerEbitda1);
  const acquirerEPS1 = acquirerNetIncome1 / v(acquirer.dilutedShares);

  // Year 1 target standalone
  const targetRevenue1 = v(target.revenue) * (1 + v(target.revenueGrowth));
  const targetEbitda1 = targetRevenue1 * v(target.ebitdaMargin);
  const targetNetIncome1 = computeStandaloneNetIncome(target, targetRevenue1, targetEbitda1);

  // For a given synergy level S, Year 1 pro forma EPS is:
  // Combined NI = acquirerNI + targetNI + (S - interest - D&A - oneTime) * (1 - tax)
  // Pro Forma EPS = Combined NI / proFormaDilutedShares
  // We need: Pro Forma EPS >= acquirerEPS1
  // i.e. (acquirerNI + targetNI + (S - interest - D&A - oneTime) * (1 - tax)) / shares >= acquirerEPS1

  // We can solve analytically but use binary search as specified
  let lo = 0;
  let hi = v(acquirer.revenue) + v(target.revenue); // generous upper bound
  const tolerance = 0.001; // convergence within $0.001M
  const maxIterations = 100;

  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = (lo + hi) / 2;

    // Phase-in: Year 1 cost synergies use schedule[0] if available
    // For break-even, we assume all synergies are cost synergies realized at schedule[0]
    const schedule0 = inputs.synergies.costSynergyPhaseInSchedule[0] ?? 1;
    const realizedSynergies = mid * schedule0;

    const preTaxAdj = realizedSynergies - additionalInterestExpense - totalAdditionalDAndA - oneTimeCosts;
    const afterTaxAdj = preTaxAdj * (1 - taxRate);
    const proFormaNI = acquirerNetIncome1 + targetNetIncome1 + afterTaxAdj;
    const proFormaEPS = proFormaNI / proFormaDilutedShares;

    if (Math.abs(proFormaEPS - acquirerEPS1) < tolerance / proFormaDilutedShares) {
      return Math.round(mid * 1000) / 1000; // round to 3 decimal places
    }

    if (proFormaEPS < acquirerEPS1) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return Math.round(((lo + hi) / 2) * 1000) / 1000;
}

// ============================================================
// Helper: compute pro forma balance sheet at close
// ============================================================
interface BalanceSheetParams {
  goodwill: number;
  ppAndEWriteUp: number;
  intangiblesStepUp: number;
  cashComponent: number;
  debtComponent: number;
  stockComponent: number;
  deferredTaxLiability: number;
}

function computeProFormaBalanceSheet(
  inputs: MAInputs,
  params: BalanceSheetParams
): MAOutputs['proFormaBalanceSheet'] {
  const { acquirer, target } = inputs;
  const {
    goodwill,
    ppAndEWriteUp,
    intangiblesStepUp,
    cashComponent,
    debtComponent,
    stockComponent,
    deferredTaxLiability,
  } = params;

  // Combined assets = acquirer assets + target assets + goodwill + write-ups
  // Subtract cash used for purchase
  const totalAssets =
    v(acquirer.totalAssets) +
    v(target.totalAssets) +
    goodwill +
    ppAndEWriteUp +
    intangiblesStepUp -
    cashComponent;

  // Cash: acquirer cash + target cash - cash used for purchase
  const cash =
    v(acquirer.cashAndEquivalents) +
    v(target.cashAndEquivalents) -
    cashComponent;

  // Combined debt = acquirer debt + target debt + new debt issued
  const totalDebt =
    v(acquirer.totalDebt) +
    v(target.totalDebt) +
    debtComponent;

  // Equity: acquirer equity + stock component (new shares) - target equity removed
  // + target equity absorbed + PPA adjustments
  // Simplified: acquirer equity + stock component + adjustments from PPA
  const totalEquity =
    v(acquirer.totalEquity) +
    stockComponent +
    ppAndEWriteUp +
    intangiblesStepUp -
    deferredTaxLiability -
    (goodwill > 0 ? 0 : 0); // goodwill is already captured in total assets

  return {
    totalAssets,
    goodwill,
    totalDebt,
    totalEquity,
    cash: Math.max(cash, 0), // cash floor at 0
  };
}

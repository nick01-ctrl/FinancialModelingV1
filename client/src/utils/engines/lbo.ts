import type {
  LBOInputs,
  LBOOutputs,
  LBOProjectionYear,
} from '../../../../shared/types/lbo';
import type { ConvergenceResult } from '../../../../shared/types/common';

// ============================================================
// LBO Calculation Engine
// Pure function: no side effects, deterministic output.
// All monetary values are in millions (matching input convention).
// ============================================================

// Constants
const FINANCING_FEE_RATE = 0.02; // 2% of total debt
const TRANSACTION_FEE_RATE = 0.015; // 1.5% of EV
const CONVERGENCE_MAX_ITERATIONS = 100;
const CONVERGENCE_TOLERANCE = 1000; // $1,000 tolerance

/**
 * Calculate a complete Leveraged Buyout model from the provided inputs.
 * Handles revolver circularity via iterative convergence.
 */
export function calculateLBO(inputs: LBOInputs): LBOOutputs {
  // ----------------------------------------------------------
  // 1. Entry Calculation
  // ----------------------------------------------------------
  const entryMultiple = inputs.entryMultiple.value;
  const ltmEbitda = inputs.ltmEbitda.value;

  const impliedEnterpriseValue = entryMultiple * ltmEbitda;

  const seniorDebtAmount = inputs.seniorDebt.amount.value;
  const mezzDebtAmount = inputs.mezzanineDebt.amount.value;
  const revolverDrawn = inputs.revolver.drawnAmount.value;
  const totalDebt = seniorDebtAmount + mezzDebtAmount + revolverDrawn;

  // Financing fees = 2% of total debt; Transaction fees = 1.5% of EV
  const financingFees = totalDebt * FINANCING_FEE_RATE;
  const transactionFees = impliedEnterpriseValue * TRANSACTION_FEE_RATE;
  const totalUses = impliedEnterpriseValue + financingFees + transactionFees;

  // Sponsor equity fills the gap between uses and debt
  const sponsorEquity = totalUses - totalDebt;

  const managementRolloverPercent = inputs.managementRolloverPercent.value;
  const managementRollover = sponsorEquity * managementRolloverPercent;
  const netSponsorEquity = sponsorEquity - managementRollover;

  // ----------------------------------------------------------
  // 2. Sources & Uses
  // ----------------------------------------------------------
  const sources = {
    seniorDebt: seniorDebtAmount,
    mezzanineDebt: mezzDebtAmount,
    revolverDrawn: revolverDrawn,
    sponsorEquity: netSponsorEquity,
    managementRollover: managementRollover,
    total: seniorDebtAmount + mezzDebtAmount + revolverDrawn + netSponsorEquity + managementRollover,
  };

  const uses = {
    enterpriseValue: impliedEnterpriseValue,
    financingFees,
    transactionFees,
    total: totalUses,
  };

  // ----------------------------------------------------------
  // 3. Derive Base Revenue
  // ----------------------------------------------------------
  // Base revenue = LTM EBITDA / first-year EBITDA margin
  const firstYearMargin = inputs.ebitdaMargins[0]?.value ?? 0.2;
  const baseRevenue = firstYearMargin !== 0 ? ltmEbitda / firstYearMargin : ltmEbitda;

  // ----------------------------------------------------------
  // 4. Operating Projections & Debt Schedule with Revolver
  //    Circularity Resolution
  // ----------------------------------------------------------
  const projectionPeriod = inputs.projectionPeriod;
  const taxRate = inputs.taxRate.value;
  const capexPercent = inputs.capexAsPercentOfRevenue.value;
  const daPercent = inputs.daAsPercentOfRevenue.value;
  const nwcPercent = inputs.nwcAsPercentOfRevenueChange.value;
  const cashSweepPercent = inputs.cashSweepPercent;
  const exitYear = inputs.exitYear;

  // Senior debt interest calculation helper
  const seniorInterestRate = computeSeniorRate(inputs);

  // Mezz rates
  const mezzCashRate = inputs.mezzanineDebt.cashInterestRate.value;
  const mezzPikRate = inputs.mezzanineDebt.pikInterestRate.value;
  const mezzPikToggle = inputs.mezzanineDebt.pikToggle;

  // Revolver rate
  const revolverRate = inputs.revolver.interestRate.value;

  // Initial debt balances
  const initialSeniorBalance = seniorDebtAmount;
  const initialMezzBalance = mezzDebtAmount;
  const initialRevolverBalance = revolverDrawn;

  // We iterate to resolve revolver circularity:
  // Revolver interest affects FCF which affects revolver balance.
  let revolverBalances = new Array(projectionPeriod).fill(initialRevolverBalance);
  let converged = false;
  let iterations = 0;
  let finalDelta = Infinity;
  let usedFallback = false;
  let projections: LBOProjectionYear[] = [];

  while (iterations < CONVERGENCE_MAX_ITERATIONS) {
    iterations++;
    const prevRevolverBalances = [...revolverBalances];

    // Build projections with current revolver balance assumptions
    projections = [];
    let priorRevenue = baseRevenue;
    let seniorBalance = initialSeniorBalance;
    let mezzBalance = initialMezzBalance;

    for (let i = 0; i < projectionPeriod; i++) {
      const year = i + 1;
      const growthRate = inputs.revenueGrowthRates[i]?.value ?? 0;
      const ebitdaMargin = inputs.ebitdaMargins[i]?.value ?? firstYearMargin;

      // --- Revenue & EBITDA ---
      const revenue = priorRevenue * (1 + growthRate);
      const ebitda = revenue * ebitdaMargin;
      const da = revenue * daPercent;
      const ebit = ebitda - da;

      // --- Debt beginning balances ---
      const revolverBeginning = i === 0
        ? initialRevolverBalance
        : revolverBalances[i - 1];
      const beginningDebt = {
        senior: seniorBalance,
        mezzanine: mezzBalance,
        revolver: revolverBeginning,
        total: seniorBalance + mezzBalance + revolverBeginning,
      };

      // --- Interest Expense ---
      const seniorInterest = seniorBalance * seniorInterestRate;

      // Mezzanine: cash interest always; PIK accrues to principal
      let mezzCashInterest: number;
      let pikAccrual: number;
      if (mezzPikToggle === 'cash') {
        mezzCashInterest = mezzBalance * mezzCashRate;
        pikAccrual = 0;
      } else if (mezzPikToggle === 'pik') {
        mezzCashInterest = 0;
        pikAccrual = mezzBalance * mezzPikRate;
      } else {
        // toggle: both cash and PIK portions apply
        mezzCashInterest = mezzBalance * mezzCashRate;
        pikAccrual = mezzBalance * mezzPikRate;
      }

      const revolverInterest = revolverBeginning * revolverRate;

      const totalInterest = seniorInterest + mezzCashInterest + revolverInterest;

      // --- Tax & Net Income ---
      const preTaxIncome = ebit - totalInterest;
      const taxes = Math.max(0, preTaxIncome * taxRate);
      const netIncome = preTaxIncome - taxes;

      // --- Capex & NWC ---
      const capex = revenue * capexPercent;
      const revenueChange = revenue - priorRevenue;
      const changeInNWC = revenueChange * nwcPercent;

      // --- Free Cash Flow ---
      // FCF = EBITDA - Cash Interest - Taxes - Capex - Change in NWC
      const freeCashFlow = ebitda - totalInterest - taxes - capex - changeInNWC;

      // --- Mandatory Amortization ---
      const amortPct = inputs.seniorDebt.amortizationSchedule[i]?.value ?? 0;
      const mandatoryAmortization = Math.min(
        seniorDebtAmount * amortPct, // % of original principal
        seniorBalance, // cannot exceed remaining balance
      );

      // --- Cash Sweep ---
      const fcfAfterMandatory = freeCashFlow - mandatoryAmortization;
      let cashSweepRepayment = 0;
      if (fcfAfterMandatory > 0) {
        cashSweepRepayment = Math.min(
          fcfAfterMandatory * cashSweepPercent,
          seniorBalance - mandatoryAmortization, // cannot pay down more than remaining
        );
      }

      // --- Update Senior Balance ---
      const endingSenior = Math.max(
        0,
        seniorBalance - mandatoryAmortization - cashSweepRepayment,
      );

      // --- Update Mezzanine Balance (PIK accrual added) ---
      const endingMezz = mezzBalance + pikAccrual;

      // --- Update Revolver Balance ---
      // After mandatory amort and cash sweep, if remaining FCF is negative,
      // the revolver may need to be drawn upon further; if positive, it can
      // be paid down.
      const fcfAfterDebtService = freeCashFlow - mandatoryAmortization - cashSweepRepayment;
      let endingRevolver: number;
      if (fcfAfterDebtService >= 0) {
        // Pay down revolver with remaining cash
        endingRevolver = Math.max(0, revolverBeginning - fcfAfterDebtService);
      } else {
        // Draw on revolver to cover cash shortfall
        const additionalDraw = Math.abs(fcfAfterDebtService);
        endingRevolver = Math.min(
          revolverBeginning + additionalDraw,
          inputs.revolver.commitmentSize.value, // cap at commitment size
        );
      }

      revolverBalances[i] = endingRevolver;

      const endingDebt = {
        senior: endingSenior,
        mezzanine: endingMezz,
        revolver: endingRevolver,
        total: endingSenior + endingMezz + endingRevolver,
      };

      // --- Covenant Tests ---
      const netLeverageRatio = ebitda !== 0 ? endingDebt.total / ebitda : Infinity;
      const interestCoverageRatio = totalInterest !== 0 ? ebitda / totalInterest : Infinity;
      const leverageBreached = netLeverageRatio > inputs.maxLeverageRatio.value;
      const coverageBreached = interestCoverageRatio < inputs.minInterestCoverage.value;

      projections.push({
        year,
        revenue,
        ebitda,
        ebitdaMargin,
        depreciationAmortization: da,
        ebit,
        interestExpense: totalInterest,
        seniorInterest,
        mezzanineInterest: mezzCashInterest,
        revolverInterest,
        pikAccrual,
        preTaxIncome,
        taxes,
        netIncome,
        capex,
        changeInNWC,
        freeCashFlow,
        beginningDebt,
        mandatoryAmortization,
        cashSweepRepayment,
        endingDebt,
        netLeverageRatio,
        interestCoverageRatio,
        leverageBreached,
        coverageBreached,
      });

      // Carry forward balances
      priorRevenue = revenue;
      seniorBalance = endingSenior;
      mezzBalance = endingMezz;
    }

    // Check convergence: max absolute change in revolver balances
    finalDelta = 0;
    for (let i = 0; i < projectionPeriod; i++) {
      finalDelta = Math.max(finalDelta, Math.abs(revolverBalances[i] - prevRevolverBalances[i]));
    }

    if (finalDelta <= CONVERGENCE_TOLERANCE) {
      converged = true;
      break;
    }
  }

  // If didn't converge, fall back to beginning-of-period balances
  if (!converged) {
    usedFallback = true;
    // Re-run one final time using beginning-of-period revolver balances
    // (which means revolver balance doesn't change within-period).
    revolverBalances = new Array(projectionPeriod).fill(initialRevolverBalance);
    projections = buildProjections(
      inputs,
      baseRevenue,
      firstYearMargin,
      initialSeniorBalance,
      initialMezzBalance,
      revolverBalances,
      seniorInterestRate,
      true, // useFallback: lock revolver to beginning balance
    );
  }

  const convergence: ConvergenceResult = {
    converged,
    iterations,
    finalDelta,
    usedFallback,
    fallbackMessage: usedFallback
      ? 'Revolver circularity did not converge within 100 iterations. Using beginning-of-period revolver balances as fallback.'
      : undefined,
  };

  // ----------------------------------------------------------
  // 5. Exit & Returns
  // ----------------------------------------------------------
  const exitYearIndex = Math.min(exitYear, projections.length) - 1;
  const exitProjection = projections[exitYearIndex];
  const exitEbitda = exitProjection.ebitda;
  const exitMultiple = inputs.exitMultiple.value;

  const exitEnterpriseValue = exitMultiple * exitEbitda;
  const netDebtAtExit = exitProjection.endingDebt.total;
  const exitEquityValue = exitEnterpriseValue - netDebtAtExit;

  // Total distributions: exit equity goes to sponsor and management
  const totalDistributions = exitEquityValue;

  // Returns computation
  let irr: number | null = null;
  let moic: number | null = null;
  let irrPreManagement: number | null = null;

  if (exitEquityValue <= 0 || sponsorEquity <= 0) {
    // Equity wipeout
    irr = null;
    moic = null;
    irrPreManagement = null;
  } else {
    // MOIC = Exit Equity / Sponsor Equity invested (total, including mgmt rollover)
    moic = exitEquityValue / sponsorEquity;

    // IRR: solve (sponsorEquity) * (1 + IRR)^n = exitEquityValue
    // IRR = (exitEquityValue / sponsorEquity)^(1/n) - 1
    // This is the simple case with a single investment and single exit.
    // We use Newton-Raphson for robustness.
    const n = exitYear;
    irr = solveIRR(sponsorEquity, exitEquityValue, n);

    // IRR pre-management: based on net sponsor equity (excluding mgmt rollover)
    if (netSponsorEquity > 0) {
      // Sponsor's share of exit equity is proportional to their equity contribution
      const sponsorShareOfExit = exitEquityValue * (netSponsorEquity / sponsorEquity);
      irrPreManagement = solveIRR(netSponsorEquity, sponsorShareOfExit, n);
    } else {
      irrPreManagement = null;
    }
  }

  // ----------------------------------------------------------
  // 6. Assemble Output
  // ----------------------------------------------------------
  return {
    // Entry
    impliedEnterpriseValue,
    totalDebt,
    sponsorEquity,
    managementRollover,

    // Sources & Uses
    sources,
    uses,

    // Projections
    projections,

    // Exit & Returns
    exitEnterpriseValue,
    exitEquityValue,
    totalDistributions,
    irr,
    moic,
    irrPreManagement,

    // Convergence
    convergence,
  };
}

// ============================================================
// Helper: Compute effective senior debt interest rate
// ============================================================
function computeSeniorRate(inputs: LBOInputs): number {
  if (inputs.seniorDebt.interestType === 'floating') {
    const sofrRate = inputs.seniorDebt.sofrRate?.value ?? 0;
    const spread = inputs.seniorDebt.interestRate.value;
    return sofrRate + spread;
  }
  return inputs.seniorDebt.interestRate.value;
}

// ============================================================
// Helper: Solve IRR using Newton-Raphson
// Given: investment at t=0, payout at t=n
// Solve: investment * (1 + r)^n = payout
// f(r) = investment * (1+r)^n - payout = 0
// f'(r) = investment * n * (1+r)^(n-1)
// ============================================================
function solveIRR(
  investment: number,
  payout: number,
  n: number,
): number | null {
  if (investment <= 0 || payout <= 0 || n <= 0) {
    return null;
  }

  // Analytical solution for simple case: r = (payout/investment)^(1/n) - 1
  const analyticalIRR = Math.pow(payout / investment, 1 / n) - 1;

  // Validate with Newton-Raphson
  let r = analyticalIRR;
  const maxIter = 50;
  const tolerance = 1e-10;

  for (let i = 0; i < maxIter; i++) {
    const f = investment * Math.pow(1 + r, n) - payout;
    const fPrime = investment * n * Math.pow(1 + r, n - 1);

    if (Math.abs(fPrime) < 1e-15) {
      // Derivative too small, return analytical solution
      return analyticalIRR;
    }

    const rNew = r - f / fPrime;

    if (Math.abs(rNew - r) < tolerance) {
      return rNew;
    }

    r = rNew;

    // Guard against divergence
    if (r < -0.999 || r > 100) {
      return analyticalIRR;
    }
  }

  // If Newton-Raphson didn't converge, return analytical solution
  return analyticalIRR;
}

// ============================================================
// Helper: Build full projections (used for fallback path)
// ============================================================
function buildProjections(
  inputs: LBOInputs,
  baseRevenue: number,
  firstYearMargin: number,
  initialSeniorBalance: number,
  initialMezzBalance: number,
  revolverBalances: number[],
  seniorInterestRate: number,
  useFallback: boolean,
): LBOProjectionYear[] {
  const projectionPeriod = inputs.projectionPeriod;
  const taxRate = inputs.taxRate.value;
  const capexPercent = inputs.capexAsPercentOfRevenue.value;
  const daPercent = inputs.daAsPercentOfRevenue.value;
  const nwcPercent = inputs.nwcAsPercentOfRevenueChange.value;
  const cashSweepPercent = inputs.cashSweepPercent;
  const seniorDebtAmount = inputs.seniorDebt.amount.value;
  const initialRevolverBalance = inputs.revolver.drawnAmount.value;

  const mezzCashRate = inputs.mezzanineDebt.cashInterestRate.value;
  const mezzPikRate = inputs.mezzanineDebt.pikInterestRate.value;
  const mezzPikToggle = inputs.mezzanineDebt.pikToggle;
  const revolverRate = inputs.revolver.interestRate.value;

  const projections: LBOProjectionYear[] = [];
  let priorRevenue = baseRevenue;
  let seniorBalance = initialSeniorBalance;
  let mezzBalance = initialMezzBalance;

  for (let i = 0; i < projectionPeriod; i++) {
    const year = i + 1;
    const growthRate = inputs.revenueGrowthRates[i]?.value ?? 0;
    const ebitdaMargin = inputs.ebitdaMargins[i]?.value ?? firstYearMargin;

    const revenue = priorRevenue * (1 + growthRate);
    const ebitda = revenue * ebitdaMargin;
    const da = revenue * daPercent;
    const ebit = ebitda - da;

    const revolverBeginning = i === 0
      ? initialRevolverBalance
      : revolverBalances[i - 1];

    const beginningDebt = {
      senior: seniorBalance,
      mezzanine: mezzBalance,
      revolver: revolverBeginning,
      total: seniorBalance + mezzBalance + revolverBeginning,
    };

    const seniorInterest = seniorBalance * seniorInterestRate;

    let mezzCashInterest: number;
    let pikAccrual: number;
    if (mezzPikToggle === 'cash') {
      mezzCashInterest = mezzBalance * mezzCashRate;
      pikAccrual = 0;
    } else if (mezzPikToggle === 'pik') {
      mezzCashInterest = 0;
      pikAccrual = mezzBalance * mezzPikRate;
    } else {
      mezzCashInterest = mezzBalance * mezzCashRate;
      pikAccrual = mezzBalance * mezzPikRate;
    }

    const revolverInterest = revolverBeginning * revolverRate;
    const totalInterest = seniorInterest + mezzCashInterest + revolverInterest;

    const preTaxIncome = ebit - totalInterest;
    const taxes = Math.max(0, preTaxIncome * taxRate);
    const netIncome = preTaxIncome - taxes;

    const capex = revenue * capexPercent;
    const revenueChange = revenue - priorRevenue;
    const changeInNWC = revenueChange * nwcPercent;

    const freeCashFlow = ebitda - totalInterest - taxes - capex - changeInNWC;

    const amortPct = inputs.seniorDebt.amortizationSchedule[i]?.value ?? 0;
    const mandatoryAmortization = Math.min(
      seniorDebtAmount * amortPct,
      seniorBalance,
    );

    const fcfAfterMandatory = freeCashFlow - mandatoryAmortization;
    let cashSweepRepayment = 0;
    if (fcfAfterMandatory > 0) {
      cashSweepRepayment = Math.min(
        fcfAfterMandatory * cashSweepPercent,
        seniorBalance - mandatoryAmortization,
      );
    }

    const endingSenior = Math.max(0, seniorBalance - mandatoryAmortization - cashSweepRepayment);
    const endingMezz = mezzBalance + pikAccrual;

    // In fallback mode, revolver stays at beginning-of-period balance
    let endingRevolver: number;
    if (useFallback) {
      endingRevolver = revolverBeginning;
    } else {
      endingRevolver = revolverBalances[i];
    }

    const endingDebt = {
      senior: endingSenior,
      mezzanine: endingMezz,
      revolver: endingRevolver,
      total: endingSenior + endingMezz + endingRevolver,
    };

    const netLeverageRatio = ebitda !== 0 ? endingDebt.total / ebitda : Infinity;
    const interestCoverageRatio = totalInterest !== 0 ? ebitda / totalInterest : Infinity;
    const leverageBreached = netLeverageRatio > inputs.maxLeverageRatio.value;
    const coverageBreached = interestCoverageRatio < inputs.minInterestCoverage.value;

    projections.push({
      year,
      revenue,
      ebitda,
      ebitdaMargin,
      depreciationAmortization: da,
      ebit,
      interestExpense: totalInterest,
      seniorInterest,
      mezzanineInterest: mezzCashInterest,
      revolverInterest,
      pikAccrual,
      preTaxIncome,
      taxes,
      netIncome,
      capex,
      changeInNWC,
      freeCashFlow,
      beginningDebt,
      mandatoryAmortization,
      cashSweepRepayment,
      endingDebt,
      netLeverageRatio,
      interestCoverageRatio,
      leverageBreached,
      coverageBreached,
    });

    priorRevenue = revenue;
    seniorBalance = endingSenior;
    mezzBalance = endingMezz;
  }

  return projections;
}

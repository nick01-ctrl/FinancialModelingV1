import {
  HistoricalYear,
  IndustrySector,
  ProjectionPeriod,
  FieldValue,
  ConvergenceResult,
} from './common';

// ============================================================
// LBO Model Types
// ============================================================

export type DebtTrancheType = 'senior_secured' | 'mezzanine' | 'revolver';
export type InterestType = 'fixed' | 'floating';
export type PIKToggle = 'cash' | 'pik' | 'toggle';
export type CashSweepPercent = 0.5 | 0.75 | 1.0;
export type ExitYear = 3 | 4 | 5 | 6;

export interface SeniorDebtTranche {
  type: 'senior_secured';
  name: string;
  amount: FieldValue<number>;
  interestType: InterestType;
  interestRate: FieldValue<number>; // fixed rate OR spread over SOFR
  sofrRate?: FieldValue<number>; // only if floating
  amortizationSchedule: FieldValue<number>[]; // % per year
  maturityYears: number;
}

export interface MezzanineTranche {
  type: 'mezzanine';
  name: string;
  amount: FieldValue<number>;
  pikToggle: PIKToggle;
  cashInterestRate: FieldValue<number>;
  pikInterestRate: FieldValue<number>;
  maturityYears: number;
}

export interface RevolverTranche {
  type: 'revolver';
  commitmentSize: FieldValue<number>;
  drawnAmount: FieldValue<number>;
  interestRate: FieldValue<number>;
}

export type DebtTranche = SeniorDebtTranche | MezzanineTranche | RevolverTranche;

export interface LBOInputs {
  // Target Company
  companyName: string;
  companyDescription?: string;
  sector: IndustrySector;
  historicalFinancials: HistoricalYear[];

  // Entry Assumptions
  entryMultiple: FieldValue<number>; // EV/EBITDA
  ltmEbitda: FieldValue<number>;

  // Debt Structure
  seniorDebt: SeniorDebtTranche;
  mezzanineDebt: MezzanineTranche;
  revolver: RevolverTranche;
  cashSweepPercent: CashSweepPercent;

  // Operating Assumptions
  projectionPeriod: ProjectionPeriod;
  revenueGrowthRates: FieldValue[]; // per year
  ebitdaMargins: FieldValue[]; // per year
  capexAsPercentOfRevenue: FieldValue<number>;
  daAsPercentOfRevenue: FieldValue<number>;
  nwcAsPercentOfRevenueChange: FieldValue<number>;
  taxRate: FieldValue<number>;

  // Exit Assumptions
  exitYear: ExitYear;
  exitMultiple: FieldValue<number>; // EV/EBITDA
  managementRolloverPercent: FieldValue<number>; // 0–100%

  // Covenant Thresholds
  maxLeverageRatio: FieldValue<number>; // Net Debt / EBITDA
  minInterestCoverage: FieldValue<number>; // EBITDA / Interest
}

export interface LBOProjectionYear {
  year: number;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  depreciationAmortization: number;
  ebit: number;
  interestExpense: number; // total across tranches
  seniorInterest: number;
  mezzanineInterest: number;
  revolverInterest: number;
  pikAccrual: number;
  preTaxIncome: number;
  taxes: number;
  netIncome: number;
  capex: number;
  changeInNWC: number;
  freeCashFlow: number;

  // Debt Schedule
  beginningDebt: {
    senior: number;
    mezzanine: number;
    revolver: number;
    total: number;
  };
  mandatoryAmortization: number;
  cashSweepRepayment: number;
  endingDebt: {
    senior: number;
    mezzanine: number;
    revolver: number;
    total: number;
  };

  // Covenant Tests
  netLeverageRatio: number;
  interestCoverageRatio: number;
  leverageBreached: boolean;
  coverageBreached: boolean;
}

export interface LBOOutputs {
  // Entry
  impliedEnterpriseValue: number;
  totalDebt: number;
  sponsorEquity: number;
  managementRollover: number;

  // Sources & Uses
  sources: {
    seniorDebt: number;
    mezzanineDebt: number;
    revolverDrawn: number;
    sponsorEquity: number;
    managementRollover: number;
    total: number;
  };
  uses: {
    enterpriseValue: number;
    financingFees: number;
    transactionFees: number;
    total: number;
  };

  // Projections
  projections: LBOProjectionYear[];

  // Exit & Returns
  exitEnterpriseValue: number;
  exitEquityValue: number;
  totalDistributions: number;
  irr: number | null; // null if equity wiped out
  moic: number | null;
  irrPreManagement: number | null;

  // Convergence
  convergence: ConvergenceResult;
}

export interface LBOModel {
  inputs: LBOInputs;
  outputs: LBOOutputs | null;
}

export function createDefaultLBOInputs(): LBOInputs {
  const projectionPeriod = 5;
  const defaultGrowthRates = Array.from({ length: projectionPeriod }, () => ({
    value: 0.05,
  }));
  const defaultMargins = Array.from({ length: projectionPeriod }, () => ({
    value: 0.2,
  }));

  return {
    companyName: '',
    sector: 'other',
    historicalFinancials: [],
    entryMultiple: { value: 8 },
    ltmEbitda: { value: 100 },
    seniorDebt: {
      type: 'senior_secured',
      name: 'Term Loan B',
      amount: { value: 400 },
      interestType: 'floating',
      interestRate: { value: 0.035 }, // SOFR + 350bps
      sofrRate: { value: 0.05 },
      amortizationSchedule: Array.from({ length: projectionPeriod }, () => ({
        value: 0.01,
      })),
      maturityYears: 7,
    },
    mezzanineDebt: {
      type: 'mezzanine',
      name: 'Mezzanine Notes',
      amount: { value: 100 },
      pikToggle: 'cash',
      cashInterestRate: { value: 0.1 },
      pikInterestRate: { value: 0.12 },
      maturityYears: 8,
    },
    revolver: {
      type: 'revolver',
      commitmentSize: { value: 50 },
      drawnAmount: { value: 0 },
      interestRate: { value: 0.07 },
    },
    cashSweepPercent: 0.5,
    projectionPeriod,
    revenueGrowthRates: defaultGrowthRates,
    ebitdaMargins: defaultMargins,
    capexAsPercentOfRevenue: { value: 0.04 },
    daAsPercentOfRevenue: { value: 0.03 },
    nwcAsPercentOfRevenueChange: { value: 0.1 },
    taxRate: { value: 0.25 },
    exitYear: 5,
    exitMultiple: { value: 8 },
    managementRolloverPercent: { value: 0 },
    maxLeverageRatio: { value: 6 },
    minInterestCoverage: { value: 2 },
  };
}

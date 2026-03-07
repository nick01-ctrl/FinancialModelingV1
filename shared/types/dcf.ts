import {
  HistoricalYear,
  IndustrySector,
  ProjectionPeriod,
  FieldValue,
  ConvergenceResult,
} from './common';

// ============================================================
// DCF Model Types
// ============================================================

export type TerminalValueMethod = 'gordon_growth' | 'exit_multiple';

export interface DCFInputs {
  // Company & Industry
  companyName: string;
  companyDescription?: string;
  sector: IndustrySector;

  // Historical Financials (3+ years)
  historicalFinancials: HistoricalYear[];

  // Projection Settings
  projectionPeriod: ProjectionPeriod;

  // Revenue Forecast (per projection year)
  revenueGrowthRates: FieldValue[]; // % growth rate per year

  // Cost Structure (per projection year)
  ebitdaMargins: FieldValue[]; // EBITDA margin % per year
  daAsPercentOfRevenue: FieldValue<number>; // D&A as % of revenue
  capexAsPercentOfRevenue: FieldValue<number>; // Capex as % of revenue
  nwcAsPercentOfRevenueChange: FieldValue<number>; // NWC change as % of revenue change

  // Tax
  taxRate: FieldValue<number>; // Effective tax rate %

  // WACC Components
  riskFreeRate: FieldValue<number>;
  equityRiskPremium: FieldValue<number>;
  beta: FieldValue<number>;
  preTaxCostOfDebt: FieldValue<number>;
  debtToEquityRatio: FieldValue<number>; // D/E ratio

  // Terminal Value
  terminalValueMethod: TerminalValueMethod;
  terminalGrowthRate: FieldValue<number>; // for Gordon Growth
  exitMultiple: FieldValue<number>; // EV/EBITDA for exit multiple method

  // Bridge to Equity
  netDebt: FieldValue<number>; // Total debt - cash
  dilutedSharesOutstanding: FieldValue<number>;
}

export interface ProjectionYear {
  year: number;
  revenue: number;
  revenueGrowth: number;
  ebitda: number;
  ebitdaMargin: number;
  depreciationAmortization: number;
  ebit: number;
  taxes: number;
  nopat: number; // Net Operating Profit After Tax
  capex: number;
  changeInNWC: number;
  unleveredFCF: number;
  discountFactor: number;
  pvOfFCF: number;
}

export interface DCFOutputs {
  // Projection table
  projections: ProjectionYear[];

  // WACC Calculation
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  wacc: number;
  equityWeight: number;
  debtWeight: number;

  // Terminal Value (both methods)
  terminalValueGordon: number;
  terminalValueExitMultiple: number;
  selectedTerminalValue: number;
  pvOfTerminalValue: number;
  impliedTerminalGrowthFromMultiple: number;
  impliedExitMultipleFromGrowth: number;

  // Valuation
  sumOfPVofFCFs: number;
  enterpriseValue: number;
  equityValue: number;
  impliedSharePrice: number;

  // EV Bridge
  evBridge: {
    pvOfFCFs: number;
    pvOfTerminalValue: number;
    enterpriseValue: number;
    lessNetDebt: number;
    equityValue: number;
    dilutedShares: number;
    impliedSharePrice: number;
  };

  // Convergence (if circular references exist)
  convergence?: ConvergenceResult;
}

export interface DCFModel {
  inputs: DCFInputs;
  outputs: DCFOutputs | null;
}

// Default values for new DCF model
export function createDefaultDCFInputs(): DCFInputs {
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
    projectionPeriod,
    historicalFinancials: [],
    revenueGrowthRates: defaultGrowthRates,
    ebitdaMargins: defaultMargins,
    daAsPercentOfRevenue: { value: 0.03 },
    capexAsPercentOfRevenue: { value: 0.04 },
    nwcAsPercentOfRevenueChange: { value: 0.1 },
    taxRate: { value: 0.25 },
    riskFreeRate: { value: 0.042 },
    equityRiskPremium: { value: 0.05 },
    beta: { value: 1.0 },
    preTaxCostOfDebt: { value: 0.06 },
    debtToEquityRatio: { value: 0.3 },
    terminalValueMethod: 'gordon_growth',
    terminalGrowthRate: { value: 0.025 },
    exitMultiple: { value: 10 },
    netDebt: { value: 0 },
    dilutedSharesOutstanding: { value: 100 },
  };
}

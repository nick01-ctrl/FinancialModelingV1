import { FieldValue, ProjectionPeriod, IndustrySector } from './common';

// ============================================================
// M&A / Merger Model Types
// ============================================================

export interface CompanyFinancials {
  companyName: string;
  sector: IndustrySector;
  revenue: FieldValue<number>;
  ebitda: FieldValue<number>;
  ebit: FieldValue<number>;
  netIncome: FieldValue<number>;
  eps: FieldValue<number>;
  dilutedShares: FieldValue<number>;
  totalDebt: FieldValue<number>;
  cashAndEquivalents: FieldValue<number>;
  totalAssets: FieldValue<number>;
  totalEquity: FieldValue<number>;
  ppAndE: FieldValue<number>;
  intangibles: FieldValue<number>;
  taxRate: FieldValue<number>;
  revenueGrowth: FieldValue<number>; // annual growth
  ebitdaMargin: FieldValue<number>;
}

export interface DealTerms {
  // Purchase price
  offerPricePerShare: FieldValue<number>;
  premiumToCurrentPrice: FieldValue<number>; // %
  currentSharePrice: FieldValue<number>;

  // Financing mix (must sum to 100%)
  cashPercent: FieldValue<number>;
  stockPercent: FieldValue<number>;
  debtPercent: FieldValue<number>;

  // New debt terms
  newDebtInterestRate: FieldValue<number>;
  newDebtMaturityYears: number;

  // Exchange ratio (for stock portion)
  acquirerSharePrice: FieldValue<number>;
}

export interface Synergies {
  // Cost synergies
  runRateCostSynergies: FieldValue<number>; // annual run-rate
  costSynergyPhaseInYears: 1 | 2 | 3;
  costSynergyPhaseInSchedule: number[]; // % realized per year

  // Revenue synergies
  runRateRevenueSynergies: FieldValue<number>;
  revenueSynergyPhaseInYears: 1 | 2 | 3;
  revenueSynergyPhaseInSchedule: number[];

  // One-time costs
  transactionCosts: FieldValue<number>; // advisory, legal
  financingCosts: FieldValue<number>;
  restructuringCosts: FieldValue<number>;
}

export interface PurchasePriceAllocation {
  ppAndEWriteUpPercent: FieldValue<number>;
  intangiblesStepUp: FieldValue<number>;
  deferredTaxLiabilityRate: FieldValue<number>;
}

export interface MAInputs {
  // Acquirer
  acquirer: CompanyFinancials;

  // Target
  target: CompanyFinancials;

  // Deal
  dealTerms: DealTerms;

  // Synergies
  synergies: Synergies;

  // PPA
  purchasePriceAllocation: PurchasePriceAllocation;

  // Projection
  projectionPeriod: ProjectionPeriod;
}

export interface ProFormaYear {
  year: number;
  // Acquirer standalone
  acquirerRevenue: number;
  acquirerEbitda: number;
  acquirerNetIncome: number;
  acquirerEPS: number;

  // Target standalone
  targetRevenue: number;
  targetEbitda: number;
  targetNetIncome: number;

  // Synergies realized
  costSynergiesRealized: number;
  revenueSynergiesRealized: number;
  totalSynergies: number;

  // Adjustments
  additionalInterestExpense: number; // from deal financing
  additionalDAndA: number; // from PPA write-ups
  oneTimeCosts: number;

  // Pro forma combined
  proFormaRevenue: number;
  proFormaEbitda: number;
  proFormaNetIncome: number;
  proFormaEPS: number;
  proFormaDilutedShares: number;

  // Accretion / Dilution
  epsAccretionDilution: number; // $ change
  epsAccretionDilutionPercent: number; // % change
  isAccretive: boolean;
}

export interface MAOutputs {
  // Deal summary
  totalPurchasePrice: number;
  impliedEV: number;
  cashComponent: number;
  stockComponent: number;
  debtComponent: number;
  newSharesIssued: number;

  // PPA
  goodwill: number;
  ppAndEWriteUp: number;
  intangiblesStepUp: number;
  deferredTaxLiability: number;
  totalFairValueOfNetAssets: number;

  // Pro forma projections
  proFormaYears: ProFormaYear[];

  // Break-even synergies
  breakEvenSynergies: number; // minimum synergies for EPS-neutral Year 1

  // Pro forma balance sheet (Year 0 / closing)
  proFormaBalanceSheet: {
    totalAssets: number;
    goodwill: number;
    totalDebt: number;
    totalEquity: number;
    cash: number;
  };
}

export interface MAModel {
  inputs: MAInputs;
  outputs: MAOutputs | null;
}

export function createDefaultMAInputs(): MAInputs {
  const defaultCompanyFinancials = (): CompanyFinancials => ({
    companyName: '',
    sector: 'other',
    revenue: { value: 1000 },
    ebitda: { value: 200 },
    ebit: { value: 150 },
    netIncome: { value: 100 },
    eps: { value: 2.0 },
    dilutedShares: { value: 50 },
    totalDebt: { value: 300 },
    cashAndEquivalents: { value: 100 },
    totalAssets: { value: 2000 },
    totalEquity: { value: 800 },
    ppAndE: { value: 500 },
    intangibles: { value: 200 },
    taxRate: { value: 0.25 },
    revenueGrowth: { value: 0.05 },
    ebitdaMargin: { value: 0.2 },
  });

  return {
    acquirer: defaultCompanyFinancials(),
    target: defaultCompanyFinancials(),
    dealTerms: {
      offerPricePerShare: { value: 30 },
      premiumToCurrentPrice: { value: 0.25 },
      currentSharePrice: { value: 24 },
      cashPercent: { value: 0.5 },
      stockPercent: { value: 0.3 },
      debtPercent: { value: 0.2 },
      newDebtInterestRate: { value: 0.05 },
      newDebtMaturityYears: 7,
      acquirerSharePrice: { value: 50 },
    },
    synergies: {
      runRateCostSynergies: { value: 50 },
      costSynergyPhaseInYears: 2,
      costSynergyPhaseInSchedule: [0.5, 1.0],
      runRateRevenueSynergies: { value: 0 },
      revenueSynergyPhaseInYears: 3,
      revenueSynergyPhaseInSchedule: [0.25, 0.5, 1.0],
      transactionCosts: { value: 25 },
      financingCosts: { value: 10 },
      restructuringCosts: { value: 15 },
    },
    purchasePriceAllocation: {
      ppAndEWriteUpPercent: { value: 0.1 },
      intangiblesStepUp: { value: 50 },
      deferredTaxLiabilityRate: { value: 0.25 },
    },
    projectionPeriod: 5,
  };
}

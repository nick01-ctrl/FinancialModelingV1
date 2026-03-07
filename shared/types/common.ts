// ============================================================
// Common types shared across all model types
// ============================================================

export type ModelType = 'dcf' | 'lbo' | 'ma' | 'comps';

export type DataEntryMode = 'manual' | 'paste_parse' | 'ai_auto';

export type ProjectionPeriod = 5 | 7 | 10;

export interface ModelMeta {
  id: string;
  userId: string;
  name: string;
  modelType: ModelType;
  companyName: string;
  description?: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  valuationSummary?: string; // e.g. "DCF: $42–58 / share"
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: number;
  data: string; // JSON blob
  createdAt: string;
}

export type FieldSource = 'manual' | 'ai_suggested' | 'ai_parsed' | 'ai_auto';

export interface FieldMeta {
  source: FieldSource;
  aiConfidence?: number;
  aiReasoning?: string;
  validationWarning?: string;
}

export interface FieldValue<T = number> {
  value: T;
  meta?: FieldMeta;
}

// Historical financials (3+ years)
export interface HistoricalYear {
  year: number;
  revenue: number;
  ebitda: number;
  depreciationAmortization: number;
  capex: number;
  netWorkingCapital: number;
  netIncome?: number;
  interestExpense?: number;
  taxExpense?: number;
  totalDebt?: number;
  cashAndEquivalents?: number;
  totalAssets?: number;
  totalEquity?: number;
}

// Industry sectors for AI benchmarks
export type IndustrySector =
  | 'technology_software'
  | 'technology_hardware'
  | 'healthcare_pharma'
  | 'healthcare_services'
  | 'financials_banking'
  | 'financials_insurance'
  | 'consumer_discretionary'
  | 'consumer_staples'
  | 'industrials'
  | 'energy'
  | 'materials'
  | 'real_estate'
  | 'utilities'
  | 'telecom'
  | 'other';

export const SECTOR_LABELS: Record<IndustrySector, string> = {
  technology_software: 'Technology - Software',
  technology_hardware: 'Technology - Hardware',
  healthcare_pharma: 'Healthcare - Pharma',
  healthcare_services: 'Healthcare - Services',
  financials_banking: 'Financials - Banking',
  financials_insurance: 'Financials - Insurance',
  consumer_discretionary: 'Consumer Discretionary',
  consumer_staples: 'Consumer Staples',
  industrials: 'Industrials',
  energy: 'Energy',
  materials: 'Materials',
  real_estate: 'Real Estate',
  utilities: 'Utilities',
  telecom: 'Telecom',
  other: 'Other',
};

// Convergence result from iterative solver
export interface ConvergenceResult {
  converged: boolean;
  iterations: number;
  finalDelta: number;
  usedFallback: boolean;
  fallbackMessage?: string;
}

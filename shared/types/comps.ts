import { FieldValue, IndustrySector } from './common';

// ============================================================
// Comparable Company Analysis Types
// ============================================================

export interface PeerCompany {
  id: string;
  companyName: string;
  ticker?: string;
  enterpriseValue: FieldValue<number>;
  ltmRevenue: FieldValue<number>;
  ltmEbitda: FieldValue<number>;
  ntmRevenue?: FieldValue<number>;
  ntmEbitda?: FieldValue<number>;
  netIncome: FieldValue<number>;
  marketCap: FieldValue<number>;
  sharesOutstanding: FieldValue<number>;

  // Calculated multiples
  evToRevenueLTM?: number;
  evToEbitdaLTM?: number;
  evToRevenueNTM?: number;
  evToEbitdaNTM?: number;
  peRatioLTM?: number;
}

export interface SubjectCompany {
  companyName: string;
  sector: IndustrySector;
  ltmRevenue: FieldValue<number>;
  ltmEbitda: FieldValue<number>;
  ntmRevenue?: FieldValue<number>;
  ntmEbitda?: FieldValue<number>;
  netIncome: FieldValue<number>;
  sharesOutstanding: FieldValue<number>;
  netDebt: FieldValue<number>;
}

export interface CompsInputs {
  subjectCompany: SubjectCompany;
  peerCompanies: PeerCompany[];
  selectedMultiples: MultipleName[];
}

export type MultipleName =
  | 'ev_revenue_ltm'
  | 'ev_ebitda_ltm'
  | 'ev_revenue_ntm'
  | 'ev_ebitda_ntm'
  | 'pe_ltm';

export const MULTIPLE_LABELS: Record<MultipleName, string> = {
  ev_revenue_ltm: 'EV / Revenue (LTM)',
  ev_ebitda_ltm: 'EV / EBITDA (LTM)',
  ev_revenue_ntm: 'EV / Revenue (NTM)',
  ev_ebitda_ntm: 'EV / EBITDA (NTM)',
  pe_ltm: 'P/E (LTM)',
};

export interface MultipleStats {
  multiple: MultipleName;
  values: { companyName: string; value: number }[];
  min: number;
  max: number;
  median: number;
  mean: number;
  percentile25: number;
  percentile75: number;
}

export interface ImpliedValuation {
  multiple: MultipleName;
  atPercentile25: {
    enterpriseValue: number;
    equityValue: number;
    impliedSharePrice: number;
  };
  atMedian: {
    enterpriseValue: number;
    equityValue: number;
    impliedSharePrice: number;
  };
  atPercentile75: {
    enterpriseValue: number;
    equityValue: number;
    impliedSharePrice: number;
  };
}

export interface CompsOutputs {
  peerMultiples: MultipleStats[];
  impliedValuations: ImpliedValuation[];
  summary: {
    lowSharePrice: number;
    midSharePrice: number;
    highSharePrice: number;
  };
}

export interface CompsModel {
  inputs: CompsInputs;
  outputs: CompsOutputs | null;
}

export function createDefaultCompsInputs(): CompsInputs {
  return {
    subjectCompany: {
      companyName: '',
      sector: 'other',
      ltmRevenue: { value: 500 },
      ltmEbitda: { value: 100 },
      netIncome: { value: 60 },
      sharesOutstanding: { value: 50 },
      netDebt: { value: 200 },
    },
    peerCompanies: [],
    selectedMultiples: ['ev_ebitda_ltm', 'ev_revenue_ltm', 'pe_ltm'],
  };
}

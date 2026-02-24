export interface DCFInputs {
  companyName: string;
  companyDescription: string;
  sector: string;
  projectionYears: 5 | 7 | 10;

  // Historical financials (3 years)
  historicalRevenue: number[];
  historicalEBITDA: number[];
  historicalDA: number[];
  historicalCapex: number[];
  historicalNWC: number[];

  // Projections (length matches projectionYears)
  revenueGrowthRates: number[];
  ebitdaMargins: number[];

  // Cost structure (percentages)
  daPercentRevenue: number;
  capexPercentRevenue: number;
  nwcPercentRevenueChange: number;
  taxRate: number;

  // WACC components (percentages)
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  preTaxCostOfDebt: number;
  debtToEquity: number;

  // Terminal value
  terminalValueMethod: 'gordon-growth' | 'exit-multiple';
  terminalGrowthRate: number;
  exitMultiple: number;

  // Equity bridge
  netDebt: number;
  dilutedShares: number;
}

export interface YearlyProjection {
  year: number;
  revenue: number;
  ebitda: number;
  da: number;
  capex: number;
  nwcChange: number;
  taxExpense: number;
  ufcf: number;
  discountFactor: number;
  pvUFCF: number;
}

export interface DCFOutputs {
  wacc: number;
  costOfEquity: number;
  projections: YearlyProjection[];
  sumPVofFCFs: number;
  terminalValueGordon: number | null;
  terminalValueExitMultiple: number | null;
  pvTerminalValueGordon: number | null;
  pvTerminalValueExitMultiple: number | null;
  enterpriseValueGordon: number | null;
  enterpriseValueExitMultiple: number | null;
  equityValueGordon: number | null;
  equityValueExitMultiple: number | null;
  impliedSharePriceGordon: number | null;
  impliedSharePriceExitMultiple: number | null;
  error: string | null;
}

export interface SensitivityCell {
  xValue: number;
  yValue: number;
  outputValue: number | null;
}

export interface SensitivityTable {
  xLabel: string;
  yLabel: string;
  outputLabel: string;
  xValues: number[];
  yValues: number[];
  cells: SensitivityCell[][];
  baseX: number;
  baseY: number;
  baseOutput: number | null;
}

export interface TornadoBar {
  label: string;
  field: string;
  lowValue: number | null;
  highValue: number | null;
  baseValue: number | null;
  lowInput: number;
  highInput: number;
  baseInput: number;
  impact: number;
}

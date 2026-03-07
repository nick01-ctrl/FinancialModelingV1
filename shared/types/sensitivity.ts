// ============================================================
// Sensitivity Analysis & Tornado Chart Types
// ============================================================

export type StepCount = 3 | 5 | 7;
export type StepType = 'absolute' | 'percentage';
export type TornadoMagnitude = 0.05 | 0.1 | 0.2;

export interface SensitivityTableConfig {
  id: string;
  xAxisInput: string; // key path in model inputs
  xAxisLabel: string;
  yAxisInput: string;
  yAxisLabel: string;
  outputMetric: string; // key path in model outputs
  outputLabel: string;
  steps: StepCount;
  stepType: StepType;
  stepSize: number; // absolute or percentage value
}

export interface SensitivityTableCell {
  xValue: number;
  yValue: number;
  outputValue: number;
  isBaseCase: boolean;
}

export interface SensitivityTableResult {
  config: SensitivityTableConfig;
  xValues: number[];
  yValues: number[];
  cells: SensitivityTableCell[][];
  baseCaseValue: number;
  minValue: number;
  maxValue: number;
}

export interface TornadoChartConfig {
  outputMetric: string;
  outputLabel: string;
  inputs: string[]; // key paths of inputs to vary
  inputLabels: string[];
  magnitude: TornadoMagnitude;
}

export interface TornadoBar {
  inputKey: string;
  inputLabel: string;
  baseValue: number;
  lowValue: number;
  highValue: number;
  lowOutput: number;
  highOutput: number;
  impact: number; // absolute spread
}

export interface TornadoChartResult {
  config: TornadoChartConfig;
  baseCaseOutput: number;
  bars: TornadoBar[]; // sorted by impact descending
}

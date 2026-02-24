import type { DCFInputs, DCFOutputs, SensitivityTable, SensitivityCell, TornadoBar } from './types';
import { calculateDCF } from './dcf';

type OutputExtractor = (outputs: DCFOutputs) => number | null;

function getOutputExtractor(metric: string): OutputExtractor {
  switch (metric) {
    case 'impliedSharePriceGordon':
      return (o) => o.impliedSharePriceGordon;
    case 'impliedSharePriceExitMultiple':
      return (o) => o.impliedSharePriceExitMultiple;
    case 'enterpriseValueGordon':
      return (o) => o.enterpriseValueGordon;
    case 'enterpriseValueExitMultiple':
      return (o) => o.enterpriseValueExitMultiple;
    case 'equityValueGordon':
      return (o) => o.equityValueGordon;
    default:
      return (o) => o.impliedSharePriceGordon;
  }
}

function getField(inputs: DCFInputs, field: string): number {
  return (inputs as unknown as Record<string, number>)[field];
}

function setNestedInput(inputs: DCFInputs, field: string, value: number): DCFInputs {
  return { ...inputs, [field]: value };
}

export function generateSensitivityTable(
  baseInputs: DCFInputs,
  xField: string,
  yField: string,
  outputMetric: string,
  steps: number = 5,
  stepSizePercent: number = 10
): SensitivityTable {
  const extract = getOutputExtractor(outputMetric);
  const baseX = getField(baseInputs, xField);
  const baseY = getField(baseInputs, yField);
  const baseOutputs = calculateDCF(baseInputs);
  const baseOutput = extract(baseOutputs);

  // Generate axis values centered on base case
  const halfSteps = Math.floor(steps / 2);
  const xStep = baseX * (stepSizePercent / 100);
  const yStep = baseY * (stepSizePercent / 100);

  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let i = -halfSteps; i <= halfSteps; i++) {
    xValues.push(baseX + i * (xStep || 0.5));
    yValues.push(baseY + i * (yStep || 0.5));
  }

  // Generate cell values
  const cells: SensitivityCell[][] = [];
  for (let yi = 0; yi < yValues.length; yi++) {
    const row: SensitivityCell[] = [];
    for (let xi = 0; xi < xValues.length; xi++) {
      let modified = setNestedInput(baseInputs, xField, xValues[xi]);
      modified = setNestedInput(modified, yField, yValues[yi]);
      const outputs = calculateDCF(modified);
      row.push({
        xValue: xValues[xi],
        yValue: yValues[yi],
        outputValue: extract(outputs),
      });
    }
    cells.push(row);
  }

  return {
    xLabel: xField,
    yLabel: yField,
    outputLabel: outputMetric,
    xValues,
    yValues,
    cells,
    baseX,
    baseY,
    baseOutput,
  };
}

export function generateTornadoData(
  baseInputs: DCFInputs,
  fields: { field: string; label: string }[],
  outputMetric: string,
  magnitudePercent: number = 10
): TornadoBar[] {
  const extract = getOutputExtractor(outputMetric);
  const baseOutputs = calculateDCF(baseInputs);
  const baseValue = extract(baseOutputs);

  const bars: TornadoBar[] = fields.map(({ field, label }) => {
    const baseInput = getField(baseInputs, field);
    const delta = baseInput * (magnitudePercent / 100) || 0.5;

    const lowInputs = setNestedInput(baseInputs, field, baseInput - delta);
    const highInputs = setNestedInput(baseInputs, field, baseInput + delta);

    const lowOutputs = calculateDCF(lowInputs);
    const highOutputs = calculateDCF(highInputs);

    const lowValue = extract(lowOutputs);
    const highValue = extract(highOutputs);

    const impact = Math.abs((highValue ?? 0) - (lowValue ?? 0));

    return {
      label,
      field,
      lowValue,
      highValue,
      baseValue,
      lowInput: baseInput - delta,
      highInput: baseInput + delta,
      baseInput,
      impact,
    };
  });

  // Sort by impact descending
  bars.sort((a, b) => b.impact - a.impact);
  return bars;
}

import { calculateDCF } from './dcf';
import { generateSensitivityTable, generateTornadoData } from './sensitivity';
import type { DCFInputs } from './types';

export type WorkerMessage =
  | { type: 'calculate'; inputs: DCFInputs }
  | {
      type: 'sensitivity';
      inputs: DCFInputs;
      xField: string;
      yField: string;
      outputMetric: string;
      steps: number;
      stepSizePercent: number;
    }
  | {
      type: 'tornado';
      inputs: DCFInputs;
      fields: { field: string; label: string }[];
      outputMetric: string;
      magnitudePercent: number;
    };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'calculate': {
      const result = calculateDCF(msg.inputs);
      self.postMessage({ type: 'calculate', result });
      break;
    }
    case 'sensitivity': {
      const table = generateSensitivityTable(
        msg.inputs,
        msg.xField,
        msg.yField,
        msg.outputMetric,
        msg.steps,
        msg.stepSizePercent
      );
      self.postMessage({ type: 'sensitivity', result: table });
      break;
    }
    case 'tornado': {
      const bars = generateTornadoData(
        msg.inputs,
        msg.fields,
        msg.outputMetric,
        msg.magnitudePercent
      );
      self.postMessage({ type: 'tornado', result: bars });
      break;
    }
  }
};

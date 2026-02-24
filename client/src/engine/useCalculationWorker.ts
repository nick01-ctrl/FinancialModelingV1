import { useEffect, useRef, useState, useCallback } from 'react';
import type { DCFInputs, DCFOutputs, SensitivityTable, TornadoBar } from './types';
import { calculateDCF } from './dcf';
import { generateSensitivityTable, generateTornadoData } from './sensitivity';

// Default tornado fields for DCF
export const DCF_TORNADO_FIELDS = [
  { field: 'riskFreeRate', label: 'Risk-Free Rate' },
  { field: 'equityRiskPremium', label: 'Equity Risk Premium' },
  { field: 'beta', label: 'Beta' },
  { field: 'preTaxCostOfDebt', label: 'Cost of Debt' },
  { field: 'debtToEquity', label: 'D/E Ratio' },
  { field: 'terminalGrowthRate', label: 'Terminal Growth' },
  { field: 'taxRate', label: 'Tax Rate' },
  { field: 'daPercentRevenue', label: 'D&A % Rev' },
  { field: 'capexPercentRevenue', label: 'Capex % Rev' },
  { field: 'nwcPercentRevenueChange', label: 'NWC % Δ Rev' },
];

interface CalculationResult {
  outputs: DCFOutputs | null;
  sensitivityTable: SensitivityTable | null;
  tornadoData: TornadoBar[];
  isCalculating: boolean;
}

export function useCalculationWorker(inputs: DCFInputs): CalculationResult {
  const [outputs, setOutputs] = useState<DCFOutputs | null>(null);
  const [sensitivityTable, setSensitivityTable] = useState<SensitivityTable | null>(null);
  const [tornadoData, setTornadoData] = useState<TornadoBar[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Recalculate on input changes with debounce
  useEffect(() => {
    setIsCalculating(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // Run calculations synchronously (fast enough for DCF)
      // Web Worker can be used for more complex models
      const result = calculateDCF(inputs);
      setOutputs(result);

      if (!result.error) {
        // Default sensitivity: WACC inputs vs Terminal Growth
        const outputMetric =
          inputs.terminalValueMethod === 'gordon-growth'
            ? 'impliedSharePriceGordon'
            : 'impliedSharePriceExitMultiple';

        const sensTable = generateSensitivityTable(
          inputs,
          inputs.terminalValueMethod === 'gordon-growth'
            ? 'terminalGrowthRate'
            : 'exitMultiple',
          'riskFreeRate',
          outputMetric,
          5,
          20
        );
        setSensitivityTable(sensTable);

        const tornado = generateTornadoData(
          inputs,
          DCF_TORNADO_FIELDS,
          outputMetric,
          10
        );
        setTornadoData(tornado);
      }

      setIsCalculating(false);
    }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputs]);

  return { outputs, sensitivityTable, tornadoData, isCalculating };
}

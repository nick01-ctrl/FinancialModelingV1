import { useEffect } from 'react';
import { useModelStore } from '../../../stores/modelStore';
import NumberInput from '../../../components/ui/NumberInput';
import '../../../components/ui/inputs.css';

interface Props {
  disabled?: boolean;
}

export default function RevenueForecastSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const aiFields = useModelStore((s) => s.aiFields);

  // Adjust growth rates array when projection years change
  useEffect(() => {
    const n = inputs.projectionYears;
    if (inputs.revenueGrowthRates.length !== n) {
      const rates = [...inputs.revenueGrowthRates];
      while (rates.length < n) rates.push(rates[rates.length - 1] || 0);
      setInput('revenueGrowthRates', rates.slice(0, n));
    }
  }, [inputs.projectionYears]);

  const handleYearToggle = (years: 5 | 7 | 10) => {
    setInput('projectionYears', years);
  };

  const handleGrowthChange = (index: number, value: number) => {
    const rates = [...inputs.revenueGrowthRates];
    rates[index] = value;
    setInput('revenueGrowthRates', rates);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
        Projection Period
      </label>
      <div className="toggle-group">
        {([5, 7, 10] as const).map((n) => (
          <button
            key={n}
            className={`toggle-btn ${inputs.projectionYears === n ? 'active' : ''}`}
            onClick={() => handleYearToggle(n)}
            disabled={disabled}
          >
            {n} Years
          </button>
        ))}
      </div>

      <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
        Revenue Growth Rate by Year (%)
      </label>
      <div className="yearly-grid">
        <table className="yearly-grid-table">
          <thead>
            <tr>
              {Array.from({ length: inputs.projectionYears }, (_, i) => (
                <th key={i}>Y{i + 1} ({currentYear + i})</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {inputs.revenueGrowthRates.slice(0, inputs.projectionYears).map((rate, i) => (
                <td key={i}>
                  <input
                    type="number"
                    value={rate || ''}
                    onChange={(e) =>
                      handleGrowthChange(i, parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    step={0.1}
                    disabled={disabled}
                    className={aiFields.has(`revenueGrowthRates.${i}`) ? 'input-ai-populated' : ''}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useModelStore } from '../../../stores/modelStore';
import NumberInput from '../../../components/ui/NumberInput';
import '../../../components/ui/inputs.css';

interface Props {
  disabled?: boolean;
}

export default function CostStructureSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const aiFields = useModelStore((s) => s.aiFields);

  // Keep EBITDA margins array in sync with projection years
  useEffect(() => {
    const n = inputs.projectionYears;
    if (inputs.ebitdaMargins.length !== n) {
      const margins = [...inputs.ebitdaMargins];
      while (margins.length < n) margins.push(margins[margins.length - 1] || 0);
      setInput('ebitdaMargins', margins.slice(0, n));
    }
  }, [inputs.projectionYears]);

  const handleMarginChange = (index: number, value: number) => {
    const margins = [...inputs.ebitdaMargins];
    margins[index] = value;
    setInput('ebitdaMargins', margins);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
        EBITDA Margin by Year (%)
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
              {inputs.ebitdaMargins.slice(0, inputs.projectionYears).map((margin, i) => (
                <td key={i}>
                  <input
                    type="number"
                    value={margin || ''}
                    onChange={(e) =>
                      handleMarginChange(i, parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    step={0.1}
                    disabled={disabled}
                    className={aiFields.has(`ebitdaMargins.${i}`) ? 'input-ai-populated' : ''}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <NumberInput
        label="Tax Rate"
        value={inputs.taxRate}
        onChange={(v) => setInput('taxRate', v)}
        suffix="%"
        step={0.5}
        min={0}
        max={100}
        isAI={aiFields.has('taxRate')}
        disabled={disabled}
      />
    </div>
  );
}

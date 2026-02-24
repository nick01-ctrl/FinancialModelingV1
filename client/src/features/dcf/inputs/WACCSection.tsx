import { useModelStore } from '../../../stores/modelStore';
import NumberInput from '../../../components/ui/NumberInput';
import { useSuggestField } from './useSuggest';

interface Props {
  disabled?: boolean;
}

export default function WACCSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const aiFields = useModelStore((s) => s.aiFields);
  const { suggestField, isPending } = useSuggestField();

  // Calculate WACC for display
  const costOfEquity =
    inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium;
  const equityWeight = 1 / (1 + inputs.debtToEquity);
  const debtWeight = inputs.debtToEquity / (1 + inputs.debtToEquity);
  const wacc =
    costOfEquity * equityWeight +
    inputs.preTaxCostOfDebt * (1 - inputs.taxRate / 100) * debtWeight;

  return (
    <div>
      <div className="section-row">
        <NumberInput
          label="Risk-Free Rate"
          value={inputs.riskFreeRate}
          onChange={(v) => setInput('riskFreeRate', v)}
          suffix="%"
          step={0.1}
          isAI={aiFields.has('riskFreeRate')}
          disabled={disabled || isPending}
          onSuggest={() => suggestField('riskFreeRate')}
          tooltip="10-year Treasury yield"
        />
        <NumberInput
          label="Equity Risk Premium"
          value={inputs.equityRiskPremium}
          onChange={(v) => setInput('equityRiskPremium', v)}
          suffix="%"
          step={0.1}
          isAI={aiFields.has('equityRiskPremium')}
          disabled={disabled || isPending}
          onSuggest={() => suggestField('equityRiskPremium')}
        />
      </div>
      <div className="section-row">
        <NumberInput
          label="Beta"
          value={inputs.beta}
          onChange={(v) => setInput('beta', v)}
          step={0.05}
          min={0}
          isAI={aiFields.has('beta')}
          disabled={disabled || isPending}
          onSuggest={() => suggestField('beta')}
        />
        <NumberInput
          label="Pre-Tax Cost of Debt"
          value={inputs.preTaxCostOfDebt}
          onChange={(v) => setInput('preTaxCostOfDebt', v)}
          suffix="%"
          step={0.1}
          isAI={aiFields.has('preTaxCostOfDebt')}
          disabled={disabled || isPending}
          onSuggest={() => suggestField('preTaxCostOfDebt')}
        />
      </div>
      <NumberInput
        label="Debt / Equity Ratio"
        value={inputs.debtToEquity}
        onChange={(v) => setInput('debtToEquity', v)}
        step={0.05}
        min={0}
        isAI={aiFields.has('debtToEquity')}
        disabled={disabled || isPending}
        onSuggest={() => suggestField('debtToEquity')}
      />

      <div
        style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Cost of Equity (Ke)</span>
          <span style={{ fontWeight: 600 }}>{costOfEquity.toFixed(1)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>WACC</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{wacc.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

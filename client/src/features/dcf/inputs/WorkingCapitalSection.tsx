import { useModelStore } from '../../../stores/modelStore';
import NumberInput from '../../../components/ui/NumberInput';
import { useSuggestField } from './useSuggest';

interface Props {
  disabled?: boolean;
}

export default function WorkingCapitalSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const aiFields = useModelStore((s) => s.aiFields);
  const { suggestField, isPending } = useSuggestField();

  return (
    <div>
      <NumberInput
        label="D&A as % of Revenue"
        value={inputs.daPercentRevenue}
        onChange={(v) => setInput('daPercentRevenue', v)}
        suffix="%"
        step={0.5}
        min={0}
        isAI={aiFields.has('daPercentRevenue')}
        disabled={disabled || isPending}
        onSuggest={() => suggestField('daPercentRevenue')}
      />
      <NumberInput
        label="Capex as % of Revenue"
        value={inputs.capexPercentRevenue}
        onChange={(v) => setInput('capexPercentRevenue', v)}
        suffix="%"
        step={0.5}
        min={0}
        isAI={aiFields.has('capexPercentRevenue')}
        disabled={disabled || isPending}
        onSuggest={() => suggestField('capexPercentRevenue')}
      />
      <NumberInput
        label="Change in NWC as % of Revenue Change"
        value={inputs.nwcPercentRevenueChange}
        onChange={(v) => setInput('nwcPercentRevenueChange', v)}
        suffix="%"
        step={0.5}
        isAI={aiFields.has('nwcPercentRevenueChange')}
        disabled={disabled || isPending}
        onSuggest={() => suggestField('nwcPercentRevenueChange')}
      />
    </div>
  );
}

import { useModelStore } from '../../../stores/modelStore';
import NumberInput from '../../../components/ui/NumberInput';
import { useSuggestField } from './useSuggest';

interface Props {
  disabled?: boolean;
}

export default function EquityBridgeSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const aiFields = useModelStore((s) => s.aiFields);
  const { suggestField, isPending } = useSuggestField();

  return (
    <div>
      <NumberInput
        label="Net Debt"
        value={inputs.netDebt}
        onChange={(v) => setInput('netDebt', v)}
        prefix="$"
        suffix="M"
        step={1}
        isAI={aiFields.has('netDebt')}
        disabled={disabled || isPending}
        onSuggest={() => suggestField('netDebt')}
        tooltip="Total debt minus cash & equivalents"
      />
      <NumberInput
        label="Diluted Shares Outstanding"
        value={inputs.dilutedShares}
        onChange={(v) => setInput('dilutedShares', v)}
        suffix="M"
        step={0.1}
        min={0.001}
        isAI={aiFields.has('dilutedShares')}
        disabled={disabled || isPending}
        onSuggest={() => suggestField('dilutedShares')}
      />
    </div>
  );
}

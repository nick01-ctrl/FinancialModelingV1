import { useModelStore } from '../../../stores/modelStore';
import NumberInput from '../../../components/ui/NumberInput';
import '../../../components/ui/inputs.css';

interface Props {
  disabled?: boolean;
}

export default function TerminalValueSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const aiFields = useModelStore((s) => s.aiFields);

  return (
    <div>
      <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
        Terminal Value Method
      </label>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${inputs.terminalValueMethod === 'gordon-growth' ? 'active' : ''}`}
          onClick={() => setInput('terminalValueMethod', 'gordon-growth')}
          disabled={disabled}
        >
          Gordon Growth
        </button>
        <button
          className={`toggle-btn ${inputs.terminalValueMethod === 'exit-multiple' ? 'active' : ''}`}
          onClick={() => setInput('terminalValueMethod', 'exit-multiple')}
          disabled={disabled}
        >
          Exit Multiple
        </button>
      </div>

      {inputs.terminalValueMethod === 'gordon-growth' ? (
        <NumberInput
          label="Terminal Growth Rate"
          value={inputs.terminalGrowthRate}
          onChange={(v) => setInput('terminalGrowthRate', v)}
          suffix="%"
          step={0.1}
          isAI={aiFields.has('terminalGrowthRate')}
          disabled={disabled}
          tooltip="Long-term sustainable growth rate (typically 2-3%)"
        />
      ) : (
        <NumberInput
          label="Exit EV/EBITDA Multiple"
          value={inputs.exitMultiple}
          onChange={(v) => setInput('exitMultiple', v)}
          suffix="x"
          step={0.5}
          min={0}
          isAI={aiFields.has('exitMultiple')}
          disabled={disabled}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import './inputs.css';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  isAI?: boolean;
  onSuggest?: () => void;
  tooltip?: string;
  disabled?: boolean;
  warning?: string | null;
  compact?: boolean;
}

export default function NumberInput({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step = 1,
  min,
  max,
  isAI = false,
  onSuggest,
  tooltip,
  disabled = false,
  warning,
  compact = false,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(String(value));

  const handleFocus = () => {
    setFocused(true);
    setDisplayValue(String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(displayValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      setDisplayValue(String(value));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const formatValue = (v: number): string => {
    if (suffix === '%') return v.toFixed(1);
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(v) >= 1_000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return v.toFixed(2);
  };

  return (
    <div className={`number-input-group ${warning ? 'has-warning' : ''} ${compact ? 'number-input-compact' : ''}`}>
      <div className="input-label-row">
        <label className="input-label">
          {label}
          {isAI && <span className="ai-badge">AI</span>}
        </label>
        {onSuggest && !disabled && (
          <button className="suggest-btn" onClick={onSuggest} type="button">
            ✦ Suggest
          </button>
        )}
      </div>
      <div className={`input-wrapper ${isAI ? 'input-ai-populated' : ''} ${warning ? 'input-warning' : ''}`}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="number"
          value={focused ? displayValue : formatValue(value)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className="number-input"
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {warning && <div className="input-warning-text">{warning}</div>}
      {tooltip && <div className="input-tooltip">{tooltip}</div>}
    </div>
  );
}

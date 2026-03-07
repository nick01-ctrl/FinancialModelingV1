import { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import type { FieldMeta, FieldSource } from '../../../../shared/types/common';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  meta?: FieldMeta;
  format?: 'number' | 'percent' | 'currency' | 'multiple';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  disabled?: boolean;
  onAISuggest?: () => void;
  className?: string;
  compact?: boolean;
}

function formatDisplay(value: number, format: string): string {
  switch (format) {
    case 'percent':
      return (value * 100).toFixed(1);
    case 'currency':
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    case 'multiple':
      return value.toFixed(1);
    default:
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
}

function parseInput(text: string, format: string): number {
  const cleaned = text.replace(/[,$%x]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return format === 'percent' ? num / 100 : num;
}

export default function NumberInput({
  label,
  value,
  onChange,
  meta,
  format = 'number',
  min,
  max,
  step,
  placeholder,
  suffix,
  prefix,
  disabled = false,
  onAISuggest,
  className,
  compact = false,
}: NumberInputProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isAI = meta?.source === 'ai_suggested' || meta?.source === 'ai_parsed' || meta?.source === 'ai_auto';
  const hasWarning = !!meta?.validationWarning;

  const handleFocus = () => {
    setEditing(true);
    setEditText(format === 'percent' ? (value * 100).toString() : value.toString());
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseInput(editText, format);
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
    onChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const displayValue = formatDisplay(value, format);
  const formatSuffix = suffix || (format === 'percent' ? '%' : format === 'multiple' ? 'x' : '');
  const formatPrefix = prefix || (format === 'currency' ? '$' : '');

  return (
    <div className={clsx('group', compact ? 'flex items-center gap-2' : '', className)}>
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">{label}</label>
          <div className="flex items-center gap-1">
            {isAI && <span className="ai-badge">AI</span>}
            {onAISuggest && (
              <button
                onClick={onAISuggest}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-brand-500 hover:text-brand-700 flex items-center gap-0.5"
              >
                <Sparkles className="w-3 h-3" />
                Suggest
              </button>
            )}
          </div>
        </div>
      )}
      {compact && <label className="text-xs font-medium text-gray-600 w-32 shrink-0">{label}</label>}
      <div className="relative flex-1">
        {formatPrefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {formatPrefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={editing ? editText : displayValue}
          onChange={(e) => setEditText(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            'w-full px-2.5 py-1.5 text-sm rounded-md border transition-colors text-right font-mono',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            formatPrefix && 'pl-6',
            formatSuffix && 'pr-6',
            disabled && 'bg-gray-100 text-gray-500',
            isAI && 'field-ai',
            hasWarning && !isAI && 'field-warning',
            !isAI && !hasWarning && 'border-gray-300',
          )}
        />
        {formatSuffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {formatSuffix}
          </span>
        )}
      </div>
      {hasWarning && (
        <p className="mt-0.5 text-xs text-amber-600">{meta!.validationWarning}</p>
      )}
      {isAI && meta?.aiReasoning && (
        <p className="mt-0.5 text-xs text-gray-500 italic">{meta.aiReasoning}</p>
      )}
    </div>
  );
}

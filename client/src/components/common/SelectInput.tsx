import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
}

export default function SelectInput({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className,
}: SelectInputProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={clsx(
            'w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 bg-white appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'pr-8',
            disabled && 'bg-gray-100 text-gray-500',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

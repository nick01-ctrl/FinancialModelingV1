import { useModelStore } from '../../stores/modelStore';
import type { DataEntryMode } from '../../../../shared/types/common';
import { PenLine, ClipboardPaste, Sparkles, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const MODES: { mode: DataEntryMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    mode: 'manual',
    label: 'Manual',
    description: 'Enter all values manually',
    icon: <PenLine className="w-3.5 h-3.5" />,
  },
  {
    mode: 'paste_parse',
    label: 'Paste & Parse',
    description: 'Paste financial data for AI parsing',
    icon: <ClipboardPaste className="w-3.5 h-3.5" />,
  },
  {
    mode: 'ai_auto',
    label: 'AI Auto-populate',
    description: 'AI fills in assumptions based on company/industry',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
];

export default function DataModeSelector() {
  const { dataEntryMode, setDataEntryMode, aiDisclaimerAcknowledged, acknowledgeAIDisclaimer } = useModelStore();

  const handleModeChange = (mode: DataEntryMode) => {
    if (mode === 'ai_auto' && !aiDisclaimerAcknowledged) {
      // Show disclaimer first
      const confirmed = window.confirm(
        'AI-generated figures may be outdated or approximate. Verify against current filings before use in live analysis.\n\nDo you acknowledge this disclaimer?'
      );
      if (!confirmed) return;
      acknowledgeAIDisclaimer();
    }
    setDataEntryMode(mode);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 mr-2">Data Mode:</span>
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {MODES.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                dataEntryMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        {dataEntryMode === 'ai_auto' && (
          <div className="flex items-center gap-1 ml-2 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            AI values are approximate — verify before use
          </div>
        )}
      </div>
    </div>
  );
}

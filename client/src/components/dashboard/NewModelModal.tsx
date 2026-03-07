import { useState } from 'react';
import type { ModelType } from '../../../../shared/types/common';
import { X, TrendingUp, BarChart3, GitMerge, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

interface NewModelModalProps {
  onClose: () => void;
  onCreate: (type: ModelType, name: string) => void;
}

const MODEL_OPTIONS: { type: ModelType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    type: 'dcf',
    label: 'DCF Analysis',
    description: 'Discounted Cash Flow — project free cash flows and discount to present value',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
  },
  {
    type: 'lbo',
    label: 'LBO Model',
    description: 'Leveraged Buyout — model debt structure, cash flows, and sponsor returns',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400',
  },
  {
    type: 'ma',
    label: 'M&A / Merger',
    description: 'Merger model — analyze accretion/dilution and pro forma financials',
    icon: <GitMerge className="w-6 h-6" />,
    color: 'border-green-200 bg-green-50 text-green-700 hover:border-green-400',
  },
  {
    type: 'comps',
    label: 'Comparable Companies',
    description: 'Trading comps — derive implied valuation from peer company multiples',
    icon: <LayoutGrid className="w-6 h-6" />,
    color: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400',
  },
];

export default function NewModelModal({ onClose, onCreate }: NewModelModalProps) {
  const [selectedType, setSelectedType] = useState<ModelType | null>(null);
  const [modelName, setModelName] = useState('');

  const handleCreate = () => {
    if (!selectedType || !modelName.trim()) return;
    onCreate(selectedType, modelName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Financial Model</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Model Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Model Type</label>
            <div className="grid grid-cols-2 gap-3">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={clsx(
                    'flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left',
                    selectedType === opt.type
                      ? 'ring-2 ring-brand-500 border-brand-500'
                      : opt.color,
                  )}
                >
                  <div className="mb-2">{opt.icon}</div>
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-xs text-gray-500 mt-1 leading-tight">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={selectedType ? `e.g. Acme Corp ${MODEL_OPTIONS.find((o) => o.type === selectedType)?.label}` : 'Select a model type first'}
              disabled={!selectedType}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedType || !modelName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Create Model
          </button>
        </div>
      </div>
    </div>
  );
}

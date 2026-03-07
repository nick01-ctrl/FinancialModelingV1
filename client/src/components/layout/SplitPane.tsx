import { useState } from 'react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import clsx from 'clsx';

interface SplitPaneProps {
  inputPane: React.ReactNode;
  outputPane: React.ReactNode;
}

export default function SplitPane({ inputPane, outputPane }: SplitPaneProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden md:flex split-container">
        <div className="input-pane">{inputPane}</div>
        <div className="output-pane">{outputPane}</div>
      </div>

      {/* Mobile: tab switching */}
      <div className="md:hidden">
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('input')}
            className={clsx(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
              activeTab === 'input'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <PanelLeftOpen className="w-4 h-4" />
            Inputs
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={clsx(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
              activeTab === 'output'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <PanelRightOpen className="w-4 h-4" />
            Outputs
          </button>
        </div>
        <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4">
          {activeTab === 'input' ? inputPane : outputPane}
        </div>
      </div>
    </>
  );
}

import { useModelStore } from '../../../stores/modelStore';
import Accordion from '../../../components/ui/Accordion';
import CompanyInfoSection from './CompanyInfoSection';
import HistoricalFinancialsSection from './HistoricalFinancialsSection';
import RevenueForecastSection from './RevenueForecastSection';
import CostStructureSection from './CostStructureSection';
import WorkingCapitalSection from './WorkingCapitalSection';
import WACCSection from './WACCSection';
import TerminalValueSection from './TerminalValueSection';
import EquityBridgeSection from './EquityBridgeSection';

interface DCFInputPanelProps {
  readOnly?: boolean;
}

export default function DCFInputPanel({ readOnly = false }: DCFInputPanelProps) {
  const dataMode = useModelStore((s) => s.dataMode);
  const setDataMode = useModelStore((s) => s.setDataMode);

  const sections = [
    { id: 'company', title: 'Company & Industry', content: <CompanyInfoSection disabled={readOnly} /> },
    { id: 'historical', title: 'Historical Financials', content: <HistoricalFinancialsSection disabled={readOnly} /> },
    { id: 'revenue', title: 'Revenue Forecast', content: <RevenueForecastSection disabled={readOnly} /> },
    { id: 'cost', title: 'Cost Structure', content: <CostStructureSection disabled={readOnly} /> },
    { id: 'working-capital', title: 'Working Capital & Capex', content: <WorkingCapitalSection disabled={readOnly} /> },
    { id: 'wacc', title: 'WACC Inputs', content: <WACCSection disabled={readOnly} /> },
    { id: 'terminal', title: 'Terminal Value', content: <TerminalValueSection disabled={readOnly} /> },
    { id: 'equity-bridge', title: 'Equity Bridge', content: <EquityBridgeSection disabled={readOnly} /> },
  ];

  return (
    <div className="dcf-input-panel">
      {!readOnly && (
        <div className="data-mode-toggle">
          <button
            className={`data-mode-btn ${dataMode === 'manual' ? 'active' : ''}`}
            onClick={() => setDataMode('manual')}
          >
            Manual
          </button>
          <button
            className={`data-mode-btn ${dataMode === 'paste-parse' ? 'active' : ''}`}
            onClick={() => setDataMode('paste-parse')}
          >
            Paste & Parse
          </button>
          <button
            className={`data-mode-btn ${dataMode === 'ai-auto' ? 'active' : ''}`}
            onClick={() => setDataMode('ai-auto')}
          >
            AI Auto-populate
          </button>
        </div>
      )}
      <Accordion sections={sections} defaultOpen={['company']} />
    </div>
  );
}

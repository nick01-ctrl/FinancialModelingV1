import { useState } from 'react';
import { useModelStore } from '../../../stores/modelStore';
import { useAIParse, useAIAutoPopulate } from '../../../api/ai';
import type { DCFInputs } from '../../../engine/types';
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

const PARSE_TARGET_FIELDS = [
  'historicalRevenue', 'historicalEBITDA', 'historicalDA', 'historicalCapex', 'historicalNWC',
  'revenueGrowthRates', 'ebitdaMargins', 'daPercentRevenue', 'capexPercentRevenue',
  'nwcPercentRevenueChange', 'taxRate', 'riskFreeRate', 'equityRiskPremium', 'beta',
  'preTaxCostOfDebt', 'debtToEquity', 'terminalGrowthRate', 'exitMultiple', 'netDebt', 'dilutedShares',
];

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Consumer Staples', 'Industrials', 'Energy', 'Materials',
  'Real Estate', 'Utilities', 'Communication Services',
];

function PasteParseMode() {
  const [rawText, setRawText] = useState('');
  const setDCFInputs = useModelStore((s) => s.setDCFInputs);
  const markAIField = useModelStore((s) => s.markAIField);
  const parseMutation = useAIParse();

  const handleParse = () => {
    if (!rawText.trim()) return;
    parseMutation.mutate(
      { rawText, targetFields: PARSE_TARGET_FIELDS },
      {
        onSuccess: (result) => {
          const updates: Partial<DCFInputs> = {};
          for (const [field, info] of Object.entries(result.fields)) {
            if (info.value === undefined) continue;
            (updates as Record<string, unknown>)[field] = info.value;
            markAIField(field);
          }
          setDCFInputs(updates);
        },
      }
    );
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
        Paste financial data (e.g. from an earnings report, 10-K, or spreadsheet) and AI will extract the relevant fields.
      </p>
      <textarea
        className="text-input"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={"Revenue: $150M, $180M, $210M\nEBITDA margin: 25%\nBeta: 1.2\nNet debt: $50M\n..."}
        rows={8}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
      />
      <button
        className="btn btn-primary"
        style={{ marginTop: '0.5rem', width: '100%' }}
        onClick={handleParse}
        disabled={parseMutation.isPending || !rawText.trim()}
      >
        {parseMutation.isPending ? 'Parsing...' : 'Parse & Fill Fields'}
      </button>
      {parseMutation.isError && (
        <div className="model-error" style={{ marginTop: '0.5rem' }}>
          Failed to parse data. Please try again.
        </div>
      )}
      {parseMutation.isSuccess && parseMutation.data.unmappedText.length > 0 && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          <strong>Unmapped lines:</strong>
          {parseMutation.data.unmappedText.map((line, i) => (
            <div key={i} style={{ marginLeft: '0.5rem' }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIAutoPopulateMode() {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setDCFInputs = useModelStore((s) => s.setDCFInputs);
  const setDCFInput = useModelStore((s) => s.setDCFInput);
  const markAIField = useModelStore((s) => s.markAIField);
  const autoPopulate = useAIAutoPopulate();

  const [companyName, setCompanyName] = useState(inputs.companyName || '');
  const [description, setDescription] = useState(inputs.companyDescription || '');
  const [sector, setSector] = useState(inputs.sector || '');

  const handleAutoPopulate = () => {
    if (!companyName.trim()) return;
    autoPopulate.mutate(
      { companyName, description, sector },
      {
        onSuccess: (result) => {
          setDCFInput('companyName', companyName);
          setDCFInput('companyDescription', description);
          if (sector) setDCFInput('sector', sector);

          const updates: Partial<DCFInputs> = {};
          for (const [field, value] of Object.entries(result.inputs)) {
            (updates as Record<string, unknown>)[field] = value;
          }
          setDCFInputs(updates);

          for (const field of result.aiFields) {
            markAIField(field);
          }
        },
      }
    );
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
        Enter a company name and AI will estimate all DCF assumptions based on public data and sector benchmarks.
      </p>
      <div className="text-input-group">
        <label className="input-label">Company Name</label>
        <input
          className="text-input"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g., Snowflake Inc."
        />
      </div>
      <div className="text-input-group">
        <label className="input-label">Description (optional)</label>
        <textarea
          className="text-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Cloud data platform, ~$2.8B ARR"
          rows={2}
        />
      </div>
      <div className="text-input-group">
        <label className="input-label">Sector (optional)</label>
        <select
          className="select-input"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          <option value="">Select sector...</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <button
        className="btn btn-primary"
        style={{ marginTop: '0.25rem', width: '100%' }}
        onClick={handleAutoPopulate}
        disabled={autoPopulate.isPending || !companyName.trim()}
      >
        {autoPopulate.isPending ? 'AI is populating...' : 'Auto-populate All Fields'}
      </button>
      {autoPopulate.isError && (
        <div className="model-error" style={{ marginTop: '0.5rem' }}>
          Auto-populate failed. Please check your API key and try again.
        </div>
      )}
      {autoPopulate.isSuccess && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#166534' }}>
          Populated {autoPopulate.data.aiFields.length} fields. Review the values below and adjust as needed.
        </div>
      )}
    </div>
  );
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

      {dataMode === 'paste-parse' && !readOnly && <PasteParseMode />}
      {dataMode === 'ai-auto' && !readOnly && <AIAutoPopulateMode />}

      <Accordion sections={sections} defaultOpen={['company']} />
    </div>
  );
}

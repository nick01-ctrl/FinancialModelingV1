import { useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import {
  Building2,
  BarChart3,
  TrendingUp,
  PieChart,
  Percent,
  Landmark,
  ArrowRightLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import Accordion from '../../common/Accordion';
import NumberInput from '../../common/NumberInput';
import SelectInput from '../../common/SelectInput';
import { useModelStore } from '../../../stores/modelStore';
import { calculateDCF } from '../../../utils/engines/dcf';
import type { DCFInputs, TerminalValueMethod } from '../../../../../shared/types/dcf';
import { createDefaultDCFInputs } from '../../../../../shared/types/dcf';
import type {
  IndustrySector,
  ProjectionPeriod,
  HistoricalYear,
  FieldValue,
} from '../../../../../shared/types/common';
import { SECTOR_LABELS } from '../../../../../shared/types/common';

// Sector options for SelectInput
const SECTOR_OPTIONS = Object.entries(SECTOR_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const PROJECTION_PERIOD_OPTIONS = [
  { value: '5', label: '5 Years' },
  { value: '7', label: '7 Years' },
  { value: '10', label: '10 Years' },
];

const TERMINAL_VALUE_OPTIONS = [
  { value: 'gordon_growth', label: 'Gordon Growth Model' },
  { value: 'exit_multiple', label: 'Exit Multiple' },
];

function createEmptyHistoricalYear(): HistoricalYear {
  return {
    year: new Date().getFullYear() - 1,
    revenue: 0,
    ebitda: 0,
    depreciationAmortization: 0,
    capex: 0,
    netWorkingCapital: 0,
  };
}

export default function DCFInputPanel() {
  const {
    inputs,
    setInputs,
    updateInputs,
    setOutputs,
    setCalculating,
    setCalculationError,
  } = useModelStore();

  // Initialize inputs if null
  useEffect(() => {
    if (!inputs) {
      setInputs(createDefaultDCFInputs());
    }
  }, [inputs, setInputs]);

  const dcfInputs = inputs as DCFInputs | null;

  // Run DCF calculation engine on every input change
  useEffect(() => {
    if (!dcfInputs) return;

    setCalculating(true);
    setCalculationError(null);

    try {
      const outputs = calculateDCF(dcfInputs);
      setOutputs(outputs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown calculation error';
      setCalculationError(message);
      setOutputs(null);
    } finally {
      setCalculating(false);
    }
  }, [dcfInputs, setCalculating, setCalculationError, setOutputs]);

  // --- Updater helpers ---

  const handleFieldUpdate = useCallback(
    (field: keyof DCFInputs, value: unknown) => {
      updateInputs({ [field]: value } as Partial<DCFInputs>);
    },
    [updateInputs],
  );

  const handleFieldValueUpdate = useCallback(
    (field: keyof DCFInputs, value: number) => {
      updateInputs({
        [field]: { value, meta: (dcfInputs as Record<string, FieldValue>)?.[field]?.meta },
      } as unknown as Partial<DCFInputs>);
    },
    [updateInputs, dcfInputs],
  );

  const handleHistoricalUpdate = useCallback(
    (index: number, field: keyof HistoricalYear, value: number) => {
      if (!dcfInputs) return;
      const updated = [...dcfInputs.historicalFinancials];
      updated[index] = { ...updated[index], [field]: value };
      updateInputs({ historicalFinancials: updated } as Partial<DCFInputs>);
    },
    [dcfInputs, updateInputs],
  );

  const handleAddHistoricalYear = useCallback(() => {
    if (!dcfInputs) return;
    const existing = dcfInputs.historicalFinancials;
    const newYear = createEmptyHistoricalYear();
    if (existing.length > 0) {
      const lastYear = Math.max(...existing.map((h) => h.year));
      newYear.year = lastYear - 1;
    }
    updateInputs({
      historicalFinancials: [...existing, newYear],
    } as Partial<DCFInputs>);
  }, [dcfInputs, updateInputs]);

  const handleRemoveHistoricalYear = useCallback(
    (index: number) => {
      if (!dcfInputs) return;
      const updated = dcfInputs.historicalFinancials.filter((_, i) => i !== index);
      updateInputs({ historicalFinancials: updated } as Partial<DCFInputs>);
    },
    [dcfInputs, updateInputs],
  );

  const handleGrowthRateUpdate = useCallback(
    (index: number, value: number) => {
      if (!dcfInputs) return;
      const updated = [...dcfInputs.revenueGrowthRates];
      updated[index] = { ...updated[index], value };
      updateInputs({ revenueGrowthRates: updated } as Partial<DCFInputs>);
    },
    [dcfInputs, updateInputs],
  );

  const handleMarginUpdate = useCallback(
    (index: number, value: number) => {
      if (!dcfInputs) return;
      const updated = [...dcfInputs.ebitdaMargins];
      updated[index] = { ...updated[index], value };
      updateInputs({ ebitdaMargins: updated } as Partial<DCFInputs>);
    },
    [dcfInputs, updateInputs],
  );

  const handleProjectionPeriodChange = useCallback(
    (periodStr: string) => {
      if (!dcfInputs) return;
      const period = parseInt(periodStr, 10) as ProjectionPeriod;

      // Resize arrays to match new projection period
      const growthRates = Array.from({ length: period }, (_, i) =>
        dcfInputs.revenueGrowthRates[i] ?? { value: 0.05 },
      );
      const margins = Array.from({ length: period }, (_, i) =>
        dcfInputs.ebitdaMargins[i] ?? { value: 0.2 },
      );

      updateInputs({
        projectionPeriod: period,
        revenueGrowthRates: growthRates,
        ebitdaMargins: margins,
      } as Partial<DCFInputs>);
    },
    [dcfInputs, updateInputs],
  );

  // --- AI Suggest stubs ---
  const handleAISuggest = useCallback(
    (field: string) => {
      // Placeholder for AI suggestion integration
      console.log(`AI suggest requested for: ${field}`);
    },
    [],
  );

  // Don't render until inputs are initialized
  if (!dcfInputs) return null;

  const baseYear = dcfInputs.historicalFinancials.length > 0
    ? Math.max(...dcfInputs.historicalFinancials.map((h) => h.year))
    : new Date().getFullYear();

  const sections = [
    // ---- Company & Industry ----
    {
      id: 'company',
      title: 'Company & Industry',
      icon: <Building2 className="w-4 h-4 text-gray-500" />,
      content: (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={dcfInputs.companyName}
              onChange={(e) => handleFieldUpdate('companyName', e.target.value)}
              placeholder="e.g. Apple Inc."
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <input
              type="text"
              value={dcfInputs.companyDescription ?? ''}
              onChange={(e) => handleFieldUpdate('companyDescription', e.target.value)}
              placeholder="Brief description of the company"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <SelectInput
            label="Sector"
            value={dcfInputs.sector}
            onChange={(value) => handleFieldUpdate('sector', value as IndustrySector)}
            options={SECTOR_OPTIONS}
          />
        </div>
      ),
    },

    // ---- Historical Financials ----
    {
      id: 'historicals',
      title: 'Historical Financials',
      icon: <BarChart3 className="w-4 h-4 text-gray-500" />,
      badge: `${dcfInputs.historicalFinancials.length} years`,
      content: (
        <div className="space-y-3">
          {dcfInputs.historicalFinancials.length === 0 && (
            <p className="text-xs text-gray-400 italic">
              No historical data yet. Add at least 3 years for best results.
            </p>
          )}
          {dcfInputs.historicalFinancials.map((hist, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2"
            >
              <div className="flex items-center justify-between">
                <NumberInput
                  label="Year"
                  value={hist.year}
                  onChange={(v) => handleHistoricalUpdate(idx, 'year', Math.round(v))}
                  format="number"
                  compact
                />
                <button
                  onClick={() => handleRemoveHistoricalYear(idx)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove year"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Revenue"
                  value={hist.revenue}
                  onChange={(v) => handleHistoricalUpdate(idx, 'revenue', v)}
                  format="currency"
                  suffix="M"
                />
                <NumberInput
                  label="EBITDA"
                  value={hist.ebitda}
                  onChange={(v) => handleHistoricalUpdate(idx, 'ebitda', v)}
                  format="currency"
                  suffix="M"
                />
                <NumberInput
                  label="D&A"
                  value={hist.depreciationAmortization}
                  onChange={(v) => handleHistoricalUpdate(idx, 'depreciationAmortization', v)}
                  format="currency"
                  suffix="M"
                />
                <NumberInput
                  label="Capex"
                  value={hist.capex}
                  onChange={(v) => handleHistoricalUpdate(idx, 'capex', v)}
                  format="currency"
                  suffix="M"
                />
                <NumberInput
                  label="NWC"
                  value={hist.netWorkingCapital}
                  onChange={(v) => handleHistoricalUpdate(idx, 'netWorkingCapital', v)}
                  format="currency"
                  suffix="M"
                />
              </div>
            </div>
          ))}
          <button
            onClick={handleAddHistoricalYear}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-brand-600 hover:text-brand-700 border border-dashed border-brand-300 hover:border-brand-400 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Year
          </button>
        </div>
      ),
    },

    // ---- Revenue Forecast ----
    {
      id: 'revenue',
      title: 'Revenue Forecast',
      icon: <TrendingUp className="w-4 h-4 text-gray-500" />,
      badge: `${dcfInputs.projectionPeriod}yr`,
      content: (
        <div className="space-y-3">
          <SelectInput
            label="Projection Period"
            value={String(dcfInputs.projectionPeriod)}
            onChange={handleProjectionPeriodChange}
            options={PROJECTION_PERIOD_OPTIONS}
          />
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              Revenue Growth Rates by Year
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: dcfInputs.projectionPeriod }, (_, i) => (
                <NumberInput
                  key={i}
                  label={`Yr ${i + 1} (${baseYear + i + 1})`}
                  value={dcfInputs.revenueGrowthRates[i]?.value ?? 0}
                  onChange={(v) => handleGrowthRateUpdate(i, v)}
                  format="percent"
                  compact
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // ---- Cost Structure ----
    {
      id: 'costs',
      title: 'Cost Structure',
      icon: <PieChart className="w-4 h-4 text-gray-500" />,
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              EBITDA Margins by Year
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: dcfInputs.projectionPeriod }, (_, i) => (
                <NumberInput
                  key={i}
                  label={`Yr ${i + 1} (${baseYear + i + 1})`}
                  value={dcfInputs.ebitdaMargins[i]?.value ?? 0}
                  onChange={(v) => handleMarginUpdate(i, v)}
                  format="percent"
                  compact
                />
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <NumberInput
              label="D&A as % of Revenue"
              value={dcfInputs.daAsPercentOfRevenue.value}
              onChange={(v) => handleFieldValueUpdate('daAsPercentOfRevenue', v)}
              format="percent"
            />
            <NumberInput
              label="Capex as % of Revenue"
              value={dcfInputs.capexAsPercentOfRevenue.value}
              onChange={(v) => handleFieldValueUpdate('capexAsPercentOfRevenue', v)}
              format="percent"
            />
            <NumberInput
              label="NWC as % of Revenue Change"
              value={dcfInputs.nwcAsPercentOfRevenueChange.value}
              onChange={(v) => handleFieldValueUpdate('nwcAsPercentOfRevenueChange', v)}
              format="percent"
            />
            <NumberInput
              label="Tax Rate"
              value={dcfInputs.taxRate.value}
              onChange={(v) => handleFieldValueUpdate('taxRate', v)}
              format="percent"
            />
          </div>
        </div>
      ),
    },

    // ---- WACC Inputs ----
    {
      id: 'wacc',
      title: 'WACC Inputs',
      icon: <Percent className="w-4 h-4 text-gray-500" />,
      content: (
        <div className="space-y-2">
          <NumberInput
            label="Risk-Free Rate"
            value={dcfInputs.riskFreeRate.value}
            onChange={(v) => handleFieldValueUpdate('riskFreeRate', v)}
            format="percent"
            onAISuggest={() => handleAISuggest('riskFreeRate')}
          />
          <NumberInput
            label="Equity Risk Premium"
            value={dcfInputs.equityRiskPremium.value}
            onChange={(v) => handleFieldValueUpdate('equityRiskPremium', v)}
            format="percent"
            onAISuggest={() => handleAISuggest('equityRiskPremium')}
          />
          <NumberInput
            label="Beta"
            value={dcfInputs.beta.value}
            onChange={(v) => handleFieldValueUpdate('beta', v)}
            format="number"
            step={0.05}
            onAISuggest={() => handleAISuggest('beta')}
          />
          <NumberInput
            label="Pre-tax Cost of Debt"
            value={dcfInputs.preTaxCostOfDebt.value}
            onChange={(v) => handleFieldValueUpdate('preTaxCostOfDebt', v)}
            format="percent"
            onAISuggest={() => handleAISuggest('preTaxCostOfDebt')}
          />
          <NumberInput
            label="Debt-to-Equity Ratio"
            value={dcfInputs.debtToEquityRatio.value}
            onChange={(v) => handleFieldValueUpdate('debtToEquityRatio', v)}
            format="number"
            step={0.05}
            onAISuggest={() => handleAISuggest('debtToEquityRatio')}
          />
        </div>
      ),
    },

    // ---- Terminal Value ----
    {
      id: 'terminal',
      title: 'Terminal Value',
      icon: <Landmark className="w-4 h-4 text-gray-500" />,
      content: (
        <div className="space-y-3">
          <SelectInput
            label="Method"
            value={dcfInputs.terminalValueMethod}
            onChange={(v) =>
              handleFieldUpdate('terminalValueMethod', v as TerminalValueMethod)
            }
            options={TERMINAL_VALUE_OPTIONS}
          />
          {dcfInputs.terminalValueMethod === 'gordon_growth' ? (
            <NumberInput
              label="Terminal Growth Rate"
              value={dcfInputs.terminalGrowthRate.value}
              onChange={(v) => handleFieldValueUpdate('terminalGrowthRate', v)}
              format="percent"
            />
          ) : (
            <NumberInput
              label="Exit EV/EBITDA Multiple"
              value={dcfInputs.exitMultiple.value}
              onChange={(v) => handleFieldValueUpdate('exitMultiple', v)}
              format="multiple"
            />
          )}
        </div>
      ),
    },

    // ---- Bridge to Equity ----
    {
      id: 'bridge',
      title: 'Bridge to Equity',
      icon: <ArrowRightLeft className="w-4 h-4 text-gray-500" />,
      content: (
        <div className="space-y-2">
          <NumberInput
            label="Net Debt (Debt - Cash)"
            value={dcfInputs.netDebt.value}
            onChange={(v) => handleFieldValueUpdate('netDebt', v)}
            format="currency"
            suffix="M"
          />
          <NumberInput
            label="Diluted Shares Outstanding"
            value={dcfInputs.dilutedSharesOutstanding.value}
            onChange={(v) => handleFieldValueUpdate('dilutedSharesOutstanding', v)}
            format="number"
            suffix="M"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <Accordion
        sections={sections}
        defaultOpen={['company', 'historicals', 'revenue', 'wacc']}
        allowMultiple
      />
    </div>
  );
}

import { useModelStore } from '../../../stores/modelStore';
import type { DCFOutputs } from '../../../../../shared/types/dcf';

export default function DCFOutputPanel() {
  const outputs = useModelStore((s) => s.outputs) as DCFOutputs | null;
  const isCalculating = useModelStore((s) => s.isCalculating);
  const calculationError = useModelStore((s) => s.calculationError);

  if (calculationError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {calculationError}
        </div>
      </div>
    );
  }

  if (!outputs) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Enter inputs to see live outputs
      </div>
    );
  }

  const fmt = (v: number, decimals = 1) =>
    v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const fmtCurrency = (v: number) =>
    '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {isCalculating && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md inline-block">
          Recalculating...
        </div>
      )}

      {/* Key Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Valuation Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="WACC" value={`${fmt(outputs.wacc * 100)}%`} />
          <MetricCard label="Terminal Value" value={fmtCurrency(outputs.terminalValue)} />
          <MetricCard label="Enterprise Value" value={fmtCurrency(outputs.enterpriseValue)} />
          <MetricCard label="Equity Value" value={fmtCurrency(outputs.equityValue)} />
          <MetricCard
            label="Implied Share Price"
            value={`$${fmt(outputs.impliedSharePrice, 2)}`}
            highlight
          />
          <MetricCard label="PV of FCFs" value={fmtCurrency(outputs.pvOfFCFs)} />
        </div>
      </div>

      {/* EV Bridge */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Enterprise Value Bridge</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <BridgeRow label="PV of Free Cash Flows" value={outputs.pvOfFCFs} />
          <BridgeRow label="PV of Terminal Value" value={outputs.pvOfTerminalValue} />
          <div className="border-t border-gray-200 pt-2">
            <BridgeRow label="Enterprise Value" value={outputs.enterpriseValue} bold />
          </div>
          <BridgeRow label="Less: Net Debt" value={-outputs.evBridge.netDebt} />
          <div className="border-t border-gray-200 pt-2">
            <BridgeRow label="Equity Value" value={outputs.equityValue} bold />
          </div>
        </div>
      </div>

      {/* Projection Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">UFCF Projections</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Year</th>
                {outputs.projections.map((p) => (
                  <th key={p.year} className="text-right py-2 px-2 font-medium text-gray-500">
                    {p.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono">
              <ProjectionRow label="Revenue" projections={outputs.projections} field="revenue" />
              <ProjectionRow label="EBITDA" projections={outputs.projections} field="ebitda" />
              <ProjectionRow label="NOPAT" projections={outputs.projections} field="nopat" />
              <ProjectionRow label="UFCF" projections={outputs.projections} field="ufcf" bold />
              <ProjectionRow label="PV of UFCF" projections={outputs.projections} field="pvOfUFCF" />
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal Value Methods */}
      {outputs.gordonGrowthTV !== undefined && outputs.exitMultipleTV !== undefined && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Terminal Value Comparison</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">Gordon Growth Model</p>
              <p className="text-lg font-bold text-blue-900">{fmtCurrency(outputs.gordonGrowthTV)}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-600 font-medium mb-1">Exit Multiple</p>
              <p className="text-lg font-bold text-indigo-900">{fmtCurrency(outputs.exitMultipleTV)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-brand-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function BridgeRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={value < 0 ? 'text-red-600' : 'text-gray-900'}>
        {value < 0 ? '(' : ''}${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        {value < 0 ? ')' : ''}
      </span>
    </div>
  );
}

function ProjectionRow({
  label,
  projections,
  field,
  bold,
}: {
  label: string;
  projections: any[];
  field: string;
  bold?: boolean;
}) {
  return (
    <tr className={`border-b border-gray-100 ${bold ? 'font-semibold' : ''}`}>
      <td className="py-1.5 pr-4 text-gray-600">{label}</td>
      {projections.map((p: any) => (
        <td key={p.year} className="text-right py-1.5 px-2 text-gray-900">
          {(p[field] / 1).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </td>
      ))}
    </tr>
  );
}

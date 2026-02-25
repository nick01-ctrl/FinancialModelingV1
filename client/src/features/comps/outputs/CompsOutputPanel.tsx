import { useMemo } from 'react';
import { useModelStore } from '../../../stores/modelStore';
import { calculateComps } from '../../../engine/comps';
import type { CompsOutputs, MultipleStats, ImpliedValuation } from '../../../engine/types';

function fmt(v: number | null): string {
  if (v === null) return '—';
  return v.toFixed(1) + 'x';
}

function fmtPrice(v: number | null): string {
  if (v === null) return '—';
  return '$' + v.toFixed(2);
}

function MultiplesTable({ outputs }: { outputs: CompsOutputs }) {
  if (outputs.peerMultiples.length === 0) return null;

  return (
    <div className="output-section">
      <h3 className="output-section-title">Peer Multiples</h3>
      <div className="output-table-wrapper">
        <table className="output-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>EV / Revenue</th>
              <th>EV / EBITDA</th>
              <th>P / E</th>
            </tr>
          </thead>
          <tbody>
            {outputs.peerMultiples.map((p) => (
              <tr key={p.id}>
                <td style={{ textAlign: 'left', fontWeight: 500 }}>{p.name || '(unnamed)'}</td>
                <td>{fmt(p.evRevenue)}</td>
                <td>{fmt(p.evEbitda)}</td>
                <td>{fmt(p.pe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatsRow({ stats }: { stats: MultipleStats }) {
  return (
    <div className="output-section">
      <h3 className="output-section-title">{stats.label} — Statistics</h3>
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">25th Pctile</div>
          <div className="stat-value">{stats.p25.toFixed(1)}x</div>
        </div>
        <div className="stat-box stat-box-highlight">
          <div className="stat-label">Median</div>
          <div className="stat-value">{stats.median.toFixed(1)}x</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">75th Pctile</div>
          <div className="stat-value">{stats.p75.toFixed(1)}x</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Mean</div>
          <div className="stat-value">{stats.mean.toFixed(1)}x</div>
        </div>
      </div>
    </div>
  );
}

function ValuationRangeBars({ valuations }: { valuations: ImpliedValuation[] }) {
  if (valuations.length === 0) return null;

  // Find global min/max for common scale
  const allPrices = valuations.flatMap((v) =>
    [v.p25SharePrice, v.medianSharePrice, v.p75SharePrice].filter((p): p is number => p !== null)
  );
  if (allPrices.length === 0) return null;

  const globalMin = Math.min(...allPrices);
  const globalMax = Math.max(...allPrices);
  const padding = (globalMax - globalMin) * 0.15 || 5;
  const scaleMin = Math.max(0, globalMin - padding);
  const scaleMax = globalMax + padding;
  const range = scaleMax - scaleMin;

  const COLORS: Record<string, string> = {
    'EV / Revenue': '#3b82f6',
    'EV / EBITDA': '#8b5cf6',
    'P / E': '#f59e0b',
  };

  return (
    <div className="output-section">
      <h3 className="output-section-title">Implied Valuation Range</h3>
      <div className="range-chart">
        {valuations.map((v) => {
          const low = v.p25SharePrice ?? 0;
          const mid = v.medianSharePrice ?? 0;
          const high = v.p75SharePrice ?? 0;
          const leftPct = ((low - scaleMin) / range) * 100;
          const widthPct = ((high - low) / range) * 100;
          const midPct = ((mid - scaleMin) / range) * 100;
          const color = COLORS[v.metric] || '#64748b';

          return (
            <div key={v.metric} className="range-row">
              <div className="range-label">{v.metric}</div>
              <div className="range-bar-track">
                <div
                  className="range-bar-fill"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }}
                />
                <div
                  className="range-bar-median"
                  style={{ left: `${midPct}%` }}
                  title={`Median: ${fmtPrice(mid)}`}
                />
                <span className="range-bar-label-low" style={{ left: `${leftPct}%` }}>
                  {fmtPrice(low)}
                </span>
                <span className="range-bar-label-high" style={{ left: `${leftPct + widthPct}%` }}>
                  {fmtPrice(high)}
                </span>
              </div>
            </div>
          );
        })}
        <div className="range-axis">
          <span>{fmtPrice(scaleMin)}</span>
          <span>{fmtPrice((scaleMin + scaleMax) / 2)}</span>
          <span>{fmtPrice(scaleMax)}</span>
        </div>
      </div>
    </div>
  );
}

function ImpliedValuationTable({ valuations }: { valuations: ImpliedValuation[] }) {
  if (valuations.length === 0) return null;

  return (
    <div className="output-section">
      <h3 className="output-section-title">Implied Share Price</h3>
      <div className="output-table-wrapper">
        <table className="output-table">
          <thead>
            <tr>
              <th>Multiple</th>
              <th>25th Pctile</th>
              <th>Median</th>
              <th>75th Pctile</th>
            </tr>
          </thead>
          <tbody>
            {valuations.map((v) => (
              <tr key={v.metric}>
                <td style={{ textAlign: 'left', fontWeight: 500 }}>{v.metric}</td>
                <td>{fmtPrice(v.p25SharePrice)}</td>
                <td style={{ fontWeight: 600 }}>{fmtPrice(v.medianSharePrice)}</td>
                <td>{fmtPrice(v.p75SharePrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompsOutputPanel() {
  const inputs = useModelStore((s) => s.compsInputs);

  const outputs = useMemo(() => calculateComps(inputs), [inputs]);

  if (outputs.peerMultiples.length === 0) {
    return (
      <div className="dcf-output-panel">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Add peer companies to see comparable multiples and implied valuation
        </div>
      </div>
    );
  }

  return (
    <div className="dcf-output-panel">
      {outputs.error && <div className="model-error">{outputs.error}</div>}
      <MultiplesTable outputs={outputs} />
      {outputs.evRevenueStats && <StatsRow stats={outputs.evRevenueStats} />}
      {outputs.evEbitdaStats && <StatsRow stats={outputs.evEbitdaStats} />}
      {outputs.peStats && <StatsRow stats={outputs.peStats} />}
      <ValuationRangeBars valuations={outputs.impliedValuations} />
      <ImpliedValuationTable valuations={outputs.impliedValuations} />
    </div>
  );
}

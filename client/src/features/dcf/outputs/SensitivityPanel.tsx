import type { SensitivityTable } from '../../../engine/types';

interface Props {
  table: SensitivityTable;
}

const FIELD_LABELS: Record<string, string> = {
  terminalGrowthRate: 'Terminal Growth (%)',
  exitMultiple: 'Exit Multiple (x)',
  riskFreeRate: 'Risk-Free Rate (%)',
  wacc: 'WACC (%)',
  beta: 'Beta',
  equityRiskPremium: 'ERP (%)',
};

function getColor(value: number | null, base: number | null): string {
  if (value === null || base === null) return '#f1f5f9';
  const diff = value - base;
  const maxDiff = Math.abs(base) * 0.5 || 10;
  const ratio = Math.max(-1, Math.min(1, diff / maxDiff));

  if (ratio > 0) {
    // Green
    const intensity = Math.round(ratio * 80);
    return `rgba(34, 197, 94, ${intensity / 100})`;
  } else {
    // Red
    const intensity = Math.round(Math.abs(ratio) * 80);
    return `rgba(239, 68, 68, ${intensity / 100})`;
  }
}

export default function SensitivityPanel({ table }: Props) {
  const xLabel = FIELD_LABELS[table.xLabel] || table.xLabel;
  const yLabel = FIELD_LABELS[table.yLabel] || table.yLabel;

  return (
    <div className="output-section">
      <h3 className="output-section-title">
        Sensitivity Analysis: {yLabel} vs {xLabel}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="projection-table" style={{ fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th>{yLabel} \ {xLabel}</th>
              {table.xValues.map((x, i) => (
                <th
                  key={i}
                  style={{
                    fontWeight: x === table.baseX ? 700 : 400,
                    textDecoration: x === table.baseX ? 'underline' : 'none',
                  }}
                >
                  {x.toFixed(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.cells.map((row, yi) => (
              <tr key={yi}>
                <td
                  className="row-label"
                  style={{
                    fontWeight: table.yValues[yi] === table.baseY ? 700 : 500,
                    textDecoration: table.yValues[yi] === table.baseY ? 'underline' : 'none',
                  }}
                >
                  {table.yValues[yi].toFixed(1)}
                </td>
                {row.map((cell, xi) => (
                  <td
                    key={xi}
                    style={{
                      background: getColor(cell.outputValue, table.baseOutput),
                      fontWeight:
                        cell.xValue === table.baseX && cell.yValue === table.baseY
                          ? 700
                          : 400,
                      border:
                        cell.xValue === table.baseX && cell.yValue === table.baseY
                          ? '2px solid var(--color-text)'
                          : undefined,
                    }}
                  >
                    {cell.outputValue !== null ? `$${cell.outputValue.toFixed(2)}` : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

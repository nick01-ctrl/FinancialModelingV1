import type { DCFOutputs } from '../../../engine/types';

interface Props {
  outputs: DCFOutputs;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return v.toFixed(1);
}

export default function UFCFTable({ outputs }: Props) {
  if (outputs.projections.length === 0) return null;

  return (
    <div className="output-section">
      <h3 className="output-section-title">Unlevered Free Cash Flow Projection ($M)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="projection-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Metric</th>
              {outputs.projections.map((p) => (
                <th key={p.year}>{p.year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="row-label">Revenue</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>{fmt(p.revenue)}</td>
              ))}
            </tr>
            <tr>
              <td className="row-label">EBITDA</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>{fmt(p.ebitda)}</td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Less: D&A</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>({fmt(p.da)})</td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Less: Taxes</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>({fmt(p.taxExpense)})</td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Plus: D&A</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>{fmt(p.da)}</td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Less: Capex</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>({fmt(p.capex)})</td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Less: ΔNWC</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>({fmt(p.nwcChange)})</td>
              ))}
            </tr>
            <tr className="total-row">
              <td className="row-label">UFCF</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>{fmt(p.ufcf)}</td>
              ))}
            </tr>
            <tr>
              <td className="row-label" style={{ color: 'var(--color-text-muted)' }}>
                Discount Factor
              </td>
              {outputs.projections.map((p) => (
                <td key={p.year} style={{ color: 'var(--color-text-muted)' }}>
                  {p.discountFactor.toFixed(3)}
                </td>
              ))}
            </tr>
            <tr className="total-row">
              <td className="row-label">PV of UFCF</td>
              {outputs.projections.map((p) => (
                <td key={p.year}>{fmt(p.pvUFCF)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

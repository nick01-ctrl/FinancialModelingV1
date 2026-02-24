import type { DCFOutputs } from '../../../engine/types';

interface Props {
  outputs: DCFOutputs;
  method: 'gordon-growth' | 'exit-multiple';
}

function fmt(v: number | null, prefix = '$', suffix = 'M'): string {
  if (v === null) return 'N/A';
  return `${prefix}${v.toFixed(1)}${suffix}`;
}

function fmtPrice(v: number | null): string {
  if (v === null) return 'N/A';
  return `$${v.toFixed(2)}`;
}

export default function ValuationSummary({ outputs, method }: Props) {
  const primary = method === 'gordon-growth';

  return (
    <div>
      {/* Primary implied share price */}
      <div className="valuation-highlight">
        <div className="label">Implied Share Price</div>
        <div className="value">
          {fmtPrice(
            primary
              ? outputs.impliedSharePriceGordon
              : outputs.impliedSharePriceExitMultiple
          )}
        </div>
        <div className="sub">
          {primary ? 'Gordon Growth Model' : 'Exit Multiple Method'}
        </div>
      </div>

      {/* Summary table */}
      <div className="output-section">
        <h3 className="output-section-title">Valuation Bridge</h3>
        <table className="projection-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Metric</th>
              <th>Gordon Growth</th>
              <th>Exit Multiple</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="row-label">WACC</td>
              <td colSpan={2} style={{ textAlign: 'center' }}>
                {outputs.wacc.toFixed(2)}%
              </td>
            </tr>
            <tr>
              <td className="row-label">Cost of Equity</td>
              <td colSpan={2} style={{ textAlign: 'center' }}>
                {outputs.costOfEquity.toFixed(2)}%
              </td>
            </tr>
            <tr>
              <td className="row-label">Sum of PV of FCFs</td>
              <td colSpan={2} style={{ textAlign: 'center' }}>
                {fmt(outputs.sumPVofFCFs)}
              </td>
            </tr>
            <tr>
              <td className="row-label">Terminal Value</td>
              <td>{fmt(outputs.terminalValueGordon)}</td>
              <td>{fmt(outputs.terminalValueExitMultiple)}</td>
            </tr>
            <tr>
              <td className="row-label">PV of Terminal Value</td>
              <td>{fmt(outputs.pvTerminalValueGordon)}</td>
              <td>{fmt(outputs.pvTerminalValueExitMultiple)}</td>
            </tr>
            <tr className="total-row">
              <td className="row-label">Enterprise Value</td>
              <td>{fmt(outputs.enterpriseValueGordon)}</td>
              <td>{fmt(outputs.enterpriseValueExitMultiple)}</td>
            </tr>
            <tr>
              <td className="row-label">Less: Net Debt</td>
              <td colSpan={2} style={{ textAlign: 'center' }}>
                ({fmt(null)})
              </td>
            </tr>
            <tr className="total-row">
              <td className="row-label">Equity Value</td>
              <td>{fmt(outputs.equityValueGordon)}</td>
              <td>{fmt(outputs.equityValueExitMultiple)}</td>
            </tr>
            <tr className="total-row">
              <td className="row-label">Implied Share Price</td>
              <td>{fmtPrice(outputs.impliedSharePriceGordon)}</td>
              <td>{fmtPrice(outputs.impliedSharePriceExitMultiple)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

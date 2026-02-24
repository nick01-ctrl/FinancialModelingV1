import { useModelStore } from '../../../stores/modelStore';
import '../../../components/ui/inputs.css';

interface Props {
  disabled?: boolean;
}

const ROWS = [
  { key: 'historicalRevenue' as const, label: 'Revenue ($M)' },
  { key: 'historicalEBITDA' as const, label: 'EBITDA ($M)' },
  { key: 'historicalDA' as const, label: 'D&A ($M)' },
  { key: 'historicalCapex' as const, label: 'Capex ($M)' },
  { key: 'historicalNWC' as const, label: 'NWC ($M)' },
];

export default function HistoricalFinancialsSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 3, currentYear - 2, currentYear - 1];

  const handleCellChange = (
    key: (typeof ROWS)[number]['key'],
    index: number,
    value: string
  ) => {
    const arr = [...inputs[key]];
    arr[index] = parseFloat(value) || 0;
    setInput(key, arr);
  };

  return (
    <div className="yearly-grid">
      <table className="yearly-grid-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Metric</th>
            {years.map((y) => (
              <th key={y}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key}>
              <td style={{ fontWeight: 500, fontSize: '0.8rem' }}>{row.label}</td>
              {inputs[row.key].map((val, i) => (
                <td key={i}>
                  <input
                    type="number"
                    value={val || ''}
                    onChange={(e) => handleCellChange(row.key, i, e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useModelStore } from '../../../stores/modelStore';
import '../../../components/ui/inputs.css';

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Consumer Staples', 'Industrials', 'Energy', 'Materials',
  'Real Estate', 'Utilities', 'Communication Services',
];

interface Props {
  disabled?: boolean;
}

export default function CompanyInfoSection({ disabled = false }: Props) {
  const inputs = useModelStore((s) => s.dcfInputs);
  const setInput = useModelStore((s) => s.setDCFInput);

  return (
    <div>
      <div className="text-input-group">
        <label className="input-label">Company Name</label>
        <input
          className="text-input"
          type="text"
          value={inputs.companyName}
          onChange={(e) => setInput('companyName', e.target.value)}
          placeholder="e.g., Acme Corp"
          disabled={disabled}
        />
      </div>
      <div className="text-input-group">
        <label className="input-label">Description</label>
        <textarea
          className="text-input"
          value={inputs.companyDescription}
          onChange={(e) => setInput('companyDescription', e.target.value)}
          placeholder="e.g., Mid-market B2B SaaS company, ~$200M revenue"
          rows={2}
          disabled={disabled}
        />
      </div>
      <div className="select-group">
        <label className="input-label">Sector / Industry</label>
        <select
          className="select-input"
          value={inputs.sector}
          onChange={(e) => setInput('sector', e.target.value)}
          disabled={disabled}
        >
          <option value="">Select sector...</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

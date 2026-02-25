import { useState } from 'react';
import { useModelStore } from '../../../stores/modelStore';
import type { PeerCompany } from '../../../engine/types';
import NumberInput from '../../../components/ui/NumberInput';
import Accordion from '../../../components/ui/Accordion';

let nextPeerId = 1;

function SubjectCompanySection({ disabled }: { disabled?: boolean }) {
  const inputs = useModelStore((s) => s.compsInputs);
  const setInput = useModelStore((s) => s.setCompsInput);

  return (
    <div className="input-section-content">
      <div className="text-input-group">
        <label className="input-label">Company Name</label>
        <input
          className="text-input"
          type="text"
          value={inputs.companyName}
          onChange={(e) => setInput('companyName', e.target.value)}
          placeholder="e.g., Datadog Inc."
          disabled={disabled}
        />
      </div>
      <div className="text-input-group">
        <label className="input-label">Sector</label>
        <input
          className="text-input"
          type="text"
          value={inputs.sector}
          onChange={(e) => setInput('sector', e.target.value)}
          placeholder="e.g., Cloud Software"
          disabled={disabled}
        />
      </div>
      <NumberInput
        label="Revenue ($M)"
        value={inputs.subjectRevenue}
        onChange={(v) => setInput('subjectRevenue', v)}
        disabled={disabled}
      />
      <NumberInput
        label="EBITDA ($M)"
        value={inputs.subjectEBITDA}
        onChange={(v) => setInput('subjectEBITDA', v)}
        disabled={disabled}
      />
      <NumberInput
        label="Net Income ($M)"
        value={inputs.subjectNetIncome}
        onChange={(v) => setInput('subjectNetIncome', v)}
        disabled={disabled}
      />
      <NumberInput
        label="Net Debt ($M)"
        value={inputs.subjectNetDebt}
        onChange={(v) => setInput('subjectNetDebt', v)}
        disabled={disabled}
      />
      <NumberInput
        label="Diluted Shares (M)"
        value={inputs.subjectDilutedShares}
        onChange={(v) => setInput('subjectDilutedShares', v)}
        min={0.01}
        disabled={disabled}
      />
    </div>
  );
}

function PeerRow({
  peer,
  onUpdate,
  onRemove,
  disabled,
}: {
  peer: PeerCompany;
  onUpdate: (updated: PeerCompany) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="peer-row">
      <div className="peer-row-header">
        <input
          className="text-input peer-name-input"
          value={peer.name}
          onChange={(e) => onUpdate({ ...peer, name: e.target.value })}
          placeholder="Company name"
          disabled={disabled}
        />
        {!disabled && (
          <button className="model-delete-btn" onClick={onRemove} title="Remove peer">
            &times;
          </button>
        )}
      </div>
      <div className="peer-row-fields">
        <NumberInput
          label="EV ($M)"
          value={peer.enterpriseValue}
          onChange={(v) => onUpdate({ ...peer, enterpriseValue: v })}
          disabled={disabled}
          compact
        />
        <NumberInput
          label="Revenue ($M)"
          value={peer.revenue}
          onChange={(v) => onUpdate({ ...peer, revenue: v })}
          disabled={disabled}
          compact
        />
        <NumberInput
          label="EBITDA ($M)"
          value={peer.ebitda}
          onChange={(v) => onUpdate({ ...peer, ebitda: v })}
          disabled={disabled}
          compact
        />
        <NumberInput
          label="Net Income ($M)"
          value={peer.netIncome}
          onChange={(v) => onUpdate({ ...peer, netIncome: v })}
          disabled={disabled}
          compact
        />
        <NumberInput
          label="Mkt Cap ($M)"
          value={peer.marketCap}
          onChange={(v) => onUpdate({ ...peer, marketCap: v })}
          disabled={disabled}
          compact
        />
      </div>
    </div>
  );
}

function PeerSection({ disabled }: { disabled?: boolean }) {
  const peers = useModelStore((s) => s.compsInputs.peers);
  const setInput = useModelStore((s) => s.setCompsInput);

  const addPeer = () => {
    const newPeer: PeerCompany = {
      id: `peer-${nextPeerId++}`,
      name: '',
      enterpriseValue: 0,
      revenue: 0,
      ebitda: 0,
      netIncome: 0,
      marketCap: 0,
    };
    setInput('peers', [...peers, newPeer]);
  };

  const updatePeer = (index: number, updated: PeerCompany) => {
    const next = [...peers];
    next[index] = updated;
    setInput('peers', next);
  };

  const removePeer = (index: number) => {
    setInput(
      'peers',
      peers.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="input-section-content">
      {peers.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          Add peer companies to calculate comparable multiples.
        </p>
      )}
      {peers.map((peer, i) => (
        <PeerRow
          key={peer.id}
          peer={peer}
          onUpdate={(p) => updatePeer(i, p)}
          onRemove={() => removePeer(i)}
          disabled={disabled}
        />
      ))}
      {!disabled && (
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={addPeer}>
          + Add Peer Company
        </button>
      )}
    </div>
  );
}

function MultiplesConfigSection({ disabled }: { disabled?: boolean }) {
  const inputs = useModelStore((s) => s.compsInputs);
  const setInput = useModelStore((s) => s.setCompsInput);

  return (
    <div className="input-section-content">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={inputs.useEVRevenue}
          onChange={(e) => setInput('useEVRevenue', e.target.checked)}
          disabled={disabled}
        />
        <span>EV / Revenue</span>
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={inputs.useEVEBITDA}
          onChange={(e) => setInput('useEVEBITDA', e.target.checked)}
          disabled={disabled}
        />
        <span>EV / EBITDA</span>
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={inputs.usePE}
          onChange={(e) => setInput('usePE', e.target.checked)}
          disabled={disabled}
        />
        <span>P / E</span>
      </label>
    </div>
  );
}

interface CompsInputPanelProps {
  readOnly?: boolean;
}

export default function CompsInputPanel({ readOnly = false }: CompsInputPanelProps) {
  const sections = [
    { id: 'subject', title: 'Subject Company', content: <SubjectCompanySection disabled={readOnly} /> },
    { id: 'peers', title: 'Peer Companies', content: <PeerSection disabled={readOnly} /> },
    { id: 'multiples', title: 'Multiple Selection', content: <MultiplesConfigSection disabled={readOnly} /> },
  ];

  return (
    <div className="dcf-input-panel">
      <Accordion sections={sections} defaultOpen={['subject', 'peers']} />
    </div>
  );
}

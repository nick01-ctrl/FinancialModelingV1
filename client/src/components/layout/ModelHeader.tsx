import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../../stores/modelStore';
import { useUpdateModel, useShareModel } from '../../api/models';
import { showToast } from '../ui/Toast';
import './model-header.css';

export default function ModelHeader() {
  const navigate = useNavigate();
  const meta = useModelStore((s) => s.meta);
  const dcfInputs = useModelStore((s) => s.dcfInputs);
  const aiFields = useModelStore((s) => s.aiFields);
  const isDirty = useModelStore((s) => s.isDirty);
  const lastSaved = useModelStore((s) => s.lastSaved);
  const setMeta = useModelStore((s) => s.setMeta);
  const setDirty = useModelStore((s) => s.setDirty);
  const setLastSaved = useModelStore((s) => s.setLastSaved);
  const updateModel = useUpdateModel();
  const shareModel = useShareModel();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(meta?.name || '');

  useEffect(() => {
    setNameValue(meta?.name || '');
  }, [meta?.name]);

  // Auto-save
  useEffect(() => {
    if (!isDirty || !meta?.id) return;
    const timer = setTimeout(() => {
      updateModel.mutate(
        {
          id: meta.id,
          data: {
            name: meta.name,
            companyName: dcfInputs.companyName,
            data: { dcfInputs, aiFields: Array.from(aiFields) },
          },
        },
        {
          onSuccess: () => {
            setLastSaved(new Date().toISOString());
          },
        }
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [isDirty, dcfInputs, meta?.id]);

  const handleNameSave = () => {
    setEditingName(false);
    if (meta && nameValue !== meta.name) {
      setMeta({ ...meta, name: nameValue });
      setDirty(true);
    }
  };

  const handleShare = () => {
    if (!meta?.id) return;
    shareModel.mutate(meta.id, {
      onSuccess: (data) => {
        const url = `${window.location.origin}/share/${data.token}`;
        navigator.clipboard.writeText(url);
        showToast('Share link copied to clipboard!');
      },
    });
  };

  return (
    <header className="model-header">
      <div className="model-header-left">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
          &larr; Dashboard
        </button>
        {editingName ? (
          <input
            className="model-name-input"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            autoFocus
          />
        ) : (
          <h2
            className="model-name"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {meta?.name || 'Untitled Model'}
          </h2>
        )}
        <span className="model-type-badge">DCF</span>
      </div>
      <div className="model-header-right">
        <span className="save-status">
          {isDirty ? 'Unsaved changes' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : ''}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={handleShare}>
          Share
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (!meta?.id) return;
            window.open(`/api/export/pdf?modelId=${meta.id}`, '_blank');
          }}
        >
          Export PDF
        </button>
      </div>
    </header>
  );
}

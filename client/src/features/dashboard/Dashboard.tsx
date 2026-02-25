import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModels, useCreateModel, useDeleteModel } from '../../api/models';
import { useAuthStore } from '../../stores/authStore';
import './dashboard.css';

const MODEL_TYPES = [
  { value: 'dcf', label: 'DCF', description: 'Discounted Cash Flow' },
  { value: 'comps', label: 'Comps', description: 'Comparable Companies' },
] as const;

export default function Dashboard() {
  const { data: models, isLoading } = useModels();
  const createModel = useCreateModel();
  const deleteModel = useDeleteModel();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);

  const filtered = models?.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (modelType: string) => {
    const names: Record<string, string> = {
      dcf: 'Untitled DCF Model',
      comps: 'Untitled Comps Model',
    };
    createModel.mutate(
      { name: names[modelType] || 'Untitled Model', modelType },
      { onSuccess: (model) => navigate(`/model/${model.id}`) }
    );
    setShowNewMenu(false);
  };

  const summaryLabel = (modelType: string): string => {
    switch (modelType) {
      case 'dcf': return 'DCF';
      case 'comps': return 'Comps';
      default: return modelType.toUpperCase();
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>FinModel AI</h1>
        </div>
        <div className="dashboard-header-right">
          <span className="user-name">{user?.name}</span>
          <button className="btn btn-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="new-model-wrapper">
            <button className="btn btn-primary" onClick={() => setShowNewMenu((s) => !s)}>
              + New Model
            </button>
            {showNewMenu && (
              <div className="new-model-menu">
                {MODEL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    className="new-model-option"
                    onClick={() => handleCreate(t.value)}
                  >
                    <span className="new-model-option-label">{t.label}</span>
                    <span className="new-model-option-desc">{t.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && <div className="dashboard-loading">Loading models...</div>}

        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="dashboard-empty">
            <h2>No models yet</h2>
            <p>Create your first financial model to get started.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => handleCreate('dcf')}>
                + New DCF Model
              </button>
              <button className="btn btn-secondary" onClick={() => handleCreate('comps')}>
                + New Comps Model
              </button>
            </div>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="model-grid">
            {filtered.map((model) => (
              <div
                key={model.id}
                className="model-card"
                onClick={() => navigate(`/model/${model.id}`)}
              >
                <div className="model-card-header">
                  <span className="model-type-badge">{model.modelType.toUpperCase()}</span>
                  <button
                    className="model-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this model?')) {
                        deleteModel.mutate(model.id);
                      }
                    }}
                    title="Delete model"
                  >
                    &times;
                  </button>
                </div>
                <h3 className="model-card-name">{model.name}</h3>
                {model.companyName && (
                  <p className="model-card-company">{model.companyName}</p>
                )}
                {model.summary && (
                  <p className="model-card-summary">
                    {summaryLabel(model.modelType)}: {model.summary}
                  </p>
                )}
                <p className="model-card-date">
                  Last modified: {new Date(model.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

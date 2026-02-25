import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModels, useCreateModel, useDeleteModel } from '../../api/models';
import { useAuthStore } from '../../stores/authStore';
import './dashboard.css';

export default function Dashboard() {
  const { data: models, isLoading } = useModels();
  const createModel = useCreateModel();
  const deleteModel = useDeleteModel();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = models?.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createModel.mutate(
      { name: 'Untitled DCF Model', modelType: 'dcf' },
      { onSuccess: (model) => navigate(`/model/${model.id}`) }
    );
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
          <button className="btn btn-primary" onClick={handleCreate}>
            + New Model
          </button>
        </div>

        {isLoading && <div className="dashboard-loading">Loading models...</div>}

        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="dashboard-empty">
            <h2>No models yet</h2>
            <p>Create your first DCF model to get started.</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              + New DCF Model
            </button>
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
                    DCF: {model.summary}
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

import { useModelStore, DEFAULT_DCF_INPUTS } from '../../stores/modelStore';
import { useModelVersions, useRestoreVersion, type ModelVersion } from '../../api/models';
import { showToast } from './Toast';
import type { DCFInputs } from '../../engine/types';

interface Props {
  modelId: string;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function summarizeVersion(data: Record<string, unknown>): string {
  const inputs = data.dcfInputs as DCFInputs | undefined;
  if (!inputs) return 'Empty model';
  const parts: string[] = [];
  if (inputs.companyName) parts.push(inputs.companyName);
  const lastRev = inputs.historicalRevenue?.[inputs.historicalRevenue.length - 1];
  if (lastRev) parts.push(`Rev: $${lastRev}M`);
  if (inputs.beta !== 1.0) parts.push(`Beta: ${inputs.beta}`);
  return parts.length > 0 ? parts.join(' | ') : 'Model snapshot';
}

export default function VersionHistoryModal({ modelId, onClose }: Props) {
  const { data: versions, isLoading } = useModelVersions(modelId);
  const restoreVersion = useRestoreVersion();
  const loadModel = useModelStore((s) => s.loadModel);
  const meta = useModelStore((s) => s.meta);

  const handleRestore = (version: ModelVersion) => {
    restoreVersion.mutate(
      { modelId, versionId: version.id },
      {
        onSuccess: (restoredModel) => {
          const savedInputs = restoredModel.data?.dcfInputs as typeof DEFAULT_DCF_INPUTS | undefined;
          const savedAIFields = (restoredModel.data?.aiFields as string[]) || [];
          if (meta) {
            loadModel(meta, savedInputs || { ...DEFAULT_DCF_INPUTS }, savedAIFields);
          }
          showToast('Version restored successfully');
          onClose();
        },
      }
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Version History</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
              Loading versions...
            </div>
          )}
          {versions && versions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
              No saved versions yet. Versions are created automatically when you save.
            </div>
          )}
          {versions && versions.length > 0 && (
            <div className="version-list">
              {versions.map((v, i) => (
                <div key={v.id} className="version-item">
                  <div className="version-info">
                    <div className="version-time">
                      {timeAgo(v.createdAt)}
                      {i === 0 && <span className="version-latest-badge">Latest</span>}
                    </div>
                    <div className="version-summary">{summarizeVersion(v.data)}</div>
                    <div className="version-date">
                      {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestore(v)}
                    disabled={restoreVersion.isPending || i === 0}
                  >
                    {restoreVersion.isPending ? '...' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

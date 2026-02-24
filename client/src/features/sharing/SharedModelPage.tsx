import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSharedModel, useDuplicateSharedModel } from '../../api/models';
import { useModelStore, DEFAULT_DCF_INPUTS } from '../../stores/modelStore';
import { useAuthStore } from '../../stores/authStore';
import SplitScreen from '../../components/layout/SplitScreen';
import DCFInputPanel from '../dcf/inputs/DCFInputPanel';
import DCFOutputPanel from '../dcf/outputs/DCFOutputPanel';

export default function SharedModelPage() {
  const { token } = useParams<{ token: string }>();
  const { data: model, isLoading, error } = useSharedModel(token!);
  const loadModel = useModelStore((s) => s.loadModel);
  const authToken = useAuthStore((s) => s.token);
  const duplicate = useDuplicateSharedModel();
  const navigate = useNavigate();

  useEffect(() => {
    if (model) {
      const savedInputs = model.data?.dcfInputs as typeof DEFAULT_DCF_INPUTS | undefined;
      const savedAIFields = (model.data?.aiFields as string[]) || [];
      loadModel(
        {
          id: model.id,
          name: model.name,
          modelType: 'dcf',
          companyName: model.companyName || '',
          description: model.description || '',
        },
        savedInputs || { ...DEFAULT_DCF_INPUTS },
        savedAIFields
      );
    }
  }, [model]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>
        Loading shared model...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-error)' }}>
        Model not found or share link is invalid.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
            {model?.name || 'Shared Model'}
          </h2>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.15rem 0.5rem',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '4px',
            fontWeight: 500,
          }}>
            Read Only
          </span>
        </div>
        {authToken && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              duplicate.mutate(token!, {
                onSuccess: (m) => navigate(`/model/${m.id}`),
              });
            }}
            disabled={duplicate.isPending}
          >
            {duplicate.isPending ? 'Duplicating...' : 'Duplicate to My Workspace'}
          </button>
        )}
      </header>
      <SplitScreen
        left={<DCFInputPanel readOnly />}
        right={<DCFOutputPanel />}
      />
    </div>
  );
}

import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modelApi } from '../../services/api';
import { useModelStore } from '../../stores/modelStore';
import SplitPane from '../layout/SplitPane';
import DCFInputPanel from './dcf/DCFInputPanel';
import DCFOutputPanel from './dcf/DCFOutputPanel';
import LBOInputPanel from './lbo/LBOInputPanel';
import LBOOutputPanel from './lbo/LBOOutputPanel';
import MAInputPanel from './ma/MAInputPanel';
import MAOutputPanel from './ma/MAOutputPanel';
import CompsInputPanel from './comps/CompsInputPanel';
import CompsOutputPanel from './comps/CompsOutputPanel';
import DataModeSelector from './DataModeSelector';
import { Loader2 } from 'lucide-react';

export default function ModelView() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const store = useModelStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isNew = modelId === 'new';

  // Load model from API if not new
  const { data, isLoading } = useQuery({
    queryKey: ['model', modelId],
    queryFn: () => modelApi.get(modelId!),
    enabled: !isNew && !!modelId,
  });

  // Initialize from loaded data
  useEffect(() => {
    if (data && !isNew) {
      store.loadModel(data.meta.id, data.meta.modelType, data.meta.name, data.inputs);
    }
  }, [data, isNew]);

  // Auto-save (debounced 2 seconds)
  useEffect(() => {
    if (!store.isDirty || !store.modelId) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await modelApi.update(store.modelId!, {
          meta: {
            name: store.modelName,
            modelType: store.modelType!,
            companyName: store.companyName,
          },
          inputs: store.inputs,
        });
        store.markSaved();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [store.isDirty, store.inputs, store.modelName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!store.modelType) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No model loaded</p>
          <button
            onClick={() => navigate('/')}
            className="text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderPanels = () => {
    switch (store.modelType) {
      case 'dcf':
        return {
          input: <DCFInputPanel />,
          output: <DCFOutputPanel />,
        };
      case 'lbo':
        return {
          input: <LBOInputPanel />,
          output: <LBOOutputPanel />,
        };
      case 'ma':
        return {
          input: <MAInputPanel />,
          output: <MAOutputPanel />,
        };
      case 'comps':
        return {
          input: <CompsInputPanel />,
          output: <CompsOutputPanel />,
        };
      default:
        return { input: null, output: null };
    }
  };

  const panels = renderPanels();

  return (
    <div>
      <DataModeSelector />
      <SplitPane inputPane={panels.input} outputPane={panels.output} />
    </div>
  );
}

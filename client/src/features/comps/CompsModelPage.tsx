import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useModel } from '../../api/models';
import { useModelStore, DEFAULT_COMPS_INPUTS } from '../../stores/modelStore';
import SplitScreen from '../../components/layout/SplitScreen';
import CompsInputPanel from './inputs/CompsInputPanel';
import CompsOutputPanel from './outputs/CompsOutputPanel';
import ModelHeader from '../../components/layout/ModelHeader';
import '../dcf/dcf.css';
import './comps.css';

export default function CompsModelPage() {
  const { id } = useParams<{ id: string }>();
  const { data: model, isLoading } = useModel(id!);
  const loadModel = useModelStore((s) => s.loadModel);

  useEffect(() => {
    if (model) {
      const savedInputs = model.data?.compsInputs as typeof DEFAULT_COMPS_INPUTS | undefined;
      const savedAIFields = (model.data?.aiFields as string[]) || [];
      loadModel(
        {
          id: model.id,
          name: model.name,
          modelType: 'comps',
          companyName: model.companyName || '',
          description: model.description || '',
        },
        savedInputs || { ...DEFAULT_COMPS_INPUTS },
        savedAIFields
      );
    }
  }, [model]);

  if (isLoading) {
    return <div className="model-loading">Loading model...</div>;
  }

  return (
    <div className="dcf-page">
      <ModelHeader />
      <SplitScreen
        left={<CompsInputPanel />}
        right={<CompsOutputPanel />}
      />
    </div>
  );
}

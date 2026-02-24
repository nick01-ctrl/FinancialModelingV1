import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useModel } from '../../api/models';
import { useModelStore, DEFAULT_DCF_INPUTS } from '../../stores/modelStore';
import SplitScreen from '../../components/layout/SplitScreen';
import DCFInputPanel from './inputs/DCFInputPanel';
import DCFOutputPanel from './outputs/DCFOutputPanel';
import ModelHeader from '../../components/layout/ModelHeader';
import './dcf.css';

export default function DCFModelPage() {
  const { id } = useParams<{ id: string }>();
  const { data: model, isLoading } = useModel(id!);
  const loadModel = useModelStore((s) => s.loadModel);
  const setMeta = useModelStore((s) => s.setMeta);

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
    return <div className="model-loading">Loading model...</div>;
  }

  return (
    <div className="dcf-page">
      <ModelHeader />
      <SplitScreen
        left={<DCFInputPanel />}
        right={<DCFOutputPanel />}
      />
    </div>
  );
}

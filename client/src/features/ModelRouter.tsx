import { lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useModel } from '../api/models';

const DCFModelPage = lazy(() => import('./dcf/DCFModelPage'));
const CompsModelPage = lazy(() => import('./comps/CompsModelPage'));

export default function ModelRouter() {
  const { id } = useParams<{ id: string }>();
  const { data: model, isLoading } = useModel(id!);

  if (isLoading || !model) {
    return <div className="model-loading">Loading model...</div>;
  }

  switch (model.modelType) {
    case 'comps':
      return <CompsModelPage />;
    default:
      return <DCFModelPage />;
  }
}

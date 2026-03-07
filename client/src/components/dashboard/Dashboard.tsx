import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelApi } from '../../services/api';
import { useModelStore } from '../../stores/modelStore';
import type { ModelType } from '../../../../shared/types/common';
import {
  Plus, Search, BarChart3, TrendingUp, GitMerge, LayoutGrid,
  Trash2, Share2, Clock, Loader2, FileText
} from 'lucide-react';
import clsx from 'clsx';
import NewModelModal from './NewModelModal';

const MODEL_TYPE_CONFIG: Record<ModelType, { label: string; icon: React.ReactNode; color: string }> = {
  dcf: { label: 'DCF', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  lbo: { label: 'LBO', icon: <BarChart3 className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
  ma: { label: 'M&A', icon: <GitMerge className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
  comps: { label: 'Comps', icon: <LayoutGrid className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ModelType | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['models', searchQuery, filterType],
    queryFn: () => modelApi.list(1, 50, searchQuery || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => modelApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });

  const models = data?.models ?? [];
  const filtered = filterType === 'all' ? models : models.filter((m: any) => m.modelType === filterType);

  const handleOpenModel = (model: any) => {
    navigate(`/model/${model.id}`);
  };

  const handleNewModel = (type: ModelType, name: string) => {
    const store = useModelStore.getState();
    store.initModel(type, name);
    // Navigate to a new model view
    navigate('/model/new');
    setShowNewModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Models</h1>
          <p className="text-sm text-gray-500 mt-1">
            {models.length} model{models.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Model
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              filterType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            All
          </button>
          {(Object.keys(MODEL_TYPE_CONFIG) as ModelType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filterType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {MODEL_TYPE_CONFIG[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* Model Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No models yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Create your first financial model to get started
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Model
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((model: any) => {
            const config = MODEL_TYPE_CONFIG[model.modelType as ModelType];
            return (
              <div
                key={model.id}
                onClick={() => handleOpenModel(model)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', config?.color)}>
                    {config?.icon}
                    {config?.label}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(model.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{model.name}</h3>
                {model.companyName && (
                  <p className="text-sm text-gray-600 mb-2">{model.companyName}</p>
                )}
                {model.valuationSummary && (
                  <p className="text-xs font-mono text-brand-600 mb-3 bg-brand-50 px-2 py-1 rounded">
                    {model.valuationSummary}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {new Date(model.updatedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <NewModelModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleNewModel}
        />
      )}
    </div>
  );
}

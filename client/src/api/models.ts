import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface ModelSummary {
  id: string;
  name: string;
  modelType: string;
  companyName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelDetail {
  id: string;
  name: string;
  modelType: string;
  companyName: string;
  description: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersion {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await apiClient.get<ModelSummary[]>('/models');
      return res.data;
    },
  });
}

export function useModel(id: string) {
  return useQuery({
    queryKey: ['models', id],
    queryFn: async () => {
      const res = await apiClient.get<ModelDetail>(`/models/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; modelType: string; companyName?: string }) => {
      const res = await apiClient.post<ModelDetail>('/models', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  });
}

export function useUpdateModel() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiClient.put<ModelDetail>(`/models/${id}`, data);
      return res.data;
    },
  });
}

export function useDeleteModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/models/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  });
}

export function useModelVersions(id: string) {
  return useQuery({
    queryKey: ['models', id, 'versions'],
    queryFn: async () => {
      const res = await apiClient.get<ModelVersion[]>(`/models/${id}/versions`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelId, versionId }: { modelId: string; versionId: string }) => {
      const res = await apiClient.post<ModelDetail>(
        `/models/${modelId}/versions/${versionId}/restore`
      );
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['models', vars.modelId] });
    },
  });
}

export function useShareModel() {
  return useMutation({
    mutationFn: async (modelId: string) => {
      const res = await apiClient.post<{ token: string; url: string }>(
        `/models/${modelId}/share`
      );
      return res.data;
    },
  });
}

export function useSharedModel(token: string) {
  return useQuery({
    queryKey: ['share', token],
    queryFn: async () => {
      const res = await apiClient.get<ModelDetail>(`/share/${token}`);
      return res.data;
    },
    enabled: !!token,
  });
}

export function useDuplicateSharedModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await apiClient.post<ModelDetail>(`/share/${token}/duplicate`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  });
}

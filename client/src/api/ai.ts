import { useMutation } from '@tanstack/react-query';
import apiClient from './client';

export interface AISuggestion {
  value: number;
  confidence: { low: number; high: number };
  reasoning: string;
}

export interface AIAutoPopulateResult {
  inputs: Record<string, unknown>;
  aiFields: string[];
}

export interface AIParseResult {
  fields: Record<string, { value: unknown; confident: boolean; explanation?: string }>;
  unmappedText: string[];
}

export interface AIValidation {
  isUnusual: boolean;
  explanation: string;
  severity: 'info' | 'warning' | 'error';
}

export interface AIForecastResult {
  revenueGrowthRates: number[];
  ebitdaMargins: number[];
  reasoning: string;
}

export function useAISuggest() {
  return useMutation({
    mutationFn: async (data: {
      field: string;
      context: Record<string, unknown>;
    }) => {
      const res = await apiClient.post<AISuggestion>('/ai/suggest', data);
      return res.data;
    },
  });
}

export function useAIAutoPopulate() {
  return useMutation({
    mutationFn: async (data: {
      companyName: string;
      description: string;
      sector: string;
    }) => {
      const res = await apiClient.post<AIAutoPopulateResult>('/ai/auto-populate', data);
      return res.data;
    },
  });
}

export function useAIParse() {
  return useMutation({
    mutationFn: async (data: { rawText: string; targetFields: string[] }) => {
      const res = await apiClient.post<AIParseResult>('/ai/parse', data);
      return res.data;
    },
  });
}

export function useAIValidate() {
  return useMutation({
    mutationFn: async (data: {
      field: string;
      value: number;
      context: Record<string, unknown>;
    }) => {
      const res = await apiClient.post<AIValidation>('/ai/validate', data);
      return res.data;
    },
  });
}

export function useAIForecast() {
  return useMutation({
    mutationFn: async (data: {
      companyName: string;
      sector: string;
      historicals: Record<string, number[]>;
      projectionYears: number;
    }) => {
      const res = await apiClient.post<AIForecastResult>('/ai/forecast', data);
      return res.data;
    },
  });
}

export function useAINarrative() {
  return useMutation({
    mutationFn: async (data: {
      modelData: Record<string, unknown>;
      steerPrompt?: string;
    }) => {
      const res = await apiClient.post<{ narrative: string }>('/ai/narrative', data);
      return res.data;
    },
  });
}

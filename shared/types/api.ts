import { ModelMeta, ModelType } from './common';
import { DCFInputs } from './dcf';
import { LBOInputs } from './lbo';
import { MAInputs } from './ma';
import { CompsInputs } from './comps';
import { SensitivityTableConfig, TornadoChartConfig } from './sensitivity';

// ============================================================
// API Request / Response Types
// ============================================================

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// Model CRUD
export type ModelInputs = DCFInputs | LBOInputs | MAInputs | CompsInputs;

export interface SaveModelRequest {
  meta: Omit<ModelMeta, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  inputs: ModelInputs;
  sensitivityConfigs?: SensitivityTableConfig[];
  tornadoConfig?: TornadoChartConfig;
}

export interface ModelResponse {
  meta: ModelMeta;
  inputs: ModelInputs;
  sensitivityConfigs?: SensitivityTableConfig[];
  tornadoConfig?: TornadoChartConfig;
}

export interface ModelListResponse {
  models: ModelMeta[];
  total: number;
  page: number;
  pageSize: number;
}

// AI
export interface AISuggestRequest {
  fieldPath: string;
  companyName: string;
  sector: string;
  context: Record<string, unknown>;
  modelType: ModelType;
}

export interface AISuggestResponse {
  value: number;
  confidence: number;
  reasoning: string;
  range?: { low: number; high: number };
}

export interface AIPasteParseRequest {
  rawText: string;
  modelType: ModelType;
  targetSection: string;
}

export interface AIPasteParseResponse {
  parsedFields: {
    fieldPath: string;
    value: number;
    confidence: number;
    sourceText: string;
  }[];
  unparsedFields: string[];
  warnings: string[];
}

export interface AIAutoPopulateRequest {
  companyName: string;
  companyDescription?: string;
  sector: string;
  modelType: ModelType;
}

export interface AIAutoPopulateResponse {
  fields: {
    fieldPath: string;
    value: number;
    confidence: number;
    reasoning: string;
  }[];
  disclaimer: string;
}

export interface AIValidateRequest {
  fieldPath: string;
  value: number;
  companyName: string;
  sector: string;
  modelType: ModelType;
}

export interface AIValidateResponse {
  isUnusual: boolean;
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
  typicalRange?: { low: number; high: number };
}

export interface AIForecastRequest {
  companyName: string;
  companyDescription?: string;
  sector: string;
  historicalFinancials: Record<string, unknown>[];
  projectionPeriod: number;
  modelType: ModelType;
}

export interface AIForecastResponse {
  projections: {
    year: number;
    fields: {
      fieldPath: string;
      value: number;
      reasoning: string;
    }[];
  }[];
}

// PDF Export
export interface PDFExportRequest {
  modelIds: string[];
  narrativePrompt?: string;
  includeFootballField: boolean;
}

export interface PDFExportResponse {
  pdfUrl: string;
  narrative: string;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

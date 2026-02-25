import { create } from 'zustand';
import type { DCFInputs, CompsInputs } from '../engine/types';

export type DataMode = 'manual' | 'paste-parse' | 'ai-auto';

interface ModelMeta {
  id: string;
  name: string;
  modelType: 'dcf' | 'lbo' | 'ma' | 'comps';
  companyName: string;
  description: string;
}

interface ModelState {
  meta: ModelMeta | null;
  dcfInputs: DCFInputs;
  compsInputs: CompsInputs;
  aiFields: Set<string>;
  dataMode: DataMode;
  isDirty: boolean;
  lastSaved: string | null;

  setMeta: (meta: ModelMeta) => void;
  setDCFInput: <K extends keyof DCFInputs>(key: K, value: DCFInputs[K]) => void;
  setDCFInputs: (inputs: Partial<DCFInputs>) => void;
  setCompsInput: <K extends keyof CompsInputs>(key: K, value: CompsInputs[K]) => void;
  setCompsInputs: (inputs: Partial<CompsInputs>) => void;
  markAIField: (field: string) => void;
  clearAIField: (field: string) => void;
  setDataMode: (mode: DataMode) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (ts: string) => void;
  loadModel: (meta: ModelMeta, inputs: DCFInputs | CompsInputs, aiFields: string[]) => void;
  resetInputs: () => void;
}

export const DEFAULT_DCF_INPUTS: DCFInputs = {
  companyName: '',
  companyDescription: '',
  sector: '',
  projectionYears: 5,
  historicalRevenue: [0, 0, 0],
  historicalEBITDA: [0, 0, 0],
  historicalDA: [0, 0, 0],
  historicalCapex: [0, 0, 0],
  historicalNWC: [0, 0, 0],
  revenueGrowthRates: [0, 0, 0, 0, 0],
  ebitdaMargins: [0, 0, 0, 0, 0],
  daPercentRevenue: 0,
  capexPercentRevenue: 0,
  nwcPercentRevenueChange: 0,
  taxRate: 25,
  riskFreeRate: 4.0,
  equityRiskPremium: 5.5,
  beta: 1.0,
  preTaxCostOfDebt: 5.0,
  debtToEquity: 0.3,
  terminalValueMethod: 'gordon-growth',
  terminalGrowthRate: 2.5,
  exitMultiple: 10,
  netDebt: 0,
  dilutedShares: 1,
};

export const DEFAULT_COMPS_INPUTS: CompsInputs = {
  companyName: '',
  companyDescription: '',
  sector: '',
  subjectRevenue: 0,
  subjectEBITDA: 0,
  subjectNetIncome: 0,
  subjectNetDebt: 0,
  subjectDilutedShares: 1,
  peers: [],
  useEVRevenue: true,
  useEVEBITDA: true,
  usePE: true,
};

export const useModelStore = create<ModelState>()((set) => ({
  meta: null,
  dcfInputs: { ...DEFAULT_DCF_INPUTS },
  compsInputs: { ...DEFAULT_COMPS_INPUTS },
  aiFields: new Set<string>(),
  dataMode: 'manual',
  isDirty: false,
  lastSaved: null,

  setMeta: (meta) => set({ meta }),

  setDCFInput: (key, value) =>
    set((state) => ({
      dcfInputs: { ...state.dcfInputs, [key]: value },
      isDirty: true,
    })),

  setDCFInputs: (inputs) =>
    set((state) => ({
      dcfInputs: { ...state.dcfInputs, ...inputs },
      isDirty: true,
    })),

  setCompsInput: (key, value) =>
    set((state) => ({
      compsInputs: { ...state.compsInputs, [key]: value },
      isDirty: true,
    })),

  setCompsInputs: (inputs) =>
    set((state) => ({
      compsInputs: { ...state.compsInputs, ...inputs },
      isDirty: true,
    })),

  markAIField: (field) =>
    set((state) => {
      const next = new Set(state.aiFields);
      next.add(field);
      return { aiFields: next };
    }),

  clearAIField: (field) =>
    set((state) => {
      const next = new Set(state.aiFields);
      next.delete(field);
      return { aiFields: next };
    }),

  setDataMode: (mode) => set({ dataMode: mode }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setLastSaved: (ts) => set({ lastSaved: ts, isDirty: false }),

  loadModel: (meta, inputs, aiFields) => {
    const update: Partial<ModelState> = {
      meta,
      aiFields: new Set(aiFields),
      isDirty: false,
    };
    if (meta.modelType === 'comps') {
      update.compsInputs = inputs as CompsInputs;
    } else {
      update.dcfInputs = inputs as DCFInputs;
    }
    set(update);
  },

  resetInputs: () =>
    set({
      dcfInputs: { ...DEFAULT_DCF_INPUTS },
      compsInputs: { ...DEFAULT_COMPS_INPUTS },
      aiFields: new Set(),
      isDirty: false,
    }),
}));

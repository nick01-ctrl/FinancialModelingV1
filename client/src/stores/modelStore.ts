import { create } from 'zustand';
import type { ModelType, DataEntryMode, FieldSource } from '../../../shared/types/common';
import type { DCFInputs, DCFOutputs, createDefaultDCFInputs } from '../../../shared/types/dcf';
import type { LBOInputs, LBOOutputs } from '../../../shared/types/lbo';
import type { MAInputs, MAOutputs } from '../../../shared/types/ma';
import type { CompsInputs, CompsOutputs } from '../../../shared/types/comps';
import type { SensitivityTableConfig, TornadoChartConfig, SensitivityTableResult, TornadoChartResult } from '../../../shared/types/sensitivity';

// Union types for current model state
type ModelInputs = DCFInputs | LBOInputs | MAInputs | CompsInputs;
type ModelOutputs = DCFOutputs | LBOOutputs | MAOutputs | CompsOutputs;

interface ModelState {
  // Current model metadata
  modelId: string | null;
  modelType: ModelType | null;
  modelName: string;
  companyName: string;
  dataEntryMode: DataEntryMode;
  isDirty: boolean;
  lastSaved: string | null;

  // Inputs and outputs
  inputs: ModelInputs | null;
  outputs: ModelOutputs | null;
  isCalculating: boolean;
  calculationError: string | null;

  // Sensitivity
  sensitivityConfigs: SensitivityTableConfig[];
  sensitivityResults: SensitivityTableResult[];
  tornadoConfig: TornadoChartConfig | null;
  tornadoResult: TornadoChartResult | null;

  // AI disclaimer acknowledged
  aiDisclaimerAcknowledged: boolean;

  // Actions
  initModel: (type: ModelType, name: string) => void;
  loadModel: (id: string, type: ModelType, name: string, inputs: ModelInputs) => void;
  updateInputs: (updates: Partial<ModelInputs>) => void;
  setInputs: (inputs: ModelInputs) => void;
  setOutputs: (outputs: ModelOutputs | null) => void;
  setCalculating: (calculating: boolean) => void;
  setCalculationError: (error: string | null) => void;
  setDataEntryMode: (mode: DataEntryMode) => void;
  setModelName: (name: string) => void;
  setCompanyName: (name: string) => void;
  markSaved: () => void;
  acknowledgeAIDisclaimer: () => void;
  setSensitivityConfigs: (configs: SensitivityTableConfig[]) => void;
  setSensitivityResults: (results: SensitivityTableResult[]) => void;
  setTornadoConfig: (config: TornadoChartConfig | null) => void;
  setTornadoResult: (result: TornadoChartResult | null) => void;
  resetModel: () => void;
}

const initialState = {
  modelId: null,
  modelType: null,
  modelName: '',
  companyName: '',
  dataEntryMode: 'manual' as DataEntryMode,
  isDirty: false,
  lastSaved: null,
  inputs: null,
  outputs: null,
  isCalculating: false,
  calculationError: null,
  sensitivityConfigs: [],
  sensitivityResults: [],
  tornadoConfig: null,
  tornadoResult: null,
  aiDisclaimerAcknowledged: false,
};

export const useModelStore = create<ModelState>()((set, get) => ({
  ...initialState,

  initModel: (type, name) => {
    set({
      ...initialState,
      modelType: type,
      modelName: name,
      isDirty: true,
    });
  },

  loadModel: (id, type, name, inputs) => {
    set({
      ...initialState,
      modelId: id,
      modelType: type,
      modelName: name,
      inputs,
      isDirty: false,
    });
  },

  updateInputs: (updates) => {
    const current = get().inputs;
    if (!current) return;
    set({
      inputs: { ...current, ...updates } as ModelInputs,
      isDirty: true,
    });
  },

  setInputs: (inputs) => set({ inputs, isDirty: true }),
  setOutputs: (outputs) => set({ outputs }),
  setCalculating: (calculating) => set({ isCalculating: calculating }),
  setCalculationError: (error) => set({ calculationError: error }),
  setDataEntryMode: (mode) => set({ dataEntryMode: mode }),
  setModelName: (name) => set({ modelName: name, isDirty: true }),
  setCompanyName: (name) => set({ companyName: name, isDirty: true }),

  markSaved: () =>
    set({ isDirty: false, lastSaved: new Date().toISOString() }),

  acknowledgeAIDisclaimer: () => set({ aiDisclaimerAcknowledged: true }),

  setSensitivityConfigs: (configs) => set({ sensitivityConfigs: configs }),
  setSensitivityResults: (results) => set({ sensitivityResults: results }),
  setTornadoConfig: (config) => set({ tornadoConfig: config }),
  setTornadoResult: (result) => set({ tornadoResult: result }),

  resetModel: () => set(initialState),
}));

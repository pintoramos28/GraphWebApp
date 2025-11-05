import { create } from 'zustand';
import type { FieldMetadata } from '@/lib/fieldMetadata';

export type ShelfKey =
  | 'x'
  | 'y'
  | 'color'
  | 'size'
  | 'shape'
  | 'opacity'
  | 'row'
  | 'column';

export type ShelfAssignments = Partial<Record<ShelfKey, string>>;

export type ScatterErrorBarMode = 'off' | 'fields' | 'ci' | 'stderr' | 'stdev';

export type ScatterErrorBarsState = {
  mode: ScatterErrorBarMode;
  axis: 'x' | 'y';
  lowerFieldId: string | null;
  upperFieldId: string | null;
};

export type DatasetReference = {
  id: string;
  name: string;
  fieldCount: number;
  fields: Record<string, FieldMetadata>;
};

export type AppPresentState = {
  version: number;
  lastUpdated: number;
  project: {
    title: string;
    description: string;
  };
  shelves: ShelfAssignments;
  datasets: Record<string, DatasetReference>;
  scatter: {
    jitter: {
      enabled: boolean;
      magnitude: number;
      seed: number;
    };
    trendline: {
      type: 'none' | 'linear' | 'polynomial' | 'loess';
      polynomialOrder: number;
      bandwidth: number;
    };
    errorBars: ScatterErrorBarsState;
  };
};

export type AppAction =
  | { type: 'project/setTitle'; title: string }
  | { type: 'project/setDescription'; description: string }
  | { type: 'shelf/assign'; shelf: ShelfKey; fieldId: string }
  | { type: 'shelf/clear'; shelf: ShelfKey }
  | { type: 'datasets/register'; dataset: DatasetReference }
  | { type: 'datasets/remove'; datasetId: string }
  | {
      type: 'datasets/updateField';
      datasetId: string;
      fieldId: string;
      changes: Partial<FieldMetadata>;
    }
  | {
      type: 'scatter/setJitter';
      enabled?: boolean;
      magnitude?: number;
      seed?: number;
    }
  | {
      type: 'scatter/setTrendline';
      trendline: Partial<{
        type: 'none' | 'linear' | 'polynomial' | 'loess';
        polynomialOrder: number;
        bandwidth: number;
      }>;
    }
  | {
      type: 'scatter/setErrorBars';
      errorBars: Partial<ScatterErrorBarsState>;
    };

const HISTORY_LIMIT = 100;

export type AppStoreState = {
  past: AppPresentState[];
  present: AppPresentState;
  future: AppPresentState[];
  maxHistory: number;
  canUndo: boolean;
  canRedo: boolean;
  dispatch: (action: AppAction) => void;
  undo: () => void;
  redo: () => void;
  resetHistory: (state?: AppPresentState) => void;
};

const createInitialPresentState = (): AppPresentState => ({
  version: 1,
  lastUpdated: Date.now(),
  project: {
    title: 'Untitled Project',
    description: ''
  },
  shelves: {},
  datasets: {},
  scatter: {
    jitter: {
      enabled: false,
      magnitude: 0.4,
      seed: 1337
    },
    trendline: {
      type: 'none',
      polynomialOrder: 2,
      bandwidth: 0.5
    },
    errorBars: {
      mode: 'off',
      axis: 'y',
      lowerFieldId: null,
      upperFieldId: null
    }
  }
});

const cloneState = (state: AppPresentState): AppPresentState => structuredClone(state);

const areFieldMapsEqual = (
  left: Record<string, FieldMetadata>,
  right: Record<string, FieldMetadata>
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key) => {
    const leftMeta = left[key];
    if (!leftMeta) {
      return false;
    }
    const rightMeta = right[key];
    if (!rightMeta) {
      return false;
    }
    return (
      leftMeta.fieldId === rightMeta.fieldId &&
      leftMeta.name === rightMeta.name &&
      leftMeta.label === rightMeta.label &&
      leftMeta.unit === rightMeta.unit &&
      leftMeta.semanticType === rightMeta.semanticType
    );
  });
};

const applyAction = (state: AppPresentState, action: AppAction): AppPresentState => {
  switch (action.type) {
    case 'project/setTitle': {
      if (state.project.title === action.title) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        project: {
          ...state.project,
          title: action.title
        }
      };
    }
    case 'project/setDescription': {
      if (state.project.description === action.description) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        project: {
          ...state.project,
          description: action.description
        }
      };
    }
    case 'shelf/assign': {
      if (state.shelves[action.shelf] === action.fieldId) {
        return state;
      }
      const nextShelves: ShelfAssignments = { ...state.shelves };
      (Object.keys(nextShelves) as ShelfKey[]).forEach((key) => {
        if (nextShelves[key] === action.fieldId) {
          delete nextShelves[key];
        }
      });
      nextShelves[action.shelf] = action.fieldId;
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        shelves: nextShelves
      };
    }
    case 'shelf/clear': {
      if (!state.shelves[action.shelf]) {
        return state;
      }
      const nextShelves: ShelfAssignments = { ...state.shelves };
      delete nextShelves[action.shelf];
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        shelves: nextShelves
      };
    }
    case 'datasets/register': {
      const { dataset } = action;
      const existing = state.datasets[dataset.id];
      const normalizedFields: Record<string, FieldMetadata> = Object.fromEntries(
        Object.entries(dataset.fields ?? {}).map(([fieldId, metadata]) => [
          fieldId,
          { ...metadata }
        ])
      );

      const mergedFields = existing
        ? Object.keys(normalizedFields).reduce<Record<string, FieldMetadata>>((acc, fieldId) => {
            const incoming = normalizedFields[fieldId]!;
            const previous = existing.fields[fieldId];
            if (previous) {
              acc[fieldId] = {
                fieldId: incoming.fieldId,
                name: previous.name,
                label: previous.label,
                unit: previous.unit,
                semanticType: previous.semanticType
              };
            } else {
              acc[fieldId] = incoming;
            }
            return acc;
          }, {})
        : normalizedFields;

      if (
        existing &&
        existing.name === dataset.name &&
        existing.fieldCount === dataset.fieldCount &&
        areFieldMapsEqual(existing.fields, mergedFields)
      ) {
        return state;
      }

      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        datasets: {
          ...state.datasets,
          [dataset.id]: {
            id: dataset.id,
            name: dataset.name,
            fieldCount: dataset.fieldCount,
            fields: mergedFields
          }
        }
      };
    }
    case 'datasets/remove': {
      if (!state.datasets[action.datasetId]) {
        return state;
      }
      const nextDatasets = { ...state.datasets };
      delete nextDatasets[action.datasetId];
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        datasets: nextDatasets
      };
    }
    case 'datasets/updateField': {
      const dataset = state.datasets[action.datasetId];
      if (!dataset) {
        return state;
      }
      const field = dataset.fields[action.fieldId];
      if (!field) {
        return state;
      }
      const nextField: FieldMetadata = {
        ...field,
        ...action.changes
      };
      if (
        nextField.name === field.name &&
        nextField.label === field.label &&
        nextField.unit === field.unit &&
        nextField.semanticType === field.semanticType
      ) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        datasets: {
          ...state.datasets,
          [action.datasetId]: {
            ...dataset,
            fields: {
              ...dataset.fields,
              [action.fieldId]: nextField
            }
          }
        }
      };
    }
    case 'scatter/setJitter': {
      const { jitter } = state.scatter;
      const nextJitter = {
        enabled: action.enabled ?? jitter.enabled,
        magnitude: action.magnitude ?? jitter.magnitude,
        seed: action.seed ?? jitter.seed
      };
      if (
        nextJitter.enabled === jitter.enabled &&
        nextJitter.magnitude === jitter.magnitude &&
        nextJitter.seed === jitter.seed
      ) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        scatter: {
          ...state.scatter,
          jitter: nextJitter
        }
      };
    }
    case 'scatter/setTrendline': {
      const current = state.scatter.trendline;
      const next = {
        type: action.trendline.type ?? current.type,
        polynomialOrder: action.trendline.polynomialOrder ?? current.polynomialOrder,
        bandwidth: action.trendline.bandwidth ?? current.bandwidth
      };
      if (
        next.type === current.type &&
        next.polynomialOrder === current.polynomialOrder &&
        next.bandwidth === current.bandwidth
      ) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        scatter: {
          ...state.scatter,
          trendline: next
        }
      };
    }
    case 'scatter/setErrorBars': {
      const current = state.scatter.errorBars;
      const next: ScatterErrorBarsState = {
        mode: action.errorBars.mode ?? current.mode,
        axis: action.errorBars.axis ?? current.axis,
        lowerFieldId:
          action.errorBars.lowerFieldId !== undefined ? action.errorBars.lowerFieldId : current.lowerFieldId,
        upperFieldId:
          action.errorBars.upperFieldId !== undefined ? action.errorBars.upperFieldId : current.upperFieldId
      };
      if (
        next.mode === current.mode &&
        next.axis === current.axis &&
        next.lowerFieldId === current.lowerFieldId &&
        next.upperFieldId === current.upperFieldId
      ) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        scatter: {
          ...state.scatter,
          errorBars: next
        }
      };
    }
    default: {
      const exhaustiveCheck: never = action;
      throw new Error('Unhandled action in appStore reducer');
    }
  }
};

export const useAppStore = create<AppStoreState>((set) => ({
  past: [],
  present: createInitialPresentState(),
  future: [],
  maxHistory: HISTORY_LIMIT,
  canUndo: false,
  canRedo: false,
  dispatch: (action: AppAction) =>
    set((state) => {
      const nextPresent = applyAction(state.present, action);
      if (nextPresent === state.present) {
        return state;
      }
      const nextPast = [...state.past, cloneState(state.present)];
      if (nextPast.length > state.maxHistory) {
        nextPast.shift();
      }
      return {
        past: nextPast,
        present: cloneState(nextPresent),
        future: [],
        maxHistory: state.maxHistory,
        canUndo: nextPast.length > 0,
        canRedo: false
      };
    }),
  undo: () =>
    set((state) => {
      if (!state.past.length) {
        return state;
      }
      const previous = state.past[state.past.length - 1]!;
      const nextPast = state.past.slice(0, state.past.length - 1);
      return {
        past: nextPast,
        present: cloneState(previous),
        future: [cloneState(state.present), ...state.future],
        maxHistory: state.maxHistory,
        canUndo: nextPast.length > 0,
        canRedo: true
      };
    }),
  redo: () =>
    set((state) => {
      if (!state.future.length) {
        return state;
      }
      const [next, ...rest] = state.future as [AppPresentState, ...AppPresentState[]];
      const nextPast = [...state.past, cloneState(state.present)];
      return {
        past: nextPast,
        present: cloneState(next),
        future: rest,
        maxHistory: state.maxHistory,
        canUndo: true,
        canRedo: rest.length > 0
      };
    }),
  resetHistory: (state?: AppPresentState) => {
    const nextPresent = state ? cloneState(state) : createInitialPresentState();
    set({
      past: [],
      present: nextPresent,
      future: [],
      canUndo: false,
      canRedo: false
    });
  }
}));

export const selectCanUndo = (store: AppStoreState) => store.canUndo;
export const selectCanRedo = (store: AppStoreState) => store.canRedo;
export const selectProjectMeta = (store: AppStoreState) => store.present.project;
export const selectShelves = (store: AppStoreState) => store.present.shelves;
export const selectScatterJitter = (store: AppStoreState) => store.present.scatter.jitter;
export const selectScatterTrendline = (store: AppStoreState) => store.present.scatter.trendline;
export const selectScatterErrorBars = (store: AppStoreState) => store.present.scatter.errorBars;

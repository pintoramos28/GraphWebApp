import { create } from 'zustand';

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

export type DatasetReference = {
  id: string;
  name: string;
  fieldCount: number;
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
};

export type AppAction =
  | { type: 'project/setTitle'; title: string }
  | { type: 'project/setDescription'; description: string }
  | { type: 'shelf/assign'; shelf: ShelfKey; fieldId: string }
  | { type: 'shelf/clear'; shelf: ShelfKey }
  | { type: 'datasets/register'; dataset: DatasetReference }
  | { type: 'datasets/remove'; datasetId: string };

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
  datasets: {}
});

const cloneState = (state: AppPresentState): AppPresentState => structuredClone(state);

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
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        shelves: {
          ...state.shelves,
          [action.shelf]: action.fieldId
        }
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
      if (
        existing &&
        existing.name === dataset.name &&
        existing.fieldCount === dataset.fieldCount
      ) {
        return state;
      }
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: Date.now(),
        datasets: {
          ...state.datasets,
          [dataset.id]: dataset
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
    default: {
      const exhaustiveCheck: never = action;
      throw new Error('Unhandled action in appStore reducer');
    }
  }
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  past: [],
  present: createInitialPresentState(),
  future: [],
  maxHistory: HISTORY_LIMIT,
  canUndo: false,
  canRedo: false,
  dispatch: (action: AppAction) => {
    const { present, past, maxHistory } = get();
    const nextPresent = applyAction(present, action);
    if (nextPresent === present) {
      return;
    }

    const nextPast = [...past, cloneState(present)];
    if (nextPast.length > maxHistory) {
      nextPast.shift();
    }

    set({
      past: nextPast,
      present: cloneState(nextPresent),
      future: [],
      canUndo: nextPast.length > 0,
      canRedo: false
    });
  },
  undo: () => {
    const { past, present, future } = get();
    if (!past.length) {
      return;
    }
    const previous = past[past.length - 1]!;
    const nextPast = past.slice(0, past.length - 1);

    set({
      past: nextPast,
      present: cloneState(previous),
      future: [cloneState(present), ...future],
      canUndo: nextPast.length > 0,
      canRedo: true
    });
  },
  redo: () => {
    const { past, present, future } = get();
    if (!future.length) {
      return;
    }
    const [next, ...rest] = future as [AppPresentState, ...AppPresentState[]];
    const nextPast = [...past, cloneState(present)];

    set({
      past: nextPast,
      present: cloneState(next),
      future: rest,
      canUndo: true,
      canRedo: rest.length > 0
    });
  },
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

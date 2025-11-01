import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

type CanvasView = 'chart' | 'table';

type LayoutSnapshot = {
  sidebarWidth: number;
  inspectorWidth: number;
  canvasView: CanvasView;
};

type Snapshot = {
  themeMode: ThemeMode;
  layout: LayoutSnapshot;
};

type StoreAction =
  | { type: 'setThemeMode'; mode: ThemeMode }
  | { type: 'toggleThemeMode' }
  | { type: 'setLayout'; layout: Partial<LayoutSnapshot> }
  | { type: 'setCanvasView'; view: CanvasView }
  | { type: 'reset' };

type ProjectStore = Snapshot & {
  canUndo: boolean;
  canRedo: boolean;
  dispatch: (action: StoreAction) => void;
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
  hardReset: () => void;
};

const defaultSnapshot: Snapshot = {
  themeMode: 'dark',
  layout: {
    sidebarWidth: 320,
    inspectorWidth: 360,
    canvasView: 'chart',
  },
};

const cloneSnapshot = (snapshot: Snapshot): Snapshot => ({
  themeMode: snapshot.themeMode,
  layout: { ...snapshot.layout },
});

const applyAction = (snapshot: Snapshot, action: StoreAction): Snapshot | null => {
  switch (action.type) {
    case 'setThemeMode':
      if (snapshot.themeMode === action.mode) {
        return null;
      }
      return { ...snapshot, themeMode: action.mode };
    case 'toggleThemeMode':
      return {
        ...snapshot,
        themeMode: snapshot.themeMode === 'dark' ? 'light' : 'dark',
      };
    case 'setLayout':
      return { ...snapshot, layout: { ...snapshot.layout, ...action.layout } };
    case 'setCanvasView':
      if (snapshot.layout.canvasView === action.view) {
        return null;
      }
      return {
        ...snapshot,
        layout: { ...snapshot.layout, canvasView: action.view },
      };
    case 'reset':
      return cloneSnapshot(defaultSnapshot);
    default:
      return null;
  }
};

export const useProjectStore = create<ProjectStore>()((set) => {
  const history = {
    past: [] as Snapshot[],
    present: cloneSnapshot(defaultSnapshot),
    future: [] as Snapshot[],
  };

  const emitSnapshot = (snapshot: Snapshot) => {
    history.present = snapshot;
    set({
      ...snapshot,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    });
  };

  return {
    ...history.present,
    canUndo: false,
    canRedo: false,
    dispatch: (action) => {
      const next = applyAction(history.present, action);
      if (!next) {
        return;
      }
      history.past.push(cloneSnapshot(history.present));
      history.future = [];
      emitSnapshot(cloneSnapshot(next));
    },
    undo: () => {
      const previous = history.past.pop();
      if (!previous) {
        return;
      }
      history.future.push(cloneSnapshot(history.present));
      emitSnapshot(cloneSnapshot(previous));
    },
    redo: () => {
      const next = history.future.pop();
      if (!next) {
        return;
      }
      history.past.push(cloneSnapshot(history.present));
      emitSnapshot(cloneSnapshot(next));
    },
    resetHistory: () => {
      history.past = [];
      history.future = [];
      emitSnapshot(cloneSnapshot(history.present));
    },
    hardReset: () => {
      history.past = [];
      history.future = [];
      emitSnapshot(cloneSnapshot(defaultSnapshot));
    },
  };
});

export const selectThemeMode = (state: ProjectStore) => state.themeMode;
export const selectLayout = (state: ProjectStore) => state.layout;
export type { ProjectStore, StoreAction, Snapshot, ThemeMode, LayoutSnapshot };

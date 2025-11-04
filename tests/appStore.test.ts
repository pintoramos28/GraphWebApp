import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAppStore,
  selectCanUndo,
  selectCanRedo,
  type AppPresentState,
  type ShelfKey
} from '@/state/appStore';

const resetStore = (state?: AppPresentState) => {
  useAppStore.getState().resetHistory(state);
};

describe('appStore history', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  it('records past states when dispatching mutating actions', () => {
    const initialTitle = useAppStore.getState().present.project.title;
    resetStore();

    useAppStore.getState().dispatch({ type: 'project/setTitle', title: 'Analysis Sprint' });

    const state = useAppStore.getState();
    expect(state.present.project.title).toBe('Analysis Sprint');
    expect(state.past).toHaveLength(1);
    expect(initialTitle).not.toBe(state.present.project.title);
    expect(selectCanUndo(state)).toBe(true);
    expect(selectCanRedo(state)).toBe(false);
  });

  it('supports undo and redo transitions', () => {
    resetStore();

    useAppStore.getState().dispatch({ type: 'project/setTitle', title: 'Phase A' });
    useAppStore.getState().dispatch({ type: 'project/setTitle', title: 'Phase B' });

    let state = useAppStore.getState();
    expect(state.present.project.title).toBe('Phase B');
    expect(selectCanUndo(state)).toBe(true);
    expect(selectCanRedo(state)).toBe(false);

    useAppStore.getState().undo();
    state = useAppStore.getState();
    expect(state.present.project.title).toBe('Phase A');
    expect(selectCanUndo(state)).toBe(true);
    expect(selectCanRedo(state)).toBe(true);

    useAppStore.getState().redo();
    state = useAppStore.getState();
    expect(state.present.project.title).toBe('Phase B');
    expect(selectCanUndo(state)).toBe(true);
    expect(selectCanRedo(state)).toBe(false);
  });

  it('ignores no-op updates to prevent history noise', () => {
    resetStore();
    const store = useAppStore.getState();
    const shelf: ShelfKey = 'x';

    store.dispatch({ type: 'shelf/assign', shelf, fieldId: 'field-1' });
    const afterFirst = useAppStore.getState();
    expect(afterFirst.past).toHaveLength(1);

    store.dispatch({ type: 'shelf/assign', shelf, fieldId: 'field-1' });
    const afterNoOp = useAppStore.getState();
    expect(afterNoOp.past).toHaveLength(1);
  });

  it('respects the configured history limit', () => {
    resetStore();
    useAppStore.setState((state) => ({ ...state, maxHistory: 2, past: [], future: [] }));

    useAppStore.getState().dispatch({ type: 'project/setTitle', title: 'State 1' });
    useAppStore.getState().dispatch({ type: 'project/setTitle', title: 'State 2' });
    useAppStore.getState().dispatch({ type: 'project/setTitle', title: 'State 3' });

    const state = useAppStore.getState();
    expect(state.past).toHaveLength(2);
    const [first, second] = state.past as [AppPresentState, AppPresentState];
    expect(first.project.title).toBe('State 1');
    expect(second.project.title).toBe('State 2');
  });

  it('updates dataset field metadata via dedicated action', () => {
    resetStore();

    useAppStore.getState().dispatch({
      type: 'datasets/register',
      dataset: {
        id: 'ds-1',
        name: 'metrics.csv',
        fieldCount: 1,
        fields: {
          price: {
            fieldId: 'price',
            name: 'price',
            label: 'Price',
            unit: '',
            semanticType: 'continuous'
          }
        }
      }
    });

    const initialVersion = useAppStore.getState().present.version;

    useAppStore.getState().dispatch({
      type: 'datasets/updateField',
      datasetId: 'ds-1',
      fieldId: 'price',
      changes: { label: 'Price (EUR)' }
    });

    const state = useAppStore.getState();
    expect(state.present.version).toBe(initialVersion + 1);
    expect(state.present.datasets['ds-1']?.fields.price?.label).toBe('Price (EUR)');
  });

  it('updates scatter jitter settings with history support', () => {
    resetStore();
    const initial = useAppStore.getState().present.scatter.jitter;

    useAppStore.getState().dispatch({
      type: 'scatter/setJitter',
      enabled: !initial.enabled,
      magnitude: 0.6,
      seed: 2025
    });

    const state = useAppStore.getState();
    expect(state.present.scatter.jitter.enabled).toBe(!initial.enabled);
    expect(state.present.scatter.jitter.magnitude).toBe(0.6);
    expect(state.present.scatter.jitter.seed).toBe(2025);
    expect(state.past).toHaveLength(1);
  });
});

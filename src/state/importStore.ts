import { create } from 'zustand';

export type PreviewColumn = {
  name: string;
  type: string;
};

export type DatasetPreview = {
  datasetId: string;
  fileName: string;
  rowCount: number;
  truncated: boolean;
  columns: PreviewColumn[];
  rows: Array<Record<string, unknown>>;
};

export type ImportStatusPhase = 'idle' | 'loading' | 'parsing' | 'counting' | 'success' | 'error';

type ImportStoreState = {
  phase: ImportStatusPhase;
  message: string | null;
  currentFile: string | null;
  preview: DatasetPreview | null;
  startImport: (fileName: string) => void;
  updateStatus: (phase: ImportStatusPhase, message?: string) => void;
  setPreview: (preview: DatasetPreview) => void;
  setError: (message: string) => void;
  reset: () => void;
};

export const useImportStore = create<ImportStoreState>((set) => ({
  phase: 'idle',
  message: null,
  currentFile: null,
  preview: null,
  startImport: (fileName: string) =>
    set({
      phase: 'loading',
      message: `Loading ${fileName}`,
      currentFile: fileName,
      preview: null
    }),
  updateStatus: (phase, message) =>
    set((state) => ({
      phase,
      message: message ?? state.message,
      currentFile: state.currentFile
    })),
  setPreview: (preview) =>
    set({
      phase: 'success',
      message: `Showing ${Math.min(
        1000,
        preview.rows.length
      ).toLocaleString()} rows${preview.truncated ? ' (preview limited to first 1,000 rows)' : ''}`,
      preview
    }),
  setError: (message) =>
    set((state) => ({
      phase: 'error',
      message,
      preview: state.preview
    })),
  reset: () =>
    set({
      phase: 'idle',
      message: null,
      currentFile: null,
      preview: null
    })
}));

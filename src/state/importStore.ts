import { create } from 'zustand';

export type PreviewColumn = {
  name: string;
  type: string;
  originalType?: string;
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
  recentUrls: string[];
  startImport: (fileName: string) => void;
  updateStatus: (phase: ImportStatusPhase, message?: string) => void;
  setPreview: (preview: DatasetPreview) => void;
  setError: (message: string) => void;
  overrideColumnType: (columnName: string, newType: string) => void;
  addRecentUrl: (url: string) => void;
  reset: () => void;
};

export const useImportStore = create<ImportStoreState>((set) => ({
  phase: 'idle',
  message: null,
  currentFile: null,
  preview: null,
  recentUrls: [],
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
    set((state) => {
      const previousColumns = new Map(
        state.preview?.columns.map((column) => [column.name, column]) ?? []
      );

      const columns = preview.columns.map((column) => {
        const previous = previousColumns.get(column.name);
        const autoType = column.type;
        const originalType = previous?.originalType ?? autoType;
        const hasOverride = previous && previous.type !== previous.originalType;
        return {
          ...column,
          originalType: autoType,
          type: hasOverride ? previous.type : autoType
        };
      });

      return {
        phase: 'success',
        message: `Showing ${Math.min(
          1000,
          preview.rows.length
        ).toLocaleString()} rows${preview.truncated ? ' (preview limited to first 1,000 rows)' : ''}`,
        preview: {
          ...preview,
          columns
        }
      };
    }),
  setError: (message) =>
    set((state) => ({
      phase: 'error',
      message,
      preview: state.preview
    })),
  overrideColumnType: (columnName, newType) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      return {
        ...state,
        preview: {
          ...state.preview,
          columns: state.preview.columns.map((column) =>
            column.name === columnName
              ? {
                  ...column,
                  type: newType
                }
              : column
          )
        }
      };
    }),
  addRecentUrl: (url) =>
    set((state) => {
      const updated = [url, ...state.recentUrls.filter((entry) => entry !== url)].slice(0, 5);
      return {
        ...state,
        recentUrls: updated
      };
    }),
  reset: () =>
    set({
      phase: 'idle',
      message: null,
      currentFile: null,
      preview: null
    })
}));

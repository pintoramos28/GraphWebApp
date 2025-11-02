import { create } from 'zustand';
import type { SampleColumn } from '@/lib/csvUtils';
import { createDefaultLabel } from '@/lib/fieldMetadata';

export type PreviewColumn = {
  fieldId: string;
  name: string;
  originalName: string;
  type: string;
  originalType: string;
  label: string;
  unit: string;
  hasLabelOverride: boolean;
  hasUnitOverride: boolean;
};

export type DatasetPreview = {
  datasetId: string;
  fileName: string;
  rowCount: number;
  truncated: boolean;
  columns: PreviewColumn[];
  rows: Array<Record<string, unknown>>;
};

export type DatasetPreviewInput = {
  datasetId: string;
  fileName: string;
  rowCount: number;
  truncated: boolean;
  columns: SampleColumn[];
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
  setPreview: (preview: DatasetPreviewInput) => void;
  setError: (message: string) => void;
  overrideColumnType: (fieldId: string, newType: string) => void;
  renameColumn: (fieldId: string, newName: string) => void;
  setColumnLabel: (fieldId: string, label: string) => void;
  setColumnUnit: (fieldId: string, unit: string) => void;
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
        state.preview?.columns.map((column) => [column.fieldId, column]) ?? []
      );

      const columns: PreviewColumn[] = preview.columns.map((column) => {
        const previous = previousColumns.get(column.fieldId);
        const autoType = column.type;
        const originalType = previous?.originalType ?? autoType;
        const hasTypeOverride = previous ? previous.type !== previous.originalType : false;
        const nextName = previous?.name ?? column.name;
        const originalName = previous?.originalName ?? column.originalName ?? column.name;
        const hasLabelOverride = previous?.hasLabelOverride ?? false;
        const hasUnitOverride = previous?.hasUnitOverride ?? false;
        const label = hasLabelOverride
          ? previous!.label
          : createDefaultLabel(nextName);
        const unit = hasUnitOverride ? previous!.unit : '';

        return {
          fieldId: column.fieldId,
          name: nextName,
          originalName,
          type: hasTypeOverride ? previous!.type : autoType,
          originalType,
          label,
          unit,
          hasLabelOverride,
          hasUnitOverride
        };
      });

      return {
        phase: 'success',
        message: `Showing ${Math.min(
          1000,
          preview.rows.length
        ).toLocaleString()} rows${preview.truncated ? ' (preview limited to first 1,000 rows)' : ''}`,
        preview: {
          datasetId: preview.datasetId,
          fileName: preview.fileName,
          rowCount: preview.rowCount,
          truncated: preview.truncated,
          rows: preview.rows,
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
  overrideColumnType: (fieldId, newType) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      return {
        ...state,
        preview: {
          ...state.preview,
          columns: state.preview.columns.map((column) =>
            column.fieldId === fieldId
              ? {
                  ...column,
                  type: newType
                }
              : column
          )
        }
      };
    }),
  renameColumn: (fieldId, newName) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const trimmed = newName.trim();
      if (!trimmed) {
        return state;
      }
      return {
        ...state,
        preview: {
          ...state.preview,
          columns: state.preview.columns.map((column) => {
            if (column.fieldId !== fieldId) {
              return column;
            }
            const nextName = trimmed;
            const hasLabelOverride = column.hasLabelOverride;
            return {
              ...column,
              name: nextName,
              label: hasLabelOverride ? column.label : createDefaultLabel(nextName)
            };
          })
        }
      };
    }),
  setColumnLabel: (fieldId, label) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const trimmed = label.trim();
      return {
        ...state,
        preview: {
          ...state.preview,
          columns: state.preview.columns.map((column) => {
            if (column.fieldId !== fieldId) {
              return column;
            }
            const hasLabelOverride = trimmed.length > 0;
            const nextLabel = hasLabelOverride ? trimmed : createDefaultLabel(column.name);
            return {
              ...column,
              label: nextLabel,
              hasLabelOverride
            };
          })
        }
      };
    }),
  setColumnUnit: (fieldId, unit) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const trimmed = unit.trim();
      return {
        ...state,
        preview: {
          ...state.preview,
          columns: state.preview.columns.map((column) =>
            column.fieldId === fieldId
              ? {
                  ...column,
                  unit: trimmed,
                  hasUnitOverride: trimmed.length > 0
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

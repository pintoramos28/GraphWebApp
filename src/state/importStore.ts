import { create } from 'zustand';
import type { SampleColumn } from '@/lib/csvUtils';
import { createDefaultLabel } from '@/lib/fieldMetadata';
import {
  applyDatasetFilters,
  describeFilter,
  type DatasetFilter,
  type DatasetFilterId,
  type NewDatasetFilter
} from '@/lib/datasetFilters';

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
  filteredRows: Array<Record<string, unknown>>;
  filteredRowCount: number;
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
  filters: DatasetFilter[];
  filteredRows: Array<Record<string, unknown>>;
  filteredRowCount: number;
  lastFilterDurationMs: number | null;
  recentUrls: string[];
  startImport: (fileName: string) => void;
  updateStatus: (phase: ImportStatusPhase, message?: string) => void;
  setPreview: (preview: DatasetPreviewInput) => void;
  setError: (message: string) => void;
  overrideColumnType: (fieldId: string, newType: string) => void;
  renameColumn: (fieldId: string, newName: string) => void;
  setColumnLabel: (fieldId: string, label: string) => void;
  setColumnUnit: (fieldId: string, unit: string) => void;
  addFilter: (filter: NewDatasetFilter) => void;
  updateFilter: (filterId: DatasetFilterId, updates: Partial<DatasetFilter>) => void;
  removeFilter: (filterId: DatasetFilterId) => void;
  clearFilters: () => void;
  addRecentUrl: (url: string) => void;
  reset: () => void;
};

type PreviewForComputation = Omit<DatasetPreviewInput, 'columns'> & {
  columns: PreviewColumn[];
};

const computeFilteredPreview = (
  preview: PreviewForComputation,
  filters: DatasetFilter[]
) => {
  const { filteredRows, filteredRowCount, durationMs } = applyDatasetFilters(
    preview.rows,
    preview.columns,
    filters
  );

  return {
    datasetId: preview.datasetId,
    fileName: preview.fileName,
    rowCount: preview.rowCount,
    truncated: preview.truncated,
    columns: preview.columns,
    rows: preview.rows,
    filteredRows,
    filteredRowCount,
    durationMs
  };
};

const generateFilterId = (): DatasetFilterId => {
  const uuid = typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return uuid;
};

export const useImportStore = create<ImportStoreState>((set) => ({
  phase: 'idle',
  message: null,
  currentFile: null,
  preview: null,
  filters: [],
  filteredRows: [],
  filteredRowCount: 0,
  lastFilterDurationMs: null,
  recentUrls: [],
  startImport: (fileName: string) =>
    set({
      phase: 'loading',
      message: `Loading ${fileName}`,
      currentFile: fileName,
      preview: null,
      filters: [],
      filteredRows: [],
      filteredRowCount: 0,
      lastFilterDurationMs: null
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

      const validFilters = state.filters.filter((filter) =>
        columns.some((column) => column.fieldId === filter.columnId)
      );

      const filteredPreview = computeFilteredPreview(
        {
          ...preview,
          columns
        },
        validFilters
      );

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
          columns,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filters: validFilters,
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs
      };
    }),
  setError: (message) =>
    set((state) => ({
      ...state,
      phase: 'error',
      message
    })),
  overrideColumnType: (fieldId, newType) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const columns = state.preview.columns.map((column) =>
        column.fieldId === fieldId
          ? {
              ...column,
              type: newType
            }
          : column
      );
      const filteredPreview = computeFilteredPreview(
        {
          datasetId: state.preview.datasetId,
          fileName: state.preview.fileName,
          rowCount: state.preview.rowCount,
          truncated: state.preview.truncated,
          columns,
          rows: state.preview.rows
        },
        state.filters
      );
      return {
        ...state,
        preview: {
          ...state.preview,
          columns,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs
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
      const nextColumns = state.preview.columns.map((column) => {
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
      });

      const filteredPreview = computeFilteredPreview(
        {
          datasetId: state.preview.datasetId,
          fileName: state.preview.fileName,
          rowCount: state.preview.rowCount,
          truncated: state.preview.truncated,
          columns: nextColumns,
          rows: state.preview.rows
        },
        state.filters
      );

      return {
        ...state,
        preview: {
          ...state.preview,
          columns: nextColumns,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs
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
  addFilter: (filter) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const nextFilter: DatasetFilter = { ...filter, id: generateFilterId() };
      const nextFilters = [...state.filters, nextFilter];
      const filteredPreview = computeFilteredPreview(
        {
          datasetId: state.preview.datasetId,
          fileName: state.preview.fileName,
          rowCount: state.preview.rowCount,
          truncated: state.preview.truncated,
          columns: state.preview.columns,
          rows: state.preview.rows
        },
        nextFilters
      );
      return {
        ...state,
        filters: nextFilters,
        preview: {
          ...state.preview,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs,
        message:
          filteredPreview.filteredRowCount === 0
            ? 'No data after filter. Clear filters to reset.'
            : state.message
      };
    }),
  updateFilter: (filterId, updates) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      let changed = false;
      const nextFilters = state.filters.map((filter) => {
        if (filter.id !== filterId) {
          return filter;
        }
        changed = true;
        return {
          ...filter,
          ...updates,
          id: filter.id,
          kind: updates.kind ?? filter.kind,
          columnId: updates.columnId ?? filter.columnId
        } as DatasetFilter;
      });
      if (!changed) {
        return state;
      }
      const filteredPreview = computeFilteredPreview(
        {
          datasetId: state.preview.datasetId,
          fileName: state.preview.fileName,
          rowCount: state.preview.rowCount,
          truncated: state.preview.truncated,
          columns: state.preview.columns,
          rows: state.preview.rows
        },
        nextFilters
      );
      return {
        ...state,
        filters: nextFilters,
        preview: {
          ...state.preview,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs,
        message:
          filteredPreview.filteredRowCount === 0
            ? 'No data after filter. Clear filters to reset.'
            : state.message
      };
    }),
  removeFilter: (filterId) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const nextFilters = state.filters.filter((filter) => filter.id !== filterId);
      if (nextFilters.length === state.filters.length) {
        return state;
      }
      const filteredPreview = computeFilteredPreview(
        {
          datasetId: state.preview.datasetId,
          fileName: state.preview.fileName,
          rowCount: state.preview.rowCount,
          truncated: state.preview.truncated,
          columns: state.preview.columns,
          rows: state.preview.rows
        },
        nextFilters
      );
      return {
        ...state,
        filters: nextFilters,
        preview: {
          ...state.preview,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs,
        message:
          filteredPreview.filteredRowCount === 0
            ? 'No data after filter. Clear filters to reset.'
            : state.message
      };
    }),
  clearFilters: () =>
    set((state) => {
      if (!state.preview || state.filters.length === 0) {
        return state;
      }
      return {
        ...state,
        filters: [],
        preview: {
          ...state.preview,
          filteredRows: state.preview.rows,
          filteredRowCount: state.preview.rows.length
        },
        filteredRows: state.preview.rows,
        filteredRowCount: state.preview.rows.length,
        lastFilterDurationMs: null,
        message: null
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
      preview: null,
      filters: [],
      filteredRows: [],
      filteredRowCount: 0,
      lastFilterDurationMs: null
    })
}));

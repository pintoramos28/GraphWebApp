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
import { Parser, type Value } from 'expr-eval';
import { inferValueType } from '@/lib/csvUtils';
import { createWorker } from '@/workers/createWorker';

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

export type DerivedColumn = {
  id: string;
  fieldId: string;
  name: string;
  expression: string;
  lastEvaluatedAt: number;
  sampleValues: unknown[];
  errorCount: number;
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
  derivedColumns: DerivedColumn[];
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
  addDerivedColumn: (name: string, expression: string) => Promise<void>;
  updateDerivedColumn: (columnId: string, name: string, expression: string) => Promise<void>;
  removeDerivedColumn: (columnId: string) => void;
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

const generateDerivedId = () =>
  typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `derived-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const sanitizeVariableName = (input: string, used: Set<string>) => {
  const base = input
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^\d+/, '');
  let name = base.length ? base : 'field';
  let suffix = 1;
  while (used.has(name)) {
    name = `${base || 'field'}_${suffix++}`;
  }
  used.add(name);
  return name;
};

export const buildVariableNameMap = (columns: PreviewColumn[]) => {
  const used = new Set<string>();
  return columns.map((column) => {
    const variable = sanitizeVariableName(column.name, used);
    return {
      fieldId: column.fieldId,
      variable,
      name: column.name
    };
  });
};

type CompiledExpressionResult = {
  values: unknown[];
  errors: number;
  type: string;
  sampleValues: unknown[];
};

const evaluateExpression = (
  rows: Array<Record<string, unknown>>,
  columns: PreviewColumn[],
  expression: string
): CompiledExpressionResult => {
  const parser = new Parser({ allowMemberAccess: false });
  const compiled = parser.parse(expression);
  const variableEntries = buildVariableNameMap(columns);
  const variableMap = new Map(variableEntries.map((entry) => [entry.variable, entry.fieldId]));

  const missingVariables = compiled
    .variables()
    .filter((variable) => !variableMap.has(variable) && variable !== 'PI' && variable !== 'E');

  if (missingVariables.length) {
    throw new Error(`Unknown variables: ${missingVariables.join(', ')}`);
  }

  const values: unknown[] = [];
  let errorCount = 0;

  for (const row of rows) {
    const scope: Record<string, Value> = {};
    variableMap.forEach((fieldId, variable) => {
      scope[variable] = row[fieldId] as Value;
    });
    try {
      const result = compiled.evaluate(scope);
      values.push(result);
    } catch (error) {
      errorCount += 1;
      values.push(null);
    }
  }

  const sample = values.find((value) => value !== null && value !== undefined);
  const type = inferValueType(sample ?? null);

  return {
    values,
    errors: errorCount,
    type,
    sampleValues: values.slice(0, 5)
  };
};

export const useImportStore = create<ImportStoreState>((set, get) => ({
  phase: 'idle',
  message: null,
  currentFile: null,
  preview: null,
  filters: [],
  derivedColumns: [],
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
      derivedColumns: [],
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
        derivedColumns: [],
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
        derivedColumns: state.derivedColumns,
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
  addDerivedColumn: async (name, expression) => {
    const state = get();
    if (!state.preview) {
      throw new Error('Import a dataset before adding expressions.');
    }
    const trimmedName = name.trim();
    if (!trimmedName.length) {
      throw new Error('Expression name cannot be empty.');
    }
    if (state.preview.columns.some((column) => column.name === trimmedName)) {
      throw new Error(`A column named "${trimmedName}" already exists.`);
    }
    const evaluation = evaluateExpression(state.preview.rows, state.preview.columns, expression);

    const fieldIdBase = trimmedName
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^\d+/, 'col_')
      .toLowerCase();
    let fieldId = fieldIdBase || `derived_${state.derivedColumns.length + 1}`;
    const existingFieldIds = new Set(state.preview.columns.map((column) => column.fieldId));
    let suffix = 1;
    while (existingFieldIds.has(fieldId)) {
      fieldId = `${fieldIdBase || 'derived'}_${suffix++}`;
    }

    const newRows = state.preview.rows.map((row, index) => ({
      ...row,
      [fieldId]: evaluation.values[index]
    }));

    const newColumn: PreviewColumn = {
      fieldId,
      name: trimmedName,
      originalName: trimmedName,
      type: evaluation.type,
      originalType: evaluation.type,
      label: trimmedName,
      unit: '',
      hasLabelOverride: false,
      hasUnitOverride: false
    };

    const derivedColumn: DerivedColumn = {
      id: generateDerivedId(),
      fieldId,
      name: trimmedName,
      expression,
      lastEvaluatedAt: Date.now(),
      sampleValues: evaluation.sampleValues,
      errorCount: evaluation.errors
    };

    const filteredPreview = computeFilteredPreview(
      {
        datasetId: state.preview.datasetId,
        fileName: state.preview.fileName,
        rowCount: state.preview.rowCount,
        truncated: state.preview.truncated,
        columns: [...state.preview.columns, newColumn],
        rows: newRows
      },
      state.filters
    );

    set((current) => ({
      ...current,
      derivedColumns: [...current.derivedColumns, derivedColumn],
      preview: current.preview
        ? {
            ...current.preview,
            rows: newRows,
            columns: [...current.preview.columns, newColumn],
            filteredRows: filteredPreview.filteredRows,
            filteredRowCount: filteredPreview.filteredRowCount
          }
        : current.preview,
      filteredRows: filteredPreview.filteredRows,
      filteredRowCount: filteredPreview.filteredRowCount,
      lastFilterDurationMs: filteredPreview.durationMs,
      message:
        evaluation.errors > 0
          ? `${evaluation.errors} rows could not be evaluated; values defaulted to null.`
          : current.message
    }));
  },
  updateDerivedColumn: async (columnId, name, expression) => {
    const state = get();
    if (!state.preview) {
      throw new Error('Import a dataset before editing expressions.');
    }
    const existing = state.derivedColumns.find((column) => column.id === columnId);
    if (!existing) {
      throw new Error('Unknown expression.');
    }
    const trimmedName = name.trim();
    if (!trimmedName.length) {
      throw new Error('Expression name cannot be empty.');
    }
    const existingDuplicate = state.preview.columns.find(
      (column) => column.name === trimmedName && column.fieldId !== existing.fieldId
    );
    if (existingDuplicate) {
      throw new Error(`A column named "${trimmedName}" already exists.`);
    }
    const evaluation = evaluateExpression(state.preview.rows, state.preview.columns.filter((column) => column.fieldId !== existing.fieldId), expression);

    const fieldId = existing.fieldId;
    const newRows = state.preview.rows.map((row, index) => ({
      ...row,
      [fieldId]: evaluation.values[index]
    }));

    const updatedColumn: DerivedColumn = {
      ...existing,
      name: trimmedName,
      expression,
      lastEvaluatedAt: Date.now(),
      sampleValues: evaluation.sampleValues,
      errorCount: evaluation.errors
    };

    const previewColumns = state.preview.columns.map((column) =>
      column.fieldId === fieldId
        ? {
            ...column,
            name: trimmedName,
            label: trimmedName,
            type: evaluation.type,
            originalType: evaluation.type
          }
        : column
    );

    const filteredPreview = computeFilteredPreview(
      {
        datasetId: state.preview.datasetId,
        fileName: state.preview.fileName,
        rowCount: state.preview.rowCount,
        truncated: state.preview.truncated,
        columns: previewColumns,
        rows: newRows
      },
      state.filters
    );

    set((current) => ({
      ...current,
      derivedColumns: current.derivedColumns.map((column) =>
        column.id === columnId ? updatedColumn : column
      ),
      preview: current.preview
        ? {
            ...current.preview,
            rows: newRows,
            columns: previewColumns,
            filteredRows: filteredPreview.filteredRows,
            filteredRowCount: filteredPreview.filteredRowCount
          }
        : current.preview,
      filteredRows: filteredPreview.filteredRows,
      filteredRowCount: filteredPreview.filteredRowCount,
      lastFilterDurationMs: filteredPreview.durationMs,
      message:
        evaluation.errors > 0
          ? `${evaluation.errors} rows could not be evaluated; values defaulted to null.`
          : current.message
    }));
  },
  removeDerivedColumn: (columnId) =>
    set((state) => {
      if (!state.preview) {
        return state;
      }
      const derivedColumn = state.derivedColumns.find((column) => column.id === columnId);
      if (!derivedColumn) {
        return state;
      }
      const { fieldId } = derivedColumn;
      const columns = state.preview.columns.filter((column) => column.fieldId !== fieldId);
      const rows = state.preview.rows.map((row) => {
        const { [fieldId]: _, ...rest } = row;
        return rest;
      });
      const filteredPreview = computeFilteredPreview(
        {
          datasetId: state.preview.datasetId,
          fileName: state.preview.fileName,
          rowCount: state.preview.rowCount,
          truncated: state.preview.truncated,
          columns,
          rows
        },
        state.filters
      );
      return {
        ...state,
        derivedColumns: state.derivedColumns.filter((column) => column.id !== columnId),
        preview: {
          ...state.preview,
          columns,
          rows,
          filteredRows: filteredPreview.filteredRows,
          filteredRowCount: filteredPreview.filteredRowCount
        },
        filteredRows: filteredPreview.filteredRows,
        filteredRowCount: filteredPreview.filteredRowCount,
        lastFilterDurationMs: filteredPreview.durationMs
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
      derivedColumns: [],
      filteredRows: [],
      filteredRowCount: 0,
      lastFilterDurationMs: null
    })
}));

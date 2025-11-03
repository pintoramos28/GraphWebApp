import type { PreviewColumn } from '@/state/importStore';

export type DatasetFilterId = string;

type FilterBase = {
  id: DatasetFilterId;
  columnId: string;
};

export type RangeFilter = FilterBase & {
  kind: 'range';
  min?: number | null;
  max?: number | null;
};

export type EqualsFilter = FilterBase & {
  kind: 'equals';
  value: string | number | boolean | null;
};

export type ContainsFilter = FilterBase & {
  kind: 'contains';
  value: string;
  caseSensitive?: boolean;
};

export type DateRangeFilter = FilterBase & {
  kind: 'dateRange';
  start?: string | null;
  end?: string | null;
};

export type OneOfFilter = FilterBase & {
  kind: 'oneOf';
  values: Array<string | number | boolean>;
};

export type DatasetFilter =
  | RangeFilter
  | EqualsFilter
  | ContainsFilter
  | DateRangeFilter
  | OneOfFilter;
export type NewDatasetFilter =
  | Omit<RangeFilter, 'id'>
  | Omit<EqualsFilter, 'id'>
  | Omit<ContainsFilter, 'id'>
  | Omit<DateRangeFilter, 'id'>
  | Omit<OneOfFilter, 'id'>;

type ColumnLookup = Record<string, PreviewColumn | undefined>;

const normalizeValue = (value: unknown, column: PreviewColumn | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!column) {
    return value;
  }
  switch (column.type) {
    case 'number':
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      if (typeof value === 'string' && value.trim().length) {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    case 'boolean':
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
          return true;
        }
        if (normalized === 'false' || normalized === '0') {
          return false;
        }
      }
      return null;
    case 'datetime':
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
      }
      if (typeof value === 'string' && value.trim().length) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    default:
      return value;
  }
};

const matchesRange = (value: unknown, filter: RangeFilter, column: PreviewColumn | undefined) => {
  const normalized = normalizeValue(value, column);
  if (normalized === null) {
    return false;
  }
  if (typeof normalized !== 'number') {
    return false;
  }
  if (filter.min !== null && filter.min !== undefined && normalized < filter.min) {
    return false;
  }
  if (filter.max !== null && filter.max !== undefined && normalized > filter.max) {
    return false;
  }
  return true;
};

const matchesEquals = (value: unknown, filter: EqualsFilter, column: PreviewColumn | undefined) => {
  if (filter.value === null || filter.value === undefined) {
    return value === null || value === undefined;
  }
  const normalized = normalizeValue(value, column);
  if (normalized === null) {
    return false;
  }
  if (column?.type === 'number') {
    return Number(normalized) === Number(filter.value);
  }
  if (column?.type === 'boolean') {
    return Boolean(normalized) === Boolean(filter.value);
  }
  if (column?.type === 'datetime') {
    const normalizedFilter =
      typeof filter.value === 'string' ? new Date(filter.value) : filter.value;
    if (normalizedFilter instanceof Date && normalizedFilter.toString() !== 'Invalid Date') {
      return (
        normalized instanceof Date &&
        normalized.getTime() === normalizedFilter.getTime()
      );
    }
    return false;
  }
  return String(normalized).toLowerCase() === String(filter.value).toLowerCase();
};

const matchesContains = (value: unknown, filter: ContainsFilter) => {
  if (value === null || value === undefined) {
    return false;
  }
  const source = String(value);
  const needle = filter.caseSensitive ? filter.value : filter.value.toLowerCase();
  if (!needle.length) {
    return true;
  }
  return filter.caseSensitive
    ? source.includes(filter.value)
    : source.toLowerCase().includes(needle);
};

const matchesDateRange = (value: unknown, filter: DateRangeFilter, column: PreviewColumn | undefined) => {
  const normalized = normalizeValue(value, column);
  if (!(normalized instanceof Date)) {
    return false;
  }
  if (filter.start) {
    const start = new Date(filter.start);
    if (!Number.isNaN(start.getTime()) && normalized < start) {
      return false;
    }
  }
  if (filter.end) {
    const end = new Date(filter.end);
    if (!Number.isNaN(end.getTime()) && normalized > end) {
      return false;
    }
  }
  return true;
};

const matchesOneOf = (value: unknown, filter: OneOfFilter, column: PreviewColumn | undefined) => {
  if (!filter.values.length) {
    return true;
  }
  const normalized = normalizeValue(value, column);
  if (normalized === null || normalized === undefined) {
    return false;
  }
  return filter.values.some((candidate) => {
    if (column?.type === 'number') {
      return Number(normalized) === Number(candidate);
    }
    if (column?.type === 'boolean') {
      return Boolean(normalized) === Boolean(candidate);
    }
    if (column?.type === 'datetime') {
      const candidateDate = new Date(String(candidate));
      return normalized instanceof Date && !Number.isNaN(candidateDate.getTime()) && normalized.getTime() === candidateDate.getTime();
    }
    return String(normalized) === String(candidate);
  });
};

export const rowMatchesFilters = (
  row: Record<string, unknown>,
  filters: DatasetFilter[],
  columns: ColumnLookup
) => {
  if (!filters.length) {
    return true;
  }
  return filters.every((filter) => {
    const value = row[filter.columnId];
    const column = columns[filter.columnId];
    switch (filter.kind) {
      case 'range':
        return matchesRange(value, filter, column);
      case 'equals':
        return matchesEquals(value, filter, column);
      case 'contains':
        return matchesContains(value, filter);
    case 'dateRange':
      return matchesDateRange(value, filter, column);
    case 'oneOf':
      return matchesOneOf(value, filter, column);
    default:
      return true;
  }
});
};

export const applyDatasetFilters = (
  rows: Array<Record<string, unknown>>,
  columns: PreviewColumn[],
  filters: DatasetFilter[]
) => {
  if (!filters.length) {
    return {
      filteredRows: rows,
      filteredRowCount: rows.length,
      durationMs: 0
    };
  }

  const start = performance.now();
  const columnLookup: ColumnLookup = columns.reduce<ColumnLookup>((acc, column) => {
    acc[column.fieldId] = column;
    return acc;
  }, {});

  const filteredRows = rows.filter((row) => rowMatchesFilters(row, filters, columnLookup));
  const durationMs = performance.now() - start;

  return {
    filteredRows,
    filteredRowCount: filteredRows.length,
    durationMs
  };
};

export const describeFilter = (filter: DatasetFilter, column: PreviewColumn | undefined): string => {
  const columnName = column?.name ?? filter.columnId;
  switch (filter.kind) {
    case 'range': {
      const parts: string[] = [];
      if (filter.min !== undefined && filter.min !== null) {
        parts.push(`≥ ${filter.min}`);
      }
      if (filter.max !== undefined && filter.max !== null) {
        parts.push(`≤ ${filter.max}`);
      }
      return `${columnName}: ${parts.join(' and ') || 'Range'}`;
    }
    case 'equals':
      return `${columnName} = ${filter.value ?? '∅'}`;
    case 'contains':
      return `${columnName} contains "${filter.value}"`;
    case 'dateRange': {
      const parts: string[] = [];
      if (filter.start) {
        parts.push(`≥ ${new Date(filter.start).toLocaleString()}`);
      }
      if (filter.end) {
        parts.push(`≤ ${new Date(filter.end).toLocaleString()}`);
      }
      return `${columnName}: ${parts.join(' and ') || 'Date range'}`;
    }
    case 'oneOf': {
      const values = filter.values.map((value) => String(value)).join(', ');
      return `${columnName} ∈ {${values || '—'}}`;
    }
    default:
      return columnName;
  }
};

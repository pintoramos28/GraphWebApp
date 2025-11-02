import type { PreviewColumn } from '@/state/importStore';

export type ColumnType = 'string' | 'number' | 'boolean' | 'datetime' | 'object' | 'null';

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseBoolean = (value: unknown): boolean | null => {
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
};

const parseDateTime = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const validateColumnType = (
  rows: Array<Record<string, unknown>>,
  columnName: string,
  targetType: ColumnType,
  options: { sampleSize?: number } = {}
): { valid: boolean; invalidSample?: unknown[] } => {
  const { sampleSize = 25 } = options;
  const sample = rows.slice(0, sampleSize);
  const invalidValues: unknown[] = [];

  for (const row of sample) {
    const value = row[columnName];
    if (value === null || value === undefined || value === '') {
      continue;
    }

    let converted: unknown;
    switch (targetType) {
      case 'string':
        converted = String(value);
        break;
      case 'number':
        converted = parseNumber(value);
        break;
      case 'boolean':
        converted = parseBoolean(value);
        break;
      case 'datetime':
        converted = parseDateTime(value);
        break;
      case 'object':
        converted = typeof value === 'object' ? value : null;
        break;
      case 'null':
        converted = value === null ? null : null;
        break;
      default:
        converted = value;
        break;
    }

    if (converted === null) {
      invalidValues.push(value);
      if (invalidValues.length >= 5) {
        break;
      }
    }
  }

  return {
    valid: invalidValues.length === 0,
    invalidSample: invalidValues.length ? invalidValues : undefined
  };
};

export const sanitizeColumnType = (input: string): ColumnType => {
  const normalized = input.toLowerCase();
  switch (normalized) {
    case 'number':
    case 'boolean':
    case 'datetime':
    case 'object':
    case 'null':
      return normalized;
    default:
      return 'string';
  }
};

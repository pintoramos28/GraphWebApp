import { describe, expect, it } from 'vitest';

import {
  applyDatasetFilters,
  rowMatchesFilters,
  describeFilter,
  type DatasetFilter
} from '@/lib/datasetFilters';
import type { PreviewColumn } from '@/state/importStore';

const columns: PreviewColumn[] = [
  {
    fieldId: 'value',
    name: 'value',
    originalName: 'value',
    type: 'number',
    originalType: 'number',
    semanticType: 'continuous',
    defaultSemanticType: 'continuous',
    hasSemanticOverride: false,
    label: 'Value',
    unit: '',
    hasLabelOverride: false,
    hasUnitOverride: false
  },
  {
    fieldId: 'category',
    name: 'category',
    originalName: 'category',
    type: 'string',
    originalType: 'string',
    semanticType: 'categorical',
    defaultSemanticType: 'categorical',
    hasSemanticOverride: false,
    label: 'Category',
    unit: '',
    hasLabelOverride: false,
    hasUnitOverride: false
  },
  {
    fieldId: 'timestamp',
    name: 'timestamp',
    originalName: 'timestamp',
    type: 'datetime',
    originalType: 'datetime',
    semanticType: 'temporal',
    defaultSemanticType: 'temporal',
    hasSemanticOverride: false,
    label: 'Timestamp',
    unit: '',
    hasLabelOverride: false,
    hasUnitOverride: false
  }
];

const rows = [
  { value: 10, category: 'Alpha', timestamp: '2024-01-01T00:00:00Z' },
  { value: 15, category: 'Beta', timestamp: '2024-01-02T00:00:00Z' },
  { value: 20, category: 'alpha', timestamp: '2024-02-01T00:00:00Z' }
];

describe('datasetFilters', () => {
  it('matches range filters', () => {
    const columnLookup = Object.fromEntries(columns.map((c) => [c.fieldId, c]));
    const filters: DatasetFilter[] = [
      { id: 'f1', columnId: 'value', kind: 'range', min: 12, max: 18 }
    ];
    expect(rowMatchesFilters(rows[0]!, filters, columnLookup)).toBe(false);
    expect(rowMatchesFilters(rows[1]!, filters, columnLookup)).toBe(true);
  });

  it('matches equals filters case-insensitively for strings', () => {
    const columnLookup = Object.fromEntries(columns.map((c) => [c.fieldId, c]));
    const filters: DatasetFilter[] = [
      { id: 'f1', columnId: 'category', kind: 'equals', value: 'alpha' }
    ];
    expect(rowMatchesFilters(rows[0]!, filters, columnLookup)).toBe(true);
    expect(rowMatchesFilters(rows[1]!, filters, columnLookup)).toBe(false);
    expect(rowMatchesFilters(rows[2]!, filters, columnLookup)).toBe(true);
  });

  it('matches contains filters', () => {
    const columnLookup = Object.fromEntries(columns.map((c) => [c.fieldId, c]));
    const filters: DatasetFilter[] = [
      { id: 'f1', columnId: 'category', kind: 'contains', value: 'alp' }
    ];
    expect(rowMatchesFilters(rows[0]!, filters, columnLookup)).toBe(true);
    expect(rowMatchesFilters(rows[1]!, filters, columnLookup)).toBe(false);
  });

  it('matches date range filters', () => {
    const columnLookup = Object.fromEntries(columns.map((c) => [c.fieldId, c]));
    const filters: DatasetFilter[] = [
      { id: 'f1', columnId: 'timestamp', kind: 'dateRange', start: '2024-01-02T00:00:00Z', end: '2024-02-01T00:00:00Z' }
    ];
    expect(rowMatchesFilters(rows[0]!, filters, columnLookup)).toBe(false);
    expect(rowMatchesFilters(rows[1]!, filters, columnLookup)).toBe(true);
    expect(rowMatchesFilters(rows[2]!, filters, columnLookup)).toBe(true);
  });

  it('applies filters to dataset', () => {
    const { filteredRows, filteredRowCount } = applyDatasetFilters(rows, [...columns], [
      { id: 'f1', columnId: 'value', kind: 'range', min: 12 },
      { id: 'f2', columnId: 'category', kind: 'contains', value: 'beta' }
    ]);
    expect(filteredRowCount).toBe(1);
    expect(filteredRows[0]?.category).toBe('Beta');
  });

  it('applies oneOf filters to dataset', () => {
    const { filteredRows, filteredRowCount } = applyDatasetFilters(rows, [...columns], [
      { id: 'f1', columnId: 'category', kind: 'oneOf', values: ['Alpha', 'Beta'] }
    ]);
    expect(filteredRowCount).toBe(2);
    expect(filteredRows.map((row) => row.category)).toEqual(['Alpha', 'Beta']);
  });

  it('describes filters', () => {
    const description = describeFilter(
      { id: 'f1', columnId: 'value', kind: 'range', min: 5, max: 10 },
      columns[0]
    );
    expect(description).toContain('value');
    expect(description).toContain('≥ 5');
    expect(description).toContain('≤ 10');
  });

  it('describes oneOf filters', () => {
    const description = describeFilter(
      { id: 'f1', columnId: 'category', kind: 'oneOf', values: ['Alpha', 'Beta'] },
      columns[1]
    );
    expect(description).toContain('Alpha');
    expect(description).toContain('Beta');
  });
});

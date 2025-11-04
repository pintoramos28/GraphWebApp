import { describe, expect, it, beforeEach } from 'vitest';
import { createDefaultLabel } from '@/lib/fieldMetadata';
import { useImportStore, type DatasetPreviewInput } from '@/state/importStore';

const defaultColumns = () => [
  { fieldId: 'team', name: 'team', originalName: 'team', type: 'string' },
  { fieldId: 'hours', name: 'hours', originalName: 'hours', type: 'number' }
];

const createPreview = (overrides: Partial<DatasetPreviewInput>): DatasetPreviewInput => ({
  datasetId: overrides.datasetId ?? 'ds-1',
  fileName: overrides.fileName ?? 'data.csv',
  rowCount: overrides.rowCount ?? 3,
  truncated: overrides.truncated ?? false,
  columns: overrides.columns ?? defaultColumns(),
  rows:
    overrides.rows ?? [
      { team: 'Aurora', hours: 10 },
      { team: 'Nimbus', hours: 12 }
    ]
});

describe('importStore columns', () => {
  beforeEach(() => {
    useImportStore.getState().reset();
  });

  it('tracks original types and overrides', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().overrideColumnType('hours', 'string');

    useImportStore.getState().setPreview(
      createPreview({ columns: defaultColumns() })
    );

    const columns = useImportStore.getState().preview?.columns ?? [];
    const hoursColumn = columns.find((column) => column.fieldId === 'hours');
    expect(hoursColumn?.originalType).toEqual('number');
    expect(hoursColumn?.type).toEqual('string');
  });

  it('resets overrides when requested type matches original', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().overrideColumnType('team', 'boolean');
    useImportStore.getState().overrideColumnType('team', 'string');

    const column = useImportStore.getState().preview?.columns.find((c) => c.fieldId === 'team');
    expect(column?.type).toEqual('string');
    expect(column?.originalType).toEqual('string');
  });

  it('renames columns and recalculates default labels when no override is set', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().renameColumn('team', 'Squad Name');

    const column = useImportStore.getState().preview?.columns.find((c) => c.fieldId === 'team');
    expect(column?.name).toEqual('Squad Name');
    expect(column?.label).toEqual(createDefaultLabel('Squad Name'));
    expect(column?.hasLabelOverride).toBe(false);
  });

  it('preserves manual label overrides when renaming', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().setColumnLabel('team', 'Primary Team');
    useImportStore.getState().renameColumn('team', 'Squad Name');

    const column = useImportStore.getState().preview?.columns.find((c) => c.fieldId === 'team');
    expect(column?.name).toEqual('Squad Name');
    expect(column?.label).toEqual('Primary Team');
    expect(column?.hasLabelOverride).toBe(true);
  });

  it('tracks unit overrides and clears them when emptied', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().setColumnUnit('hours', 'hrs');

    let column = useImportStore.getState().preview?.columns.find((c) => c.fieldId === 'hours');
    expect(column?.unit).toEqual('hrs');
    expect(column?.hasUnitOverride).toBe(true);

    useImportStore.getState().setColumnUnit('hours', '   ');
    column = useImportStore.getState().preview?.columns.find((c) => c.fieldId === 'hours');
    expect(column?.unit).toEqual('');
    expect(column?.hasUnitOverride).toBe(false);
  });

  it('tracks recent URLs with uniqueness', () => {
    useImportStore.getState().addRecentUrl('https://example.com/a.csv');
    useImportStore.getState().addRecentUrl('https://example.com/b.csv');
    useImportStore.getState().addRecentUrl('https://example.com/a.csv');

    const recent = useImportStore.getState().recentUrls;
    expect(recent[0]).toEqual('https://example.com/a.csv');
    expect(recent[1]).toEqual('https://example.com/b.csv');
  });

  it('filters datasets via equals filter', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().addFilter({ columnId: 'team', kind: 'equals', value: 'Nimbus' });

    const state = useImportStore.getState();
    expect(state.filteredRowCount).toEqual(1);
    expect(state.filteredRows[0]?.team).toEqual('Nimbus');

    useImportStore.getState().clearFilters();
    expect(useImportStore.getState().filteredRowCount).toEqual(2);
  });

  it('filters datasets via value selection filter', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().addFilter({ columnId: 'team', kind: 'oneOf', values: ['Aurora'] });

    const state = useImportStore.getState();
    expect(state.filteredRowCount).toEqual(1);
    expect(state.filteredRows[0]?.team).toEqual('Aurora');

    useImportStore.getState().clearFilters();
    expect(useImportStore.getState().filteredRowCount).toEqual(2);
  });

  it('adds derived columns via expressions', async () => {
    useImportStore.getState().setPreview(createPreview({}));
    await useImportStore.getState().addDerivedColumn('HoursSquared', 'hours * hours');

    const state = useImportStore.getState();
    const derivedColumn = state.preview?.columns.find((column) => column.name === 'HoursSquared');
    expect(derivedColumn).toBeDefined();
    expect(state.preview?.rows[0]?.[derivedColumn!.fieldId]).toEqual(100);
    expect(state.derivedColumns[0]?.sampleValues[0]).toEqual(100);

    useImportStore.getState().removeDerivedColumn(state.derivedColumns[0]!.id);
    expect(useImportStore.getState().preview?.columns.find((column) => column.name === 'HoursSquared')).toBeUndefined();
  });

  it('updates derived columns via expressions', async () => {
    useImportStore.getState().setPreview(createPreview({}));
    await useImportStore.getState().addDerivedColumn('HoursSquared', 'hours * hours');
    const derivedId = useImportStore.getState().derivedColumns[0]!.id;

    await useImportStore.getState().updateDerivedColumn(derivedId, 'HoursCubed', 'hours * hours * hours');

    const state = useImportStore.getState();
    const derivedColumn = state.preview?.columns.find((column) => column.fieldId === state.derivedColumns[0]!.fieldId);
    expect(derivedColumn?.name).toEqual('HoursCubed');
    expect(state.preview?.rows[0]?.[derivedColumn!.fieldId]).toEqual(1000);
  });

  it('prevents duplicate derived column names', async () => {
    useImportStore.getState().setPreview(createPreview({}));
    await expect(
      useImportStore.getState().addDerivedColumn('team', 'hours * 2')
    ).rejects.toThrow('A column named "team" already exists.');
  });
});

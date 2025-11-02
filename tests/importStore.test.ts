import { describe, expect, it, beforeEach } from 'vitest';
import { useImportStore, type DatasetPreview } from '@/state/importStore';

type PreviewInput = Pick<DatasetPreview, 'datasetId' | 'fileName' | 'rowCount' | 'truncated' | 'columns' | 'rows'>;

const createPreview = (overrides: Partial<PreviewInput>): PreviewInput => ({
  datasetId: overrides.datasetId ?? 'ds-1',
  fileName: overrides.fileName ?? 'data.csv',
  rowCount: overrides.rowCount ?? 3,
  truncated: overrides.truncated ?? false,
  columns: overrides.columns ?? [
    { name: 'team', type: 'string' },
    { name: 'hours', type: 'number' }
  ],
  rows: overrides.rows ?? [
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
      createPreview({ columns: [{ name: 'team', type: 'string' }, { name: 'hours', type: 'number' }] })
    );

    const columns = useImportStore.getState().preview?.columns ?? [];
    const hoursColumn = columns.find((column) => column.name === 'hours');
    expect(hoursColumn?.originalType).toEqual('number');
    expect(hoursColumn?.type).toEqual('string');
  });

  it('resets overrides when requested type matches original', () => {
    useImportStore.getState().setPreview(createPreview({}));
    useImportStore.getState().overrideColumnType('team', 'boolean');
    useImportStore.getState().overrideColumnType('team', 'string');

    const column = useImportStore.getState().preview?.columns.find((c) => c.name === 'team');
    expect(column?.type).toEqual('string');
    expect(column?.originalType).toEqual('string');
  });
});

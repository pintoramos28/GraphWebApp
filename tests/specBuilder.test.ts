import { describe, expect, it } from 'vitest';
import { buildEncodingSpec } from '@/charts/specBuilder';
import type { EncodingDataset } from '@/lib/encodingTypes';
import type { ShelfAssignments } from '@/state/appStore';

const SAMPLE_DATASET: EncodingDataset = {
  id: 'ds-1',
  name: 'Sample',
  fields: [
    {
      fieldId: 'x',
      name: 'hours',
      label: 'Hours',
      type: 'number',
      semanticType: 'continuous'
    },
    {
      fieldId: 'y',
      name: 'defects',
      label: 'Defects',
      type: 'number',
      semanticType: 'continuous'
    },
    {
      fieldId: 'team',
      name: 'team',
      label: 'Team',
      type: 'string',
      semanticType: 'categorical'
    }
  ],
  rows: [
    { x: 120, y: 4, team: 'Aurora' },
    { x: null, y: 5, team: 'Nimbus' },
    { x: 150, y: null, team: 'Zenith' }
  ]
};

describe('buildEncodingSpec', () => {
  it('returns null when either axis shelf is missing', () => {
    const spec = buildEncodingSpec(SAMPLE_DATASET, { x: 'x' });
    expect(spec).toBeNull();
  });

  it('creates scatter spec with null filters for both axes', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y',
      color: 'team'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves);
    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }

    expect(spec.mark).toEqual({ type: 'point', filled: true });
    expect(spec.transform).toEqual([
      { filter: 'datum["x"] != null' },
      { filter: 'datum["y"] != null' }
    ]);

    const encoding = spec.encoding!;
    expect(encoding.x).toMatchObject({ field: 'x', type: 'quantitative' });
    expect(encoding.y).toMatchObject({ field: 'y', type: 'quantitative' });
    expect(encoding.color).toMatchObject({ field: 'team', type: 'nominal' });
    expect(Array.isArray(encoding.tooltip)).toBe(true);

    const tooltipFields = (encoding.tooltip as Array<{ field: string }>).map((entry) => entry.field);
    expect(tooltipFields).toContain('x');
    expect(tooltipFields).toContain('y');
    expect(tooltipFields).toContain('team');
  });
});

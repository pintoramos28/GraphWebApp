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
    },
    {
      fieldId: 'intensity',
      name: 'intensity',
      label: 'Intensity',
      type: 'number',
      semanticType: 'continuous'
    }
  ],
  rows: [
    { x: 120, y: 4, team: 'Aurora', intensity: 0.6 },
    { x: null, y: 5, team: 'Nimbus', intensity: 0.9 },
    { x: 150, y: null, team: 'Zenith', intensity: 0.3 }
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

    const unitSpec = spec as any;
    expect(unitSpec.mark).toEqual({ type: 'point', filled: true });
    expect(unitSpec.transform).toEqual([
      { filter: 'datum["x"] != null' },
      { filter: 'datum["y"] != null' }
    ]);

    const encoding = unitSpec.encoding;
    expect(encoding.x).toMatchObject({ field: 'x', type: 'quantitative' });
    expect(encoding.y).toMatchObject({ field: 'y', type: 'quantitative' });
    expect(encoding.color).toMatchObject({ field: 'team', type: 'nominal' });
    expect(Array.isArray(encoding.tooltip)).toBe(true);

    const tooltipFields = (encoding.tooltip as Array<{ field: string }>).map((entry) => entry.field);
    expect(tooltipFields).toContain('x');
    expect(tooltipFields).toContain('y');
    expect(tooltipFields).toContain('team');
  });

  it('configures encodings and legends for color, size, and shape when compatible', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y',
      color: 'team',
      size: 'intensity',
      shape: 'team',
      opacity: 'intensity'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves);
    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const encoding = (spec as any).encoding;
    expect(encoding.color).toMatchObject({
      field: 'team',
      type: 'nominal',
      legend: { title: 'Team', orient: 'right' }
    });
    expect(encoding.size).toMatchObject({
      field: 'intensity',
      type: 'quantitative',
      legend: { title: 'Intensity' }
    });
    expect(encoding.opacity).toMatchObject({
      field: 'intensity',
      type: 'quantitative'
    });
    expect(encoding.shape).toMatchObject({
      field: 'team',
      type: 'nominal'
    });
  });

  it('omits incompatible encodings (e.g., shape with continuous field)', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y',
      shape: 'intensity'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves);
    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const encoding = (spec as any).encoding;
    expect(encoding.shape).toBeUndefined();
  });

  it('applies deterministic jitter offsets when enabled', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves, {
      jitter: { enabled: true, magnitude: 0.5, seed: 42 }
    });
    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const unitSpec = spec as any;
    expect(Array.isArray(unitSpec.transform)).toBe(true);
    if (!Array.isArray(unitSpec.transform)) {
      return;
    }
    expect(unitSpec.transform).toHaveLength(7);
    expect(unitSpec.transform[2]).toEqual({
      window: [{ op: 'row_number', as: '__jitter_index' }]
    });
    expect(unitSpec.transform[3]).toMatchObject({
      joinaggregate: expect.arrayContaining([
        expect.objectContaining({ op: 'min', field: 'x' }),
        expect.objectContaining({ op: 'max', field: 'x' })
      ])
    });
    expect(unitSpec.transform[4]).toMatchObject({
      calculate: expect.stringContaining('__x_max')
    });
    expect(unitSpec.transform[5]).toMatchObject({
      joinaggregate: expect.arrayContaining([
        expect.objectContaining({ op: 'min', field: 'y' }),
        expect.objectContaining({ op: 'max', field: 'y' })
      ])
    });
    expect(unitSpec.transform[6]).toMatchObject({
      calculate: expect.stringContaining('__jitter_index')
    });
    expect(unitSpec.encoding.x.field).toBe('__jitter_x');
    expect(unitSpec.encoding.y.field).toBe('__jitter_y');
  });
});

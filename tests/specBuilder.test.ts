import { describe, expect, it } from 'vitest';
import { buildEncodingSpec } from '@/charts/specBuilder';
import type { EncodingDataset } from '@/lib/encodingTypes';
import type { Transform } from 'vega-lite/build/src/transform';
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
    },
    {
      fieldId: 'y_lower',
      name: 'y_lower',
      label: 'Defects Lower',
      type: 'number',
      semanticType: 'continuous'
    },
    {
      fieldId: 'y_upper',
      name: 'y_upper',
      label: 'Defects Upper',
      type: 'number',
      semanticType: 'continuous'
    }
  ],
  rows: [
    { x: 120, y: 4, team: 'Aurora', intensity: 0.6, y_lower: 3.5, y_upper: 4.6 },
    { x: 135, y: 5, team: 'Nimbus', intensity: 0.9, y_lower: 4.3, y_upper: 5.4 },
    { x: 150, y: 6, team: 'Zenith', intensity: 0.3, y_lower: 2.1, y_upper: 3.1 }
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
    expect(Array.isArray(unitSpec.layer)).toBe(true);
    expect(unitSpec.layer[0].mark).toEqual({ type: 'point', filled: true });
    expect(unitSpec.transform).toEqual([
      { filter: 'datum["x"] != null' },
      { filter: 'datum["y"] != null' }
    ]);

    const encoding = unitSpec.layer[0].encoding;
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
    const encoding = (spec as any).layer[0].encoding;
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
    const encoding = (spec as any).layer[0].encoding;
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
    expect(unitSpec.layer[0].encoding.x.field).toBe('__jitter_x');
    expect(unitSpec.layer[0].encoding.y.field).toBe('__jitter_y');
  });

  it('adds regression trendline layer with legend label', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves, {
      trendline: { type: 'polynomial', polynomialOrder: 3 }
    });
    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const unitSpec = spec as any;
    const lineLayer = (unitSpec.layer as any[]).find((layer) => layer.mark?.type === 'line');
    expect(lineLayer).toBeTruthy();
    const regressionTransform = (lineLayer.transform as Transform[]).find((transform) => 'regression' in transform) as any;
    expect(regressionTransform).toMatchObject({
      regression: 'y',
      on: 'x',
      order: 3
    });
    expect(regressionTransform.params).toBeUndefined();
    const statsLayer = (unitSpec.layer as any[]).find((layer) => layer.mark?.opacity === 0);
    expect(statsLayer).toBeTruthy();
    const statsRegression = (statsLayer.transform as Transform[]).find((transform) => 'regression' in transform) as any;
    expect(statsRegression).toMatchObject({ regression: 'y', on: 'x', params: true, order: 3 });
  });

  it('adds loess trendline with bandwidth in label', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves, {
      trendline: { type: 'loess', bandwidth: 0.6 }
    });
    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const unitSpec = spec as any;
    const lineLayer = (unitSpec.layer as any[]).find((layer) => layer.mark?.type === 'line');
    expect(lineLayer).toBeTruthy();
    const loessTransform = (lineLayer.transform as Transform[]).find((transform) => 'loess' in transform) as any;
    expect(loessTransform).toMatchObject({
      loess: 'y',
      on: 'x',
      bandwidth: 0.6
    });
    expect(lineLayer.mark.strokeDash).toEqual([6, 3]);
    const statsLayer = (unitSpec.layer as any[]).find((layer) => layer.mark?.opacity === 0);
    expect(statsLayer).toBeTruthy();
    const loessStats = (statsLayer.transform as Transform[]).find((transform) => 'loess' in transform) as any;
    expect(loessStats).toMatchObject({ loess: 'y', on: 'x', params: true, bandwidth: 0.6 });
  });

  it('keeps scatter legend separate from trendline legend when color encoding is used', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y',
      color: 'team'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves, {
      trendline: { type: 'linear' }
    });

    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const unitSpec = spec as any;
    expect(unitSpec.resolve?.scale?.color).toBe('independent');
  });

  it('adds field-sourced error bars when configured', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves, {
      errorBars: {
        mode: 'fields',
        axis: 'y',
        lowerFieldId: 'y_lower',
        upperFieldId: 'y_upper'
      }
    });

    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }

    const unitSpec = spec as any;
    expect(unitSpec.layer).toHaveLength(2);
    const errorLayer = unitSpec.layer[0];
    expect(errorLayer.name).toBe('scatter-errorbars-fields');
    expect(errorLayer.mark.type).toBe('errorbar');
    expect(errorLayer.encoding.y.field).toBe('y_lower');
    expect(errorLayer.encoding.y2.field).toBe('y_upper');
    expect(unitSpec.layer[1].mark.type).toBe('point');
  });

  it('adds computed statistic error bars for confidence interval mode', () => {
    const shelves: ShelfAssignments = {
      x: 'x',
      y: 'y'
    };

    const spec = buildEncodingSpec(SAMPLE_DATASET, shelves, {
      errorBars: {
        mode: 'ci',
        axis: 'y',
        lowerFieldId: null,
        upperFieldId: null
      }
    });

    expect(spec).not.toBeNull();
    if (!spec) {
      return;
    }
    const unitSpec = spec as any;
    expect(unitSpec.layer).toHaveLength(2);
    const errorLayer = unitSpec.layer[0];
    expect(errorLayer.name).toBe('scatter-errorbars-statistic');
    expect(errorLayer.mark.extent).toBe('ci');
    expect(errorLayer.encoding.x.field).toBe('x');
    expect(unitSpec.layer[1].mark.type).toBe('point');
  });
});

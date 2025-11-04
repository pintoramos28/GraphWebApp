import type { VisualizationSpec } from 'vega-embed';
import type { Transform } from 'vega-lite/build/src/transform';
import type { EncodingDataset, EncodingField } from '@/lib/encodingTypes';
import type { ShelfAssignments, ShelfKey } from '@/state/appStore';
import { formatFieldTitle, mapToVegaType } from '@/lib/shelfConfig';

const SECONDARY_CHANNELS: ShelfKey[] = ['color', 'size', 'shape', 'opacity', 'row', 'column'];

type ScatterSpecOptions = {
  jitter?: {
    enabled: boolean;
    magnitude: number;
    seed: number;
  };
};

const buildTooltipFields = (
  fields: EncodingField[]
): Array<{ field: string; type: 'quantitative' | 'nominal' | 'temporal'; title: string }> =>
  fields.map((field) => ({
    field: field.fieldId,
    type: mapToVegaType(field),
    title: formatFieldTitle(field)
  }));

const buildAxisEncoding = (field: EncodingField) => {
  const type = mapToVegaType(field);
  return {
    field: field.fieldId,
    type,
    title: formatFieldTitle(field),
    axis: {
      title: formatFieldTitle(field)
    },
    scale: type === 'quantitative' ? { zero: false } : undefined
  };
};

const buildGenericEncoding = (field: EncodingField, channel: ShelfKey) => {
  const base = {
    field: field.fieldId,
    type: mapToVegaType(field)
  };
  const semanticType = field.semanticType;

  if (channel === 'color') {
    if (semanticType === 'continuous') {
      return {
        ...base,
        type: 'quantitative',
        title: formatFieldTitle(field),
        legend: { title: formatFieldTitle(field), orient: 'right' },
        scale: { scheme: 'viridis' }
      };
    }
    return {
      ...base,
      type: 'nominal',
      title: formatFieldTitle(field),
      legend: { title: formatFieldTitle(field), orient: 'right' },
      scale: { scheme: 'tableau10' }
    };
  }

  if (channel === 'size') {
    if (semanticType !== 'continuous') {
      return undefined;
    }
    return {
      ...base,
      type: 'quantitative',
      legend: { title: formatFieldTitle(field) },
      scale: {
        type: 'sqrt',
        rangeMin: 40,
        rangeMax: 600,
        zero: false
      }
    };
  }

  if (channel === 'opacity') {
    if (semanticType !== 'continuous') {
      return undefined;
    }
    return {
      ...base,
      type: 'quantitative',
      legend: { title: formatFieldTitle(field) },
      scale: {
        type: 'linear',
        range: [0.2, 1],
        clamp: true
      }
    };
  }

  if (channel === 'shape') {
    if (semanticType !== 'categorical') {
      return undefined;
    }
    return {
      ...base,
      type: 'nominal',
      legend: { title: formatFieldTitle(field) }
    };
  }

  if (channel === 'row' || channel === 'column') {
    return {
      ...base,
      header: { title: formatFieldTitle(field) }
    };
  }
  return base;
};

export const buildEncodingSpec = (
  dataset: EncodingDataset,
  shelves: ShelfAssignments,
  options?: ScatterSpecOptions
): VisualizationSpec | null => {
  const fieldLookup = new Map(dataset.fields.map((field) => [field.fieldId, field]));

  const xFieldId = shelves.x;
  const yFieldId = shelves.y;
  if (!xFieldId || !yFieldId) {
    return null;
  }
  const xField = fieldLookup.get(xFieldId);
  const yField = fieldLookup.get(yFieldId);
  if (!xField || !yField) {
    return null;
  }

  const xType = mapToVegaType(xField);
  const yType = mapToVegaType(yField);

  const encoding: Record<string, any> = {
    x: { ...buildAxisEncoding(xField), type: xType },
    y: { ...buildAxisEncoding(yField), type: yType }
  };

  const tooltipFields: EncodingField[] = [xField, yField];

  SECONDARY_CHANNELS.forEach((channel) => {
    const fieldId = shelves[channel];
    if (!fieldId) {
      return;
    }
    const field = fieldLookup.get(fieldId);
    if (!field) {
      return;
    }
    const channelEncoding = buildGenericEncoding(field, channel);
    if (channelEncoding) {
      encoding[channel] = channelEncoding;
      tooltipFields.push(field);
    }
  });

  const uniqueTooltipFields = Array.from(new Map(tooltipFields.map((field) => [field.fieldId, field])).values());
  if (uniqueTooltipFields.length) {
    encoding.tooltip = buildTooltipFields(uniqueTooltipFields);
  }

  const transforms: Transform[] = [
    { filter: `datum["${xField.fieldId}"] != null` },
    { filter: `datum["${yField.fieldId}"] != null` }
  ];

  const jitterOptions = options?.jitter;
  const jitterEnabled = Boolean(jitterOptions?.enabled) && (jitterOptions?.magnitude ?? 0) > 0;
  if (jitterEnabled) {
    const magnitudeNormalized = Math.max(0, Math.min(1, jitterOptions!.magnitude));
    if (magnitudeNormalized > 0) {
      const seed = jitterOptions!.seed ?? 0;
      const amplitude = (magnitudeNormalized * 0.1).toFixed(4);
      const jitterExpression = (factor: number) =>
        `${amplitude} * ((abs(sin(${seed} + datum["__jitter_index"] * ${factor.toFixed(4)})) % 1) - 0.5)`;

      transforms.push({ window: [{ op: 'row_number', as: '__jitter_index' }] });

      const applyContinuousJitter = (
        axis: 'x' | 'y',
        field: EncodingField,
        axisType: 'quantitative' | 'temporal' | 'nominal'
      ) => {
        const fieldId = field.fieldId;
        const factor = axis === 'x' ? 12.9898 : 78.233;
        if (axisType === 'quantitative' || axisType === 'temporal') {
          const minAlias = axis === 'x' ? '__x_min' : '__y_min';
          const maxAlias = axis === 'x' ? '__x_max' : '__y_max';
          const jitterField = axis === 'x' ? '__jitter_x' : '__jitter_y';

          transforms.push({
            joinaggregate: [
              { op: 'min', field: fieldId, as: minAlias },
              { op: 'max', field: fieldId, as: maxAlias }
            ]
          });
          transforms.push({
            calculate: `datum["${fieldId}"] + (${jitterExpression(factor)} * (datum["${maxAlias}"] - datum["${minAlias}"]))`,
            as: jitterField
          });
          encoding[axis] = {
            ...encoding[axis],
            field: jitterField
          };
        } else {
          const offsetField = axis === 'x' ? '__jitter_x_offset' : '__jitter_y_offset';
          transforms.push({ calculate: jitterExpression(factor), as: offsetField });
          encoding[`${axis}Offset`] = { field: offsetField };
        }
      };

      applyContinuousJitter('x', xField, xType);
      applyContinuousJitter('y', yField, yType);
    }
  }

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'Scatter plot workspace',
    width: 'container',
    height: 360,
    data: {
      values: dataset.rows
    },
    transform: transforms,
    mark: {
      type: 'point',
      filled: true
    },
    encoding,
    config: {
      background: '#ffffff',
      point: { size: 120 },
      axis: {
        labelFontSize: 12,
        titleFontSize: 13
      },
      legend: {
        labelFontSize: 12,
        titleFontSize: 13
      }
    }
  } as VisualizationSpec;
};

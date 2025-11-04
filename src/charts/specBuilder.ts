import type { TopLevelSpec, Transform } from 'vega-lite';
import type { EncodingDataset, EncodingField } from '@/lib/encodingTypes';
import type { ShelfAssignments, ShelfKey } from '@/state/appStore';
import { formatFieldTitle, mapToVegaType } from '@/lib/shelfConfig';

const SECONDARY_CHANNELS: ShelfKey[] = ['color', 'size', 'shape', 'opacity', 'row', 'column'];

const buildTooltipFields = (
  fields: EncodingField[]
): Array<{ field: string; type: 'quantitative' | 'nominal' | 'temporal'; title: string }> =>
  fields.map((field) => ({
    field: field.fieldId,
    type: mapToVegaType(field),
    title: formatFieldTitle(field)
  }));

const buildAxisEncoding = (field: EncodingField) => ({
  field: field.fieldId,
  type: mapToVegaType(field),
  title: formatFieldTitle(field),
  axis: {
    title: formatFieldTitle(field)
  },
  scale: {
    zero: false
  }
});

const buildGenericEncoding = (field: EncodingField, channel: ShelfKey) => {
  const base = {
    field: field.fieldId,
    type: mapToVegaType(field)
  };
  if (channel === 'color' || channel === 'shape' || channel === 'size' || channel === 'opacity') {
    return {
      ...base,
      title: formatFieldTitle(field),
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

export const buildEncodingSpec = (dataset: EncodingDataset, shelves: ShelfAssignments): TopLevelSpec | null => {
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

  const encoding: Record<string, unknown> = {
    x: buildAxisEncoding(xField),
    y: buildAxisEncoding(yField)
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
    encoding[channel] = buildGenericEncoding(field, channel);
    tooltipFields.push(field);
  });

  const uniqueTooltipFields = Array.from(new Map(tooltipFields.map((field) => [field.fieldId, field])).values());
  if (uniqueTooltipFields.length) {
    encoding.tooltip = buildTooltipFields(uniqueTooltipFields);
  }

  const transforms: Transform[] = [
    { filter: `datum["${xField.fieldId}"] != null` },
    { filter: `datum["${yField.fieldId}"] != null` }
  ];

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
    encoding: encoding as TopLevelSpec['encoding'],
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
  };
};

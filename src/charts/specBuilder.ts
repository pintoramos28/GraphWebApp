import type { TopLevelSpec } from 'vega-lite';
import type { EncodingDataset, EncodingField } from '@/lib/encodingTypes';
import type { ShelfAssignments, ShelfKey } from '@/state/appStore';
import { formatFieldTitle, mapToVegaType } from '@/lib/shelfConfig';

type EncodingChannel = 'x' | 'y' | 'color' | 'size' | 'shape' | 'opacity' | 'row' | 'column';

const SHELF_TO_ENCODING_CHANNEL: Partial<Record<ShelfKey, EncodingChannel>> = {
  x: 'x',
  y: 'y',
  color: 'color',
  size: 'size',
  shape: 'shape',
  opacity: 'opacity',
  row: 'row',
  column: 'column'
};

const buildTooltipFields = (fields: EncodingField[]): { field: string; type: 'quantitative' | 'nominal' | 'temporal'; title: string }[] =>
  fields.map((field) => ({
    field: field.fieldId,
    type: mapToVegaType(field),
    title: formatFieldTitle(field)
  }));

export const buildEncodingSpec = (dataset: EncodingDataset, shelves: ShelfAssignments): TopLevelSpec | null => {
  const entries = Object.entries(shelves) as Array<[ShelfKey, string]>;
  if (!entries.length) {
    return null;
  }

  const fieldMap = new Map(dataset.fields.map((field) => [field.fieldId, field]));

  const encoding: Record<string, unknown> = {};
  const tooltipFields: EncodingField[] = [];

  let hasAxis = false;

  entries.forEach(([shelf, fieldId]) => {
    const channel = SHELF_TO_ENCODING_CHANNEL[shelf];
    if (!channel) {
      return;
    }
    const field = fieldMap.get(fieldId);
    if (!field) {
      return;
    }
    tooltipFields.push(field);
    encoding[channel] = {
      field: field.fieldId,
      type: mapToVegaType(field),
      title: formatFieldTitle(field)
    };
    if (channel === 'x' || channel === 'y') {
      hasAxis = true;
    }
  });

  if (!hasAxis) {
    return null;
  }

  if (tooltipFields.length) {
    const unique = Array.from(new Map(tooltipFields.map((field) => [field.fieldId, field])).values());
    encoding.tooltip = buildTooltipFields(unique);
  }

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'Interactive mapping workspace',
    width: 'container',
    height: 360,
    data: {
      values: dataset.rows
    },
    mark: {
      type: 'point',
      filled: true
    },
    encoding: encoding as unknown,
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
  } as TopLevelSpec;

  return spec;
};

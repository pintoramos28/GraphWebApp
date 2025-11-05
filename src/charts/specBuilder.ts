import type { VisualizationSpec } from 'vega-embed';
import type { Transform } from 'vega-lite/build/src/transform';
import type { EncodingDataset, EncodingField } from '@/lib/encodingTypes';
import type {
  ShelfAssignments,
  ShelfKey,
  ScatterErrorBarsState
} from '@/state/appStore';
import { formatFieldTitle, mapToVegaType } from '@/lib/shelfConfig';
import { title } from 'vega-lite/build/src/channeldef';

const TRENDLINE_COLOR_MAP: Record<'linear' | 'polynomial' | 'loess', string> = {
  linear: '#1463d7',
  polynomial: '#d04f8b',
  loess: '#1b9c6d'
};

const SECONDARY_CHANNELS: ShelfKey[] = ['color', 'size', 'shape', 'opacity', 'row', 'column'];

type ScatterSpecOptions = {
  jitter?: {
    enabled: boolean;
    magnitude: number;
    seed: number;
  };
  trendline?: {
    type: 'none' | 'linear' | 'polynomial' | 'loess';
    polynomialOrder?: number;
    bandwidth?: number;
  };
  errorBars?: ScatterErrorBarsState;
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

const buildErrorBarLayers = (
  fieldLookup: Map<string, EncodingField>,
  baseEncoding: Record<string, any>,
  xField: EncodingField,
  yField: EncodingField,
  xType: 'quantitative' | 'temporal' | 'nominal',
  yType: 'quantitative' | 'temporal' | 'nominal',
  errorBars?: ScatterErrorBarsState
) => {
  if (!errorBars || errorBars.mode === 'off') {
    return [] as any[];
  }

  const axis = errorBars.axis ?? 'y';
  const layers: any[] = [];

  const copyGroupingChannels = (encoding: Record<string, any>) => {
    if (baseEncoding.color) {
      encoding.color = { ...baseEncoding.color };
    }
    if (baseEncoding.detail) {
      encoding.detail = { ...baseEncoding.detail };
    }
    if (baseEncoding.row) {
      encoding.row = { ...baseEncoding.row };
    }
    if (baseEncoding.column) {
      encoding.column = { ...baseEncoding.column };
    }
    return encoding;
  };

  if (errorBars.mode === 'fields') {
    const lowerId = errorBars.lowerFieldId;
    const upperId = errorBars.upperFieldId;
    if (!lowerId || !upperId) {
      return [];
    }
    const lowerField = fieldLookup.get(lowerId);
    const upperField = fieldLookup.get(upperId);
    if (!lowerField || !upperField) {
      return [];
    }
    if (mapToVegaType(lowerField) !== 'quantitative' || mapToVegaType(upperField) !== 'quantitative') {
      return [];
    }

    const encoding: Record<string, any> = {};
    if (axis === 'y') {
      if (yType !== 'quantitative') {
        return [];
      }
      encoding.x = {
        field: xField.fieldId,
        type: xType,
        title: formatFieldTitle(xField)
      };
      encoding.y = {
        field: lowerField.fieldId,
        type: 'quantitative',
        title: formatFieldTitle(lowerField)
      };
      encoding.y2 = {
        field: upperField.fieldId,
        type: 'quantitative'
      };
    } else {
      if (xType !== 'quantitative') {
        return [];
      }
      encoding.y = {
        field: yField.fieldId,
        type: yType,
        title: formatFieldTitle(yField)
      };
      encoding.x = {
        field: lowerField.fieldId,
        type: 'quantitative',
        title: formatFieldTitle(lowerField)
      };
      encoding.x2 = {
        field: upperField.fieldId,
        type: 'quantitative'
      };
    }

    copyGroupingChannels(encoding);
    encoding.tooltip = buildTooltipFields(
      axis === 'y' ? [xField, lowerField, upperField] : [yField, lowerField, upperField]
    );

    layers.push({
      name: 'scatter-errorbars-fields',
      transform: [
        { filter: `datum["${lowerField.fieldId}"] != null` },
        { filter: `datum["${upperField.fieldId}"] != null` }
      ],
      mark: {
        type: 'errorbar',
        clip: true,
        tooltip: true
      },
      encoding
    });

    return layers;
  }

  if (errorBars.mode === 'ci' || errorBars.mode === 'stderr' || errorBars.mode === 'stdev') {
    if (axis === 'y') {
      if (yType !== 'quantitative') {
        return [];
      }
    } else if (xType !== 'quantitative') {
      return [];
    }

    const encoding: Record<string, any> = {};
    if (axis === 'y') {
      encoding.x = {
        field: xField.fieldId,
        type: xType,
        title: formatFieldTitle(xField)
      };
      encoding.y = {
        field: yField.fieldId,
        type: yType,
        title: formatFieldTitle(yField)
      };
    } else {
      encoding.y = {
        field: yField.fieldId,
        type: yType,
        title: formatFieldTitle(yField)
      };
      encoding.x = {
        field: xField.fieldId,
        type: xType,
        title: formatFieldTitle(xField)
      };
    }

    copyGroupingChannels(encoding);

    layers.push({
      name: 'scatter-errorbars-statistic',
      mark: {
        type: 'errorbar',
        extent: errorBars.mode,
        tooltip: true
      },
      encoding
    });
  }

  return layers;
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

  const layers: any[] = [
    {
      mark: {
        type: 'point',
        filled: true
      },
      encoding
    }
  ];

  const finiteFilterExpression = `datum["${xField.fieldId}"] != null && datum["${yField.fieldId}"] != null && isValid(datum["${xField.fieldId}"]) && isValid(datum["${yField.fieldId}"])`;

  const { validRowCount, uniqueXs } = dataset.rows.reduce(
    (acc, row) => {
      const rawX = row[xField.fieldId];
      const rawY = row[yField.fieldId];
      if (rawX === null || rawX === undefined || rawY === null || rawY === undefined) {
        return acc;
      }
      const coerceToNumber = (value: unknown, type: 'quantitative' | 'temporal' | 'nominal') => {
        if (type === 'quantitative') {
          const num = Number(value);
          return Number.isFinite(num) ? num : null;
        }
        if (type === 'temporal') {
          const date = value instanceof Date ? value : new Date(value as any);
          const time = date.valueOf();
          return Number.isFinite(time) ? time : null;
        }
        return null;
      };

      const numericX = coerceToNumber(rawX, xType);
      const numericY = coerceToNumber(rawY, yType);
      if (numericX === null || numericY === null) {
        return acc;
      }
      acc.validRowCount += 1;
      acc.uniqueXs.add(numericX);
      return acc;
    },
    {
      validRowCount: 0,
      uniqueXs: new Set<number>()
    }
  );

  const trendlineLayers = buildTrendlineLayers(
    xField,
    yField,
    xType,
    yType,
    options?.trendline,
    finiteFilterExpression,
    validRowCount,
    uniqueXs.size
  );
  const errorBarLayers = buildErrorBarLayers(fieldLookup, encoding, xField, yField, xType, yType, options?.errorBars);

  const combinedLayers: any[] = [];
  if (errorBarLayers.length) {
    combinedLayers.push(...errorBarLayers);
  }
  combinedLayers.push(...layers);
  if (trendlineLayers.length) {
    combinedLayers.push(...trendlineLayers);
  }

  const resolve: Record<string, Record<string, 'independent'>> = {};
  if (trendlineLayers.length && encoding.color) {
    resolve.scale = {
      color: 'independent'
    };
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
    layer: combinedLayers,
    ...(Object.keys(resolve).length ? { resolve } : {}),
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
type TrendlineOptions = ScatterSpecOptions['trendline'];

const buildRegressionLabelExpression = (
  kind: 'linear' | 'polynomial',
  order: number,
  coefField: string,
  rSquaredField: string,
  decimalCoef: number,
  decimalR2: number
) => {
  const baseLabel =
    kind === 'linear'
      ? '"Linear: y ="'
      : `"Polynomial (deg ${order}): y ="`;

  const termExpressions: string[] = [];
  for (let exponent = order; exponent >= 1; exponent -= 1) {
    const variable = exponent === 1 ? 'x' : `x^${exponent}`;
    termExpressions.push(
      `format(datum["${coefField}"][${exponent}], ".${decimalCoef}f") + "${variable} + "`
    );
  }
  const interceptExpression = `format(datum["${coefField}"][0], ".${decimalCoef}f")`

  const polynomialBody = [baseLabel, ...termExpressions, interceptExpression].join(' + ');
  const labelExpression = `${polynomialBody} + " | R²=" + format(datum["${rSquaredField}"], ".${decimalR2}f")`;

  return labelExpression;
};

const buildTrendlineLayers = (
  xField: EncodingField,
  yField: EncodingField,
  xType: 'quantitative' | 'temporal' | 'nominal',
  yType: 'quantitative' | 'temporal' | 'nominal',
  options: TrendlineOptions | undefined,
  finiteFilterExpression: string,
  validRowCount: number,
  uniqueFiniteXCount: number
) => {
  if (!options || options.type === 'none') {
    return [] as any[];
  }

  if (validRowCount < 2 || uniqueFiniteXCount < 2) {
    return [] as any[];
  }

  if (options.type === 'linear' || options.type === 'polynomial') {
    if (yType !== 'quantitative' || (xType !== 'quantitative' && xType !== 'temporal')) {
      return [] as any[];
    }
    const order = options.type === 'polynomial' ? Math.max(2, Math.round(options.polynomialOrder ?? 2)) : 1;
    const strokeColor = options.type === 'polynomial' ? TRENDLINE_COLOR_MAP.polynomial : TRENDLINE_COLOR_MAP.linear;

    const lineLayer = {
      transform: [
        { filter: finiteFilterExpression },
        {
          regression: yField.fieldId,
          on: xField.fieldId,
          as: ['__trend_x', '__trend_y'],
          method: options.type === 'linear' ? 'linear' : 'poly',
          ...(order > 1 ? { order } : {})
        },
        {
          filter: 'isValid(datum["__trend_x"]) && isValid(datum["__trend_y"])'
        },
        
      ] as Transform[],
      mark: {
        type: 'line',
        strokeWidth: 2,
        color: strokeColor
      },
      encoding: {
        x: { field: '__trend_x', type: xType },
        y: { field: '__trend_y', type: yType },
        order: { field: '__trend_x', type: xType === 'temporal' ? 'temporal' : 'quantitative' }
      }
    };

    const statsLayer = {
      transform: [
        { filter: finiteFilterExpression },
        {
          regression: yField.fieldId,
          on: xField.fieldId,
          params: true,
          method: options.type === 'linear' ? 'linear' : 'poly',
          ...(order > 1 ? { order } : {})
        },
        {
          calculate: buildRegressionLabelExpression(
            options.type === 'polynomial' ? 'polynomial' : 'linear',
            order,
            'coef',
            'rSquared',
            1,
            3
          ),
          as: '__trend_label'
        }
      ] as Transform[],
      mark: {
        type: 'point',
        opacity: 0
      },
      encoding: {
        color: {
          field: '__trend_label',
          type: 'nominal',
          legend: {title: 'Trendlines'},
          scale: { range: [strokeColor] }
        },
        tooltip: {field: '__trend_label'}
      }
    };

    return [lineLayer, statsLayer];
  }

  if (options.type === 'loess') {
    if (yType !== 'quantitative' || (xType !== 'quantitative' && xType !== 'temporal')) {
      return [] as any[];
    }
    const bandwidth = Math.max(0.1, Math.min(1, options.bandwidth ?? 0.5));
    const strokeColor = TRENDLINE_COLOR_MAP.loess;

    const lineLayer = {
      transform: [
        { filter: finiteFilterExpression },
        {
          loess: yField.fieldId,
          on: xField.fieldId,
          bandwidth,
          as: ['__trend_x', '__trend_y']
        },
        {
          filter: 'isValid(datum["__trend_x"]) && isValid(datum["__trend_y"])'
        }
      ] as Transform[],
      mark: {
        type: 'line',
        strokeWidth: 2,
        strokeDash: [6, 3],
        color: strokeColor
      },
      encoding: {
        x: { field: '__trend_x', type: xType },
        y: { field: '__trend_y', type: yType },
        order: { field: '__trend_x', type: xType === 'temporal' ? 'temporal' : 'quantitative' }
      }
    };

    const statsLayer = {
      transform: [
        { filter: finiteFilterExpression },
        {
          loess: yField.fieldId,
          on: xField.fieldId,
          bandwidth,
          params: true
        },
        {
          calculate: `"LOESS (bw=${bandwidth.toFixed(2)}) | R²=" + format(datum["rSquared"], ".3f")`,
          as: '__trend_label'
        }
      ] as Transform[],
      mark: {
        type: 'point',
        opacity: 0
      },
      encoding: {
        color: {
          field: '__trend_label',
          type: 'nominal',
          legend: { title: 'Trendline' },
          scale: { range: [strokeColor] }
        },
        tooltip: [
          {
            field: '__trend_label',
            title: 'Trendline',
            type: 'nominal'
          }
        ]
      }
    };

    return [lineLayer, statsLayer];
  }

  return [] as any[];
};

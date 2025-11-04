import type { ShelfKey } from '@/state/appStore';
import type { EncodingField } from './encodingTypes';

export type FieldCategory = 'quantitative' | 'temporal' | 'categorical' | 'unsupported';

const NUMERIC_TYPES = new Set(['number', 'int', 'integer', 'float', 'double', 'decimal']);
const TEMPORAL_TYPES = new Set(['datetime', 'date', 'timestamp']);
const CATEGORICAL_TYPES = new Set(['string', 'boolean']);

const normalizeType = (type: string): string => type.trim().toLowerCase();

export const getFieldCategory = (type: string): FieldCategory => {
  if (!type) {
    return 'unsupported';
  }
  const normalized = normalizeType(type);
  if (NUMERIC_TYPES.has(normalized)) {
    return 'quantitative';
  }
  if (TEMPORAL_TYPES.has(normalized)) {
    return 'temporal';
  }
  if (CATEGORICAL_TYPES.has(normalized)) {
    return 'categorical';
  }
  return 'unsupported';
};

type ShelfDefinition = {
  key: ShelfKey;
  label: string;
  helper: string;
  accepts: FieldCategory[];
};

export const SHELF_DEFINITIONS: ShelfDefinition[] = [
  {
    key: 'x',
    label: 'X Axis',
    helper: 'Quantitative, temporal, or categorical',
    accepts: ['quantitative', 'temporal', 'categorical']
  },
  {
    key: 'y',
    label: 'Y Axis',
    helper: 'Quantitative or temporal',
    accepts: ['quantitative', 'temporal']
  },
  { key: 'color', label: 'Color', helper: 'Categorical or quantitative', accepts: ['categorical', 'quantitative'] },
  { key: 'size', label: 'Size', helper: 'Quantitative only', accepts: ['quantitative'] },
  { key: 'shape', label: 'Shape', helper: 'Categorical only', accepts: ['categorical'] },
  { key: 'opacity', label: 'Opacity', helper: 'Quantitative only', accepts: ['quantitative'] },
  { key: 'row', label: 'Row Facet', helper: 'Categorical or temporal', accepts: ['categorical', 'temporal'] },
  { key: 'column', label: 'Column Facet', helper: 'Categorical or temporal', accepts: ['categorical', 'temporal'] }
];

const SHELF_LABEL_LOOKUP: Record<ShelfKey, ShelfDefinition> = SHELF_DEFINITIONS.reduce<
  Record<ShelfKey, ShelfDefinition>
>((acc, definition) => {
  acc[definition.key] = definition;
  return acc;
}, {} as Record<ShelfKey, ShelfDefinition>);

export const getShelfDefinition = (shelf: ShelfKey): ShelfDefinition => SHELF_LABEL_LOOKUP[shelf];

export const getShelfLabel = (shelf: ShelfKey): string => SHELF_LABEL_LOOKUP[shelf]?.label ?? shelf.toUpperCase();

export const validateShelfAssignment = (
  shelf: ShelfKey,
  field: EncodingField
): { valid: true } | { valid: false; reason: string } => {
  const definition = SHELF_LABEL_LOOKUP[shelf];
  if (!definition) {
    return {
      valid: false,
      reason: 'Unknown shelf.'
    };
  }
  const category = getFieldCategory(field.type);
  if (category === 'unsupported') {
    return {
      valid: false,
      reason: `"${field.name}" is not a supported type for ${definition.label}.`
    };
  }
  if (!definition.accepts.includes(category)) {
    const readableType =
      category === 'quantitative'
        ? 'numeric'
        : category === 'temporal'
          ? 'date/time'
          : category === 'categorical'
            ? 'categorical'
            : 'this';
    return {
      valid: false,
      reason: `${definition.label} expects ${definition.helper.toLowerCase()}, but "${field.name}" is ${readableType}.`
    };
  }
  return { valid: true };
};

export const formatFieldTitle = (field: EncodingField): string => {
  const base = field.label?.length ? field.label : field.name;
  return field.unit?.length ? `${base} (${field.unit})` : base;
};

export const mapToVegaType = (field: EncodingField): 'quantitative' | 'nominal' | 'temporal' => {
  const category = getFieldCategory(field.type);
  switch (category) {
    case 'quantitative':
      return 'quantitative';
    case 'temporal':
      return 'temporal';
    default:
      return 'nominal';
  }
};

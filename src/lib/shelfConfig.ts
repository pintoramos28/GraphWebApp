import type { ShelfKey } from '@/state/appStore';
import type { EncodingField } from './encodingTypes';
import {
  semanticTypeToShelfCategory,
  semanticTypeToVegaType,
  SEMANTIC_TYPE_LABELS,
  type SemanticType
} from './semanticTypes';

export type FieldCategory = 'quantitative' | 'temporal' | 'categorical' | 'unsupported';

const categoryFromSemantic = (semanticType: SemanticType | undefined): FieldCategory => {
  if (!semanticType) {
    return 'unsupported';
  }
  const category = semanticTypeToShelfCategory(semanticType);
  switch (category) {
    case 'quantitative':
      return 'quantitative';
    case 'temporal':
      return 'temporal';
    case 'categorical':
      return 'categorical';
    default:
      return 'unsupported';
  }
};

export const getFieldCategory = (field: EncodingField): FieldCategory =>
  categoryFromSemantic(field.semanticType);

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
    helper: 'Continuous, temporal, or categorical',
    accepts: ['quantitative', 'temporal', 'categorical']
  },
  {
    key: 'y',
    label: 'Y Axis',
    helper: 'Continuous or temporal',
    accepts: ['quantitative', 'temporal']
  },
  { key: 'color', label: 'Color', helper: 'Categorical or continuous', accepts: ['categorical', 'quantitative'] },
  { key: 'size', label: 'Size', helper: 'Continuous only', accepts: ['quantitative'] },
  { key: 'shape', label: 'Shape', helper: 'Categorical only', accepts: ['categorical'] },
  { key: 'opacity', label: 'Opacity', helper: 'Continuous only', accepts: ['quantitative'] },
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
  const category = getFieldCategory(field);
  if (category === 'unsupported') {
    return {
      valid: false,
      reason: `"${field.name}" is not a supported type for ${definition.label}.`
    };
  }
  if (!definition.accepts.includes(category)) {
    const readableType = SEMANTIC_TYPE_LABELS[field.semanticType ?? 'categorical'] ?? 'this';
    return {
      valid: false,
      reason: `${definition.label} expects ${definition.helper.toLowerCase()}, but "${field.name}" is ${readableType.toLowerCase()}.`
    };
  }
  return { valid: true };
};

export const formatFieldTitle = (field: EncodingField): string => {
  const base = field.label?.length ? field.label : field.name;
  return field.unit?.length ? `${base} (${field.unit})` : base;
};

export const mapToVegaType = (field: EncodingField): 'quantitative' | 'nominal' | 'temporal' =>
  field.semanticType ? semanticTypeToVegaType(field.semanticType) : 'nominal';

export type SemanticType = 'continuous' | 'categorical' | 'temporal';

export const SEMANTIC_TYPE_LABELS: Record<SemanticType, string> = {
  continuous: 'Continuous',
  categorical: 'Categorical',
  temporal: 'Temporal'
};

const normalizeColumnType = (type: string): string => type.trim().toLowerCase();

export const inferSemanticType = (columnType: string): SemanticType => {
  const normalized = normalizeColumnType(columnType);
  if (normalized === 'number' || normalized === 'int' || normalized === 'integer' || normalized === 'float' || normalized === 'double' || normalized === 'decimal') {
    return 'continuous';
  }
  if (normalized === 'datetime' || normalized === 'date' || normalized === 'timestamp') {
    return 'temporal';
  }
  return 'categorical';
};

export const getAllowedSemanticTypes = (columnType: string): SemanticType[] => {
  const normalized = normalizeColumnType(columnType);
  if (normalized === 'number' || normalized === 'int' || normalized === 'integer' || normalized === 'float' || normalized === 'double' || normalized === 'decimal') {
    return ['continuous', 'categorical'];
  }
  if (normalized === 'datetime' || normalized === 'date' || normalized === 'timestamp') {
    return ['temporal', 'categorical'];
  }
  if (normalized === 'boolean') {
    return ['categorical'];
  }
  return ['categorical'];
};

export const isSemanticTypeAllowed = (columnType: string, semanticType: SemanticType): boolean =>
  getAllowedSemanticTypes(columnType).includes(semanticType);

export const semanticTypeToShelfCategory = (semanticType: SemanticType): 'quantitative' | 'temporal' | 'categorical' => {
  switch (semanticType) {
    case 'continuous':
      return 'quantitative';
    case 'temporal':
      return 'temporal';
    default:
      return 'categorical';
  }
};

export const semanticTypeToVegaType = (semanticType: SemanticType): 'quantitative' | 'temporal' | 'nominal' => {
  switch (semanticType) {
    case 'continuous':
      return 'quantitative';
    case 'temporal':
      return 'temporal';
    default:
      return 'nominal';
  }
};

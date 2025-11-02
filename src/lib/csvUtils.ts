export const inferValueType = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  const valueType = typeof value;
  if (valueType === 'number') {
    if (Number.isNaN(value)) {
      return 'number';
    }
    return 'number';
  }
  if (valueType === 'object') {
    return 'object';
  }
  if (valueType === 'boolean') {
    return 'boolean';
  }
  return 'string';
};

export type SampleColumn = {
  fieldId: string;
  name: string;
  originalName: string;
  type: string;
};

export const buildColumnsFromFields = (
  fields: string[],
  sampleRows: Array<Record<string, unknown>>
) => {
  return fields.map((field) => {
    const sampleValue = sampleRows.find((row) => field in row)?.[field];
    return {
      fieldId: field,
      name: field,
      originalName: field,
      type: inferValueType(sampleValue)
    };
  });
};

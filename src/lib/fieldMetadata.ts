import type { SampleColumn } from './csvUtils';

export type FieldMetadata = {
  fieldId: string;
  name: string;
  label: string;
  unit: string;
};

export const createDefaultLabel = (input: string): string => {
  if (!input) {
    return '';
  }
  return input
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const createFieldMetadataMap = (columns: SampleColumn[]): Record<string, FieldMetadata> =>
  columns.reduce<Record<string, FieldMetadata>>((acc, column) => {
    const label = createDefaultLabel(column.name);
    acc[column.fieldId] = {
      fieldId: column.fieldId,
      name: column.name,
      label,
      unit: ''
    };
    return acc;
  }, {});

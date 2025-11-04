export type EncodingField = {
  fieldId: string;
  name: string;
  label: string;
  type: string;
  unit?: string;
};

export type EncodingDataset = {
  id: string;
  name: string;
  fields: EncodingField[];
  rows: Array<Record<string, unknown>>;
};

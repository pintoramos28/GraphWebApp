export type SupportedFormat = 'csv' | 'tsv' | 'parquet' | 'arrow' | 'xlsx';

const EXTENSION_MAP: Record<SupportedFormat, string[]> = {
  csv: ['.csv'],
  tsv: ['.tsv', '.txt'],
  parquet: ['.parquet'],
  arrow: ['.arrow', '.feather', '.ipc'],
  xlsx: ['.xlsx', '.xls']
};

const MIME_MAP: Record<SupportedFormat, RegExp[]> = {
  csv: [/text\/csv/i],
  tsv: [/text\/(tab-separated-values|plain)/i],
  parquet: [/application\/parquet/i],
  arrow: [/application\/(vnd\.apache\.arrow\.file|vnd\.apache\.arrow\.stream)/i],
  xlsx: [/application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i, /application\/vnd\.ms-excel/i]
};

export const detectFileFormat = (fileName: string): SupportedFormat | null => {
  const lower = fileName.toLowerCase();
  for (const [format, extensions] of Object.entries(EXTENSION_MAP) as [SupportedFormat, string[]][]) {
    if (extensions.some((ext) => lower.endsWith(ext))) {
      return format;
    }
  }
  for (const [format, patterns] of Object.entries(MIME_MAP) as [SupportedFormat, RegExp[]][]) {
    if (patterns.some((pattern) => pattern.test(fileName))) {
      return format;
    }
  }
  return null;
};

export const isDelimitedFormat = (format: SupportedFormat | null): format is 'csv' | 'tsv' =>
  format === 'csv' || format === 'tsv';

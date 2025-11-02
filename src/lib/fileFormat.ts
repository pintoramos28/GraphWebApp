export type SupportedFormat = 'csv' | 'tsv' | 'parquet' | 'arrow' | 'xlsx';

const EXTENSION_MAP: Record<SupportedFormat, string[]> = {
  csv: ['.csv'],
  tsv: ['.tsv', '.txt'],
  parquet: ['.parquet'],
  arrow: ['.arrow', '.feather', '.ipc'],
  xlsx: ['.xlsx', '.xls']
};

export const detectFileFormat = (fileName: string): SupportedFormat | null => {
  const lower = fileName.toLowerCase();
  for (const [format, extensions] of Object.entries(EXTENSION_MAP) as [SupportedFormat, string[]][]) {
    if (extensions.some((ext) => lower.endsWith(ext))) {
      return format;
    }
  }
  return null;
};

export const isDelimitedFormat = (format: SupportedFormat | null): format is 'csv' | 'tsv' =>
  format === 'csv' || format === 'tsv';

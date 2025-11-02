import Papa from 'papaparse';
import type { ParseError } from 'papaparse';
import * as XLSX from 'xlsx';
import { buildColumnsFromFields } from './csvUtils';
import type { SupportedFormat } from './fileFormat';

export type PreviewResult = {
  columns: { name: string; type: string }[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
};

const MAX_PREVIEW_ROWS = 1000;

const isLikelyHtml = (headSample: string): boolean => {
  const sample = headSample.trimStart().toLowerCase();
  return sample.startsWith('<!doctype html') || sample.startsWith('<html');
};

const describePapaError = (error: Pick<ParseError, 'code' | 'message'> & { code: string }): string => {
  const code = error.code as string;
  switch (code) {
    case 'DuplicateHeader':
      return 'Duplicate column headers detected. Please ensure each column name is unique.';
    case 'TooFewFields':
    case 'TooManyFields':
      return 'Row length mismatch detected. Verify that your delimiters and quoted fields are valid.';
    case 'InvalidQuotes':
    case 'UndefinedVariable':
      return 'Malformed quoted field detected. Check for unmatched quotes in your data.';
    default:
      return error.message;
  }
};

export const parseDelimitedPreview = async (file: File): Promise<PreviewResult> => {
  const headSample = await file.slice(0, 2048).text();
  if (isLikelyHtml(headSample)) {
    throw new Error('The selected file or URL appears to contain HTML instead of CSV data. Please provide a direct download link to the dataset.');
  }

  return new Promise<PreviewResult>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      preview: MAX_PREVIEW_ROWS,
      complete: (results) => {
        if (results.errors?.length) {
          const firstError = results.errors[0];
          reject(new Error(firstError ? describePapaError(firstError) : 'Failed to parse file.'));
          return;
        }
        const rows = Array.isArray(results.data)
          ? results.data.filter((row): row is Record<string, unknown> => Boolean(row))
          : [];
        const fields = results.meta.fields ?? Object.keys(rows[0] ?? {});
        resolve({
          columns: buildColumnsFromFields(fields, rows),
          rows,
          rowCount: rows.length,
          truncated: rows.length >= MAX_PREVIEW_ROWS
        });
      },
      error: (error) => reject(error)
    });
  });
};

export const parseExcelPreview = async (file: File): Promise<PreviewResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file contains no sheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Failed to read the first worksheet.');
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null
  });

  const limitedRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const fields = Array.from(
    limitedRows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  return {
    columns: buildColumnsFromFields(fields, limitedRows),
    rows: limitedRows,
    rowCount: rows.length,
    truncated: rows.length > limitedRows.length
  };
};

export const generatePreview = async (file: File, format: SupportedFormat): Promise<PreviewResult> => {
  switch (format) {
    case 'csv':
    case 'tsv':
      return parseDelimitedPreview(file);
    case 'xlsx':
      return parseExcelPreview(file);
    default:
      throw new Error('Quick preview is not available for this format.');
  }
};

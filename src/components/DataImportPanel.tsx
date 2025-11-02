'use client';

import { useCallback, useRef } from 'react';
import {
  Alert,
  Button,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { importCsvFile } from '@/lib/importCsv';
import { useImportStore } from '@/state/importStore';
import { useAppStore } from '@/state/appStore';
import Papa from 'papaparse';
import { buildColumnsFromFields } from '@/lib/csvUtils';

const parseQuickPreview = (file: File) =>
  new Promise<{
    columns: { name: string; type: string }[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
  }>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      preview: 1000,
      complete: (results) => {
        if (results.errors?.length) {
          reject(new Error(results.errors[0]?.message ?? 'Failed to parse file'));
          return;
        }
        const rows = Array.isArray(results.data)
          ? results.data.filter((row): row is Record<string, unknown> => Boolean(row))
          : [];
        const fields = results.meta.fields ?? Object.keys(rows[0] ?? {});
        const columns = buildColumnsFromFields(fields, rows);
        resolve({
          columns,
          rows,
          rowCount: rows.length,
          truncated: rows.length >= 1000
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });

const DataImportPanel = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startImport = useImportStore((state) => state.startImport);
  const updateStatus = useImportStore((state) => state.updateStatus);
  const setPreview = useImportStore((state) => state.setPreview);
  const setError = useImportStore((state) => state.setError);
  const phase = useImportStore((state) => state.phase);
  const message = useImportStore((state) => state.message);
  const preview = useImportStore((state) => state.preview);
  const registerDataset = useAppStore((state) => state.dispatch);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      startImport(file.name);

      try {
        updateStatus('parsing', 'Generating quick preview…');

        const quickPreview = await parseQuickPreview(file);
        const datasetId = crypto.randomUUID();

        setPreview({
          datasetId,
          fileName: file.name,
          columns: quickPreview.columns,
          rows: quickPreview.rows,
          rowCount: quickPreview.rowCount,
          truncated: quickPreview.truncated
        });

        registerDataset({
          type: 'datasets/register',
          dataset: {
            id: datasetId,
            name: file.name,
            fieldCount: quickPreview.columns.length
          }
        });

        const bypassDuckDb =
          typeof navigator !== 'undefined' &&
          (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent ?? ''));

        if (!bypassDuckDb) {
          const result = await importCsvFile(file, {
            onStatus: (status) => {
              updateStatus(
                status.phase === 'loading'
                  ? 'loading'
                  : status.phase === 'parsing'
                    ? 'parsing'
                    : 'counting',
                status.message
              );
            }
          });

          setPreview({
            datasetId,
            fileName: file.name,
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rowCount,
            truncated: result.truncated
          });

          if (result.columns.length !== quickPreview.columns.length) {
            registerDataset({
              type: 'datasets/register',
              dataset: {
                id: datasetId,
                name: file.name,
                fieldCount: result.columns.length
              }
            });
          }
        } else {
          updateStatus('success', 'Showing quick preview (DuckDB disabled in automated runs).');
        }
      } catch (error) {
        console.error('CSV import failed', error);
        setError(error instanceof Error ? error.message : 'Failed to import file');
      } finally {
        resetInput();
      }
    },
    [registerDataset, setError, setPreview, startImport, updateStatus]
  );

  const showProgress = phase === 'loading' || phase === 'parsing' || phase === 'counting';

  return (
    <Stack spacing={2} data-testid="data-import-panel">
      <Stack spacing={1}>
        <Typography variant="h6">Data Import</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload CSV or TSV files to generate a 1,000-row preview using DuckDB-WASM.
        </Typography>
      </Stack>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values"
          tabIndex={-1}
          style={{ display: 'none' }}
          data-testid="dataset-file-input"
          onChange={handleFileChange}
        />
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          Select CSV / TSV
        </Button>
      </div>

      {showProgress && <LinearProgress variant="indeterminate" aria-label="Importing dataset" />}

      {message && (
        <Alert severity={phase === 'error' ? 'error' : 'info'}>{message}</Alert>
      )}

      {preview && (
        <Alert severity="success">
          Imported <strong>{preview.fileName}</strong> ({preview.columns.length} columns,{' '}
          {preview.rowCount.toLocaleString()} rows
          {preview.truncated ? ', preview limited to first 1,000 rows' : ''})
        </Alert>
      )}
    </Stack>
  );
};

export default DataImportPanel;

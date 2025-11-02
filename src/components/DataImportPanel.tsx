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
import { importDatasetFile } from '@/lib/importCsv';
import { generatePreview } from '@/lib/datasetPreview';
import { detectFileFormat, isDelimitedFormat } from '@/lib/fileFormat';
import { useImportStore } from '@/state/importStore';
import { useAppStore } from '@/state/appStore';

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

      const format = detectFileFormat(file.name);
      if (!format) {
        setError('Unsupported file type. Please select CSV, TSV, Parquet, Arrow, or Excel files.');
        resetInput();
        return;
      }

      startImport(file.name);

      try {
        updateStatus('parsing', `Generating ${format.toUpperCase()} preview…`);

        let datasetId = crypto.randomUUID();
        let quickPreview = null as Awaited<ReturnType<typeof generatePreview>> | null;

        if (format !== 'parquet' && format !== 'arrow') {
          quickPreview = await generatePreview(file, format);

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
        } else {
          updateStatus('loading', 'Parsing file with DuckDB-WASM…');
        }

        const bypassDuckDb =
          typeof navigator !== 'undefined' &&
          (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent ?? ''));
        const skipPostProcessing = bypassDuckDb || format === 'xlsx';

        if (!skipPostProcessing) {
          const result = await importDatasetFile(
            file,
            { bypassDuckDb: skipPostProcessing },
            {
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
            }
          );

          setPreview({
            datasetId,
            fileName: file.name,
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rowCount,
            truncated: result.truncated
          });

          if (quickPreview && result.columns.length !== quickPreview.columns.length) {
            registerDataset({
              type: 'datasets/register',
              dataset: {
                id: datasetId,
                name: file.name,
                fieldCount: result.columns.length
              }
            });
          } else if (!quickPreview) {
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
          updateStatus('success', 'Showing preview (post-processing skipped in this environment).');
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
          Upload CSV, TSV, Parquet, Arrow, or Excel files to generate a 1,000-row preview (DuckDB-WASM enhances results where supported).
        </Typography>
      </Stack>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,.parquet,.arrow,.feather,.ipc,.xlsx,.xls"
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

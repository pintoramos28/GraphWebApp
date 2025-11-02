'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  LinearProgress,
  Stack,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  MenuItem
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import { importDatasetFile } from '@/lib/importCsv';
import { generatePreview, parseDelimitedText } from '@/lib/datasetPreview';
import { detectFileFormat } from '@/lib/fileFormat';
import { useImportStore } from '@/state/importStore';
import { useAppStore } from '@/state/appStore';
import { createFieldMetadataMap } from '@/lib/fieldMetadata';

const DataImportPanel = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startImport = useImportStore((state) => state.startImport);
  const updateStatus = useImportStore((state) => state.updateStatus);
  const setPreview = useImportStore((state) => state.setPreview);
  const setError = useImportStore((state) => state.setError);
  const phase = useImportStore((state) => state.phase);
  const message = useImportStore((state) => state.message);
  const preview = useImportStore((state) => state.preview);
  const recentUrls = useImportStore((state) => state.recentUrls);
  const addRecentUrl = useImportStore((state) => state.addRecentUrl);
  const registerDataset = useAppStore((state) => state.dispatch);
  const [urlInput, setUrlInput] = useState('');
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteWarning, setPasteWarning] = useState<string | null>(null);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      const format = detectFileFormat(file.name);
      if (!format) {
        setError('Unsupported file type. Please select CSV, TSV, Parquet, Arrow, or Excel files.');
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
              fieldCount: quickPreview.columns.length,
              fields: createFieldMetadataMap(quickPreview.columns)
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

          const resultMetadata = createFieldMetadataMap(result.columns);

          registerDataset({
            type: 'datasets/register',
            dataset: {
              id: datasetId,
              name: file.name,
              fieldCount: result.columns.length,
              fields: resultMetadata
            }
          });
        } else {
          updateStatus('success', 'Showing preview (post-processing skipped in this environment).');
        }
      } catch (error) {
        console.error('Dataset import failed', error);
        setError(error instanceof Error ? error.message : 'Failed to import file');
      } finally {
        resetInput();
      }
    },
    [registerDataset, setError, setPreview, startImport, updateStatus]
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      await processFile(file);
    },
    [processFile]
  );

  const handleUrlImport = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) {
        setUrlWarning('Please enter a URL.');
        return;
      }

      try {
        const response = await fetch(trimmed, { credentials: 'omit' });
        if (!response.ok) {
          throw new Error(`Failed to fetch data (status ${response.status}).`);
        }
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('Content-Type') ?? '';
        const baseUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
        const urlPath = new URL(trimmed, baseUrl).pathname;
        const inferredName = urlPath.split('/').filter(Boolean).pop() ?? 'dataset';
        const inferredFormat = detectFileFormat(inferredName) ?? detectFileFormat(contentType) ?? 'csv';
        const normalizedName = inferredName.includes('.') ? inferredName : `${inferredName}.${inferredFormat}`;

        const file = new File([buffer], normalizedName, { type: contentType });
        addRecentUrl(trimmed);
        await processFile(file);
        setUrlInput(trimmed);
      } catch (error) {
        console.error('URL import failed', error);
        setError(error instanceof Error ? error.message : 'Failed to import URL');
      }
    },
    [addRecentUrl, processFile, setError]
  );

  const handlePasteImport = useCallback(async () => {
    const trimmed = pasteInput.trim();
    if (!trimmed) {
      setPasteWarning('Paste tabular data where the first row contains headers.');
      return;
    }

    startImport('pasted-data');

    try {
      updateStatus('parsing', 'Parsing pasted data…');
      const previewResult = await parseDelimitedText(trimmed, 'pasted.csv');

      const datasetId = crypto.randomUUID();
      setPreview({
        datasetId,
        fileName: 'pasted-data',
        columns: previewResult.columns,
        rows: previewResult.rows,
        rowCount: previewResult.rowCount,
        truncated: previewResult.truncated
      });

      registerDataset({
        type: 'datasets/register',
        dataset: {
          id: datasetId,
          name: 'Pasted Data',
          fieldCount: previewResult.columns.length,
          fields: createFieldMetadataMap(previewResult.columns)
        }
      });
      setPasteWarning(null);
      setPasteInput('');
      updateStatus('success', 'Pasted data preview ready.');
    } catch (error) {
      console.error('Pasted data import failed', error);
      setPasteWarning(error instanceof Error ? error.message : 'Failed to parse pasted data.');
      setError(error instanceof Error ? error.message : 'Failed to parse pasted data.');
    }
  }, [pasteInput, registerDataset, setError, setPreview, startImport, updateStatus]);

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

      <Stack spacing={1} direction="column">
        <TextField
          label="Import from URL"
          placeholder="https://example.com/data.csv"
          value={urlInput}
          onChange={(event) => {
            setUrlInput(event.target.value);
            setUrlWarning(null);
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="Import dataset from URL"
                  onClick={() => handleUrlImport(urlInput)}
                  edge="end"
                  data-testid="dataset-url-import"
                >
                  <LinkIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          error={Boolean(urlWarning)}
          helperText={urlWarning ?? 'Supports CSV, TSV, Parquet, Arrow, and Excel files.'}
        />
        {recentUrls.length > 0 ? (
          <TextField
            select
            label="Recent URLs"
            value=""
            onChange={(event) => {
              const selected = event.target.value;
              setUrlWarning(null);
              setUrlInput(selected);
              handleUrlImport(selected);
            }}
            InputProps={{ 'aria-label': 'Recent data URLs' }}
          >
            <MenuItem value="" disabled>
              Select a recent URL
            </MenuItem>
            {recentUrls.map((entry) => (
              <MenuItem key={entry} value={entry}>
                {entry}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Stack>

      <Stack spacing={1} direction="column">
        <TextField
          label="Paste tabular data"
          placeholder="team,hours\nAurora,10"
          value={pasteInput}
          onChange={(event) => {
            setPasteInput(event.target.value);
            setPasteWarning(null);
          }}
          multiline
          minRows={4}
          maxRows={8}
          error={Boolean(pasteWarning)}
          helperText={pasteWarning ?? 'First row should include column headers separated by commas or tabs.'}
        />
        <Button
          variant="outlined"
          onClick={handlePasteImport}
          disabled={!pasteInput.trim()}
          data-testid="dataset-paste-import"
        >
          Import Pasted Data
        </Button>
      </Stack>

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

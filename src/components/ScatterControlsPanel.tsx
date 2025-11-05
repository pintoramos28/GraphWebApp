'use client';

import { useCallback, useEffect, useMemo, type ChangeEvent, type FocusEvent } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  useAppStore,
  selectScatterErrorBars,
  selectScatterJitter,
  selectScatterTrendline,
  type ScatterErrorBarMode,
  type ScatterErrorBarsState
} from '@/state/appStore';
import { useImportStore } from '@/state/importStore';
import { SAMPLE_DATASET } from '@/lib/sampleDataset';

const ScatterControlsPanel = () => {
  const jitter = useAppStore(selectScatterJitter);
  const trendline = useAppStore(selectScatterTrendline);
  const errorBars = useAppStore(selectScatterErrorBars);
  const dispatch = useAppStore((state) => state.dispatch);
  const preview = useImportStore((state) => state.preview);

  const availableFields = useMemo(
    () =>
      preview
        ? preview.columns.map((column) => ({
            fieldId: column.fieldId,
            label: column.label || column.name,
            semanticType: column.semanticType
          }))
        : SAMPLE_DATASET.fields.map((field) => ({
            fieldId: field.fieldId,
            label: field.label || field.name,
            semanticType: field.semanticType
          })),
    [preview]
  );

  const continuousFields = useMemo(
    () => availableFields.filter((field) => field.semanticType === 'continuous'),
    [availableFields]
  );

  const continuousFieldIds = useMemo(
    () => new Set(continuousFields.map((field) => field.fieldId)),
    [continuousFields]
  );

  useEffect(() => {
    if (errorBars.mode === 'fields' && !continuousFields.length) {
      dispatch({
        type: 'scatter/setErrorBars',
        errorBars: { mode: 'off', lowerFieldId: null, upperFieldId: null }
      });
      return;
    }

    if (errorBars.mode !== 'fields') {
      return;
    }

    const desiredLower =
      errorBars.lowerFieldId && continuousFieldIds.has(errorBars.lowerFieldId)
        ? errorBars.lowerFieldId
        : continuousFields[0]?.fieldId ?? null;
    const desiredUpper =
      errorBars.upperFieldId && continuousFieldIds.has(errorBars.upperFieldId)
        ? errorBars.upperFieldId
        : continuousFields.length > 1
            ? continuousFields[1]?.fieldId ?? desiredLower
            : desiredLower;

    const updates: Partial<ScatterErrorBarsState> = {};
    if (errorBars.lowerFieldId !== desiredLower) {
      updates.lowerFieldId = desiredLower;
    }
    if (errorBars.upperFieldId !== desiredUpper) {
      updates.upperFieldId = desiredUpper;
    }
    if (Object.keys(updates).length > 0) {
      dispatch({ type: 'scatter/setErrorBars', errorBars: updates });
    }
  }, [
    dispatch,
    errorBars.mode,
    errorBars.lowerFieldId,
    errorBars.upperFieldId,
    continuousFields,
    continuousFieldIds
  ]);

  const handleEnabledChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: 'scatter/setJitter',
        enabled: event.target.checked
      });
    },
    [dispatch]
  );

  const handleMagnitudeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const numeric = Array.isArray(value) ? value[0] ?? 0 : value;
      dispatch({
        type: 'scatter/setJitter',
        magnitude: Number(numeric.toFixed(2))
      });
    },
    [dispatch]
  );

  const handleSeedBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(event.target.value, 10);
      if (!Number.isFinite(parsed)) {
        return;
      }
      dispatch({
        type: 'scatter/setJitter',
        seed: parsed
      });
    },
    [dispatch]
  );

  const handleTrendlineTypeChange = useCallback(
    (event: SelectChangeEvent<'none' | 'linear' | 'polynomial' | 'loess'>) => {
      const value = event.target.value as 'none' | 'linear' | 'polynomial' | 'loess';
      dispatch({
        type: 'scatter/setTrendline',
        trendline: { type: value }
      });
    },
    [dispatch]
  );

  const handlePolynomialOrderChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const numeric = Array.isArray(value) ? value[0] ?? trendline.polynomialOrder : value;
      dispatch({
        type: 'scatter/setTrendline',
        trendline: { polynomialOrder: Math.max(2, Math.min(6, Math.round(numeric))) }
      });
    },
    [dispatch, trendline.polynomialOrder]
  );

  const handleBandwidthChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const numeric = Array.isArray(value) ? value[0] ?? trendline.bandwidth : value;
      dispatch({
        type: 'scatter/setTrendline',
        trendline: { bandwidth: Number(Math.max(0.1, Math.min(1, numeric)).toFixed(2)) }
      });
    },
    [dispatch, trendline.bandwidth]
  );

  const handleErrorBarModeChange = useCallback(
    (event: SelectChangeEvent) => {
      const mode = event.target.value as ScatterErrorBarMode;
      const updates: Partial<ScatterErrorBarsState> = { mode };
      if (mode !== 'fields') {
        updates.lowerFieldId = null;
        updates.upperFieldId = null;
      } else if (continuousFields.length) {
        const [first, second] = continuousFields;
        updates.lowerFieldId = errorBars.lowerFieldId && continuousFieldIds.has(errorBars.lowerFieldId)
          ? errorBars.lowerFieldId
          : first?.fieldId ?? null;
        updates.upperFieldId = errorBars.upperFieldId && continuousFieldIds.has(errorBars.upperFieldId)
          ? errorBars.upperFieldId
          : second?.fieldId ?? first?.fieldId ?? null;
      }
      dispatch({ type: 'scatter/setErrorBars', errorBars: updates });
    },
    [continuousFieldIds, continuousFields, dispatch, errorBars.lowerFieldId, errorBars.upperFieldId]
  );

  const handleLowerFieldChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      dispatch({
        type: 'scatter/setErrorBars',
        errorBars: { lowerFieldId: event.target.value || null }
      });
    },
    [dispatch]
  );

  const handleUpperFieldChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      dispatch({
        type: 'scatter/setErrorBars',
        errorBars: { upperFieldId: event.target.value || null }
      });
    },
    [dispatch]
  );

  return (
    <Paper variant="outlined" sx={{ padding: 2, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" component="h2">
            Scatter Controls
          </Typography>
          <Tooltip title="Jitter adds small offsets to reduce point overlap while remaining reproducible.">
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Tooltip>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            checked={jitter.enabled}
            onChange={handleEnabledChange}
            inputProps={{ 'aria-label': 'Enable point jitter' }}
          />
          <Typography variant="body2">Enable jitter</Typography>
        </Stack>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Jitter amount
          </Typography>
          <Slider
            value={jitter.magnitude}
            onChange={handleMagnitudeChange}
            min={0}
            max={1}
            step={0.05}
            valueLabelDisplay="auto"
            disabled={!jitter.enabled}
            marks={[
              { value: 0, label: '0' },
              { value: 0.5, label: '0.5' },
              { value: 1, label: '1' }
            ]}
          />
        </Box>

        <TextField
          label="Jitter seed"
          type="number"
          size="small"
          value={jitter.seed}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            dispatch({
              type: 'scatter/setJitter',
              seed: Number.parseInt(event.target.value, 10) || jitter.seed
            })
          }
          onBlur={handleSeedBlur}
          disabled={!jitter.enabled}
          inputProps={{ min: -1_000_000, max: 1_000_000, step: 1 }}
        />

        <FormControl size="small">
          <InputLabel id="trendline-type-label">Trendline</InputLabel>
          <Select
            labelId="trendline-type-label"
            value={trendline.type}
            label="Trendline"
            onChange={handleTrendlineTypeChange}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="linear">Linear regression</MenuItem>
            <MenuItem value="polynomial">Polynomial regression</MenuItem>
            <MenuItem value="loess">LOESS smoothing</MenuItem>
          </Select>
        </FormControl>

        {trendline.type === 'polynomial' ? (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Polynomial order
            </Typography>
            <Slider
              value={trendline.polynomialOrder}
              onChange={handlePolynomialOrderChange}
              min={2}
              max={6}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        ) : null}

        {trendline.type === 'loess' ? (
          <Box>
            <Typography variant="caption" color="text.secondary">
              LOESS bandwidth
            </Typography>
            <Slider
              value={trendline.bandwidth}
              onChange={handleBandwidthChange}
              min={0.1}
              max={1}
              step={0.05}
              marks={[
                { value: 0.1, label: '0.1' },
                { value: 0.5, label: '0.5' },
                { value: 1, label: '1.0' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        ) : null}

        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">Error bars</Typography>
            <Tooltip title="Render variability as mean-based intervals or precomputed bounds.">
              <InfoOutlinedIcon fontSize="small" color="action" />
            </Tooltip>
          </Stack>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="scatter-errorbar-mode-label">Source</InputLabel>
            <Select
              labelId="scatter-errorbar-mode-label"
              value={errorBars.mode}
              label="Source"
              onChange={handleErrorBarModeChange}
            >
              <MenuItem value="off">None</MenuItem>
              <MenuItem value="fields" disabled={!continuousFields.length}>
                Bounds from fields
              </MenuItem>
              <MenuItem value="ci">Mean ± 95% CI</MenuItem>
              <MenuItem value="stderr">Mean ± standard error</MenuItem>
              <MenuItem value="stdev">Mean ± standard deviation</MenuItem>
            </Select>
          </FormControl>

          {errorBars.mode === 'fields' ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <FormControl fullWidth size="small" disabled={!continuousFields.length}>
                <InputLabel id="scatter-errorbar-lower-label">Lower bound field</InputLabel>
                <Select
                  labelId="scatter-errorbar-lower-label"
                  value={errorBars.lowerFieldId ?? ''}
                  label="Lower bound field"
                  onChange={handleLowerFieldChange}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    {continuousFields.length ? 'Select lower bound field' : 'No continuous fields available'}
                  </MenuItem>
                  {continuousFields.map((field) => (
                    <MenuItem key={field.fieldId} value={field.fieldId}>
                      {field.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" disabled={!continuousFields.length}>
                <InputLabel id="scatter-errorbar-upper-label">Upper bound field</InputLabel>
                <Select
                  labelId="scatter-errorbar-upper-label"
                  value={errorBars.upperFieldId ?? ''}
                  label="Upper bound field"
                  onChange={handleUpperFieldChange}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    {continuousFields.length ? 'Select upper bound field' : 'No continuous fields available'}
                  </MenuItem>
                  {continuousFields.map((field) => (
                    <MenuItem key={field.fieldId} value={field.fieldId}>
                      {field.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="caption" color="text.secondary">
                Provide numeric fields representing the lower and upper bounds for each row.
              </Typography>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Intervals are computed per grouping using the selected statistic. Requires numeric measures.
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default ScatterControlsPanel;

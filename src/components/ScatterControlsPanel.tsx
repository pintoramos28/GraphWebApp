'use client';

import { useCallback, type ChangeEvent, type FocusEvent } from 'react';
import {
  Box,
  Paper,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAppStore, selectScatterJitter } from '@/state/appStore';

const ScatterControlsPanel = () => {
  const jitter = useAppStore(selectScatterJitter);
  const dispatch = useAppStore((state) => state.dispatch);

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
      </Stack>
    </Paper>
  );
};

export default ScatterControlsPanel;

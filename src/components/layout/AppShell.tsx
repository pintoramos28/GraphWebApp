'use client';

import { useEffect, useMemo } from 'react';

import DashboardCustomizeRoundedIcon from '@mui/icons-material/DashboardCustomizeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import TableViewRoundedIcon from '@mui/icons-material/TableViewRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import ViewTimelineRoundedIcon from '@mui/icons-material/ViewTimelineRounded';
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';

import { VegaLiteRenderer } from '@/charts/vega-lite';
import { selectLayout, selectThemeMode, useProjectStore } from '@/state/project-store';
import type { ThemeMode } from '@/state/project-store';
import type { TopLevelSpec } from 'vega-lite';

const shelves = [
  { label: 'X Axis', description: 'Drop a numeric or time field' },
  { label: 'Y Axis', description: 'Drop numeric fields (multi-value supported)' },
  { label: 'Color', description: 'Drop categorical or ordinal field' },
  { label: 'Size', description: 'Drop numeric field to scale marks' },
  { label: 'Shape', description: 'Drop categorical field to change glyphs' },
  { label: 'Facet', description: 'Drop categorical field to split views' },
];

type SampleRecord = {
  sample: string;
  stress: number;
  strain: number;
  temperature: number;
  batch: string;
  condition: string;
};

const SAMPLE_DATA: SampleRecord[] = [
  { sample: 'A-01', stress: 42.1, strain: 0.012, temperature: 23, batch: 'A', condition: 'Baseline' },
  { sample: 'A-02', stress: 44.8, strain: 0.015, temperature: 24, batch: 'A', condition: 'Baseline' },
  { sample: 'A-03', stress: 47.2, strain: 0.017, temperature: 24, batch: 'A', condition: 'Baseline' },
  { sample: 'B-01', stress: 51.9, strain: 0.019, temperature: 26, batch: 'B', condition: 'Heat-treated' },
  { sample: 'B-02', stress: 55.1, strain: 0.02, temperature: 27, batch: 'B', condition: 'Heat-treated' },
  { sample: 'C-01', stress: 60.4, strain: 0.023, temperature: 29, batch: 'C', condition: 'Quenched' },
  { sample: 'C-02', stress: 64.8, strain: 0.027, temperature: 30, batch: 'C', condition: 'Quenched' },
  { sample: 'C-03', stress: 68.5, strain: 0.029, temperature: 31, batch: 'C', condition: 'Quenched' },
];

const buildPlaceholderSpec = (mode: ThemeMode): TopLevelSpec => {
  const axisColor = mode === 'dark' ? '#E2E8F0' : '#0F172A';
  const gridColor = mode === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(71, 85, 105, 0.2)';
  const legendColor = mode === 'dark' ? '#E2E8F0' : '#1E293B';

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    description: 'Placeholder scatter for mechanical test samples',
    background: 'transparent',
    data: { name: 'sample' },
    transform: [{ calculate: 'datum.strain * 100', as: 'strainPercent' }],
    mark: { type: 'point', filled: true, size: 120, opacity: 0.85, stroke: '#0F172A', strokeOpacity: 0.1 },
    params: [
      {
        name: 'hover',
        select: { type: 'point', on: 'pointerover', clear: 'pointerout', fields: ['sample'] },
      },
      {
        name: 'legendToggle',
        select: { type: 'point', fields: ['batch'] },
      },
    ],
    encoding: {
      x: {
        field: 'stress',
        type: 'quantitative',
        title: 'Stress (MPa)',
        scale: { nice: true, zero: false },
      },
      y: {
        field: 'strainPercent',
        type: 'quantitative',
        title: 'Strain (%)',
        scale: { nice: true, zero: false },
      },
      color: {
        field: 'batch',
        type: 'nominal',
        legend: { title: 'Batch', labelFontWeight: 'bold', orient: 'bottom' },
      },
      shape: {
        field: 'condition',
        type: 'nominal',
        legend: { title: 'Condition' },
      },
      size: {
        field: 'temperature',
        type: 'quantitative',
        title: 'Temp (°C)',
        legend: { title: 'Temp (°C)' },
      },
      opacity: {
        condition: [
          { param: 'hover', value: 1 },
          { param: 'legendToggle', value: 1 },
        ],
        value: 0.25,
      },
      tooltip: [
        { field: 'sample', type: 'nominal', title: 'Sample' },
        { field: 'batch', type: 'nominal', title: 'Batch' },
        { field: 'condition', type: 'nominal', title: 'Condition' },
        { field: 'stress', type: 'quantitative', title: 'Stress (MPa)', format: '.1f' },
        { field: 'strainPercent', type: 'quantitative', title: 'Strain (%)', format: '.2f' },
        { field: 'temperature', type: 'quantitative', title: 'Temp (°C)' },
      ],
    },
    config: {
      view: { stroke: null },
      axis: {
        labelColor: axisColor,
        titleColor: axisColor,
        gridColor,
        gridOpacity: 0.4,
        labelFontWeight: 'bold',
      },
      legend: {
        labelColor: legendColor,
        titleColor: legendColor,
      },
      background: 'transparent',
    },
  };
};

export function AppShell() {
  const themeMode = useProjectStore(selectThemeMode);
  const layout = useProjectStore(selectLayout);
  const canUndo = useProjectStore((state) => state.canUndo);
  const canRedo = useProjectStore((state) => state.canRedo);
  const dispatch = useProjectStore((state) => state.dispatch);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const placeholderSpec = useMemo(() => buildPlaceholderSpec(themeMode), [themeMode]);
  const placeholderData = useMemo(() => SAMPLE_DATA, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) {
        return;
      }

      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [redo, undo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Toolbar
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ViewInArRoundedIcon fontSize="large" aria-hidden />
          <Box>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
              Graph Builder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag fields to shelves, customize visuals, and compare insights.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" aria-label="Global controls">
          <Tooltip title="Undo (Ctrl/Cmd + Z)">
            <span>
              <IconButton
                color="inherit"
                aria-label="Undo last change"
                disabled={!canUndo}
                onClick={undo}
              >
                <UndoRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl/Cmd + Shift + Z)">
            <span>
              <IconButton
                color="inherit"
                aria-label="Redo last change"
                disabled={!canRedo}
                onClick={redo}
              >
                <RedoRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
          <Tooltip title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}>
            <IconButton
              color="inherit"
              aria-label="Toggle theme"
              onClick={() => dispatch({ type: 'toggleThemeMode' })}
            >
              {themeMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <Box
          component="nav"
          aria-label="Field list"
          sx={{
            width: { xs: '100%', md: layout.sidebarWidth },
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          <Typography variant="subtitle2" sx={{ letterSpacing: 0.5 }}>
            Dataset Overview
          </Typography>
          <Stack spacing={1.5} aria-label="Field groups">
            <Chip
              icon={<DashboardCustomizeRoundedIcon fontSize="small" aria-hidden />}
              label="Fields will appear here after import"
              color="info"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Import a dataset to populate the schema and launch drag-and-drop shelves.
            </Typography>
          </Stack>

          <Divider role="separator" aria-hidden />

          <Stack spacing={1.5} aria-label="Mapping shelves">
            {shelves.map((shelf) => (
              <Box
                key={shelf.label}
                sx={{
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                  borderRadius: 2,
                  px: 2,
                  py: 1.5,
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(15, 23, 42, 0.04)',
                }}
                role="group"
                aria-labelledby={`${shelf.label.toLowerCase()}-label`}
              >
                <Typography id={`${shelf.label.toLowerCase()}-label`} variant="subtitle2">
                  {shelf.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {shelf.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box
          component="main"
          role="main"
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 3,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(30,41,59,0.65), rgba(15,23,42,0.9))'
                : 'linear-gradient(145deg, rgba(241,245,249,0.9), rgba(226,232,240,0.6))',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography component="h2" variant="h6">
              Visual Canvas
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={layout.canvasView}
              onChange={(_, value) => {
                if (value) {
                  dispatch({ type: 'setCanvasView', view: value });
                }
              }}
              aria-label="Canvas view mode"
            >
              <ToggleButton value="chart" aria-label="Chart view">
                <ViewTimelineRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Chart
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view">
                <TableViewRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Table
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Box
            aria-live="polite"
            sx={{
              flex: 1,
              borderRadius: 3,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundColor: (theme) => theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {layout.canvasView === 'chart' ? (
              <Box sx={{ flex: 1, minHeight: { xs: 260, md: 360 } }}>
                <VegaLiteRenderer
                  spec={placeholderSpec}
                  data={{ sample: placeholderData }}
                  renderer="svg"
                  version={themeMode}
                  className="vl-chart"
                />
              </Box>
            ) : (
              <Stack
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ p: 4, flex: 1, textAlign: 'center' }}
              >
                <TableViewRoundedIcon fontSize="large" color="primary" aria-hidden />
                <Typography variant="h6">Data grid preview</Typography>
                <Typography variant="body2" color="text.secondary">
                  A virtualized schema preview will appear here as part of Phase 1. Use filters to
                  focus the dataset before mapping fields.
                </Typography>
              </Stack>
            )}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(148, 163, 184, 0.08)'
                    : 'rgba(15, 23, 42, 0.04)',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Placeholder chart shows stress vs. strain with temperature-coded markers. Import
                data to replace this view; undo/redo and theming already wire up to the chart
                harness.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          component="aside"
          aria-label="Inspector"
          sx={{
            width: { xs: '100%', md: layout.inspectorWidth },
            borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Inspector
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure encodings, scales, tooltips, and formatting. Contextual controls
            adapt based on the selected chart and active fields.
          </Typography>
          <Divider role="presentation" />
          <Stack spacing={1.5}>
            <Chip icon={<ViewInArRoundedIcon aria-hidden />} label="Mappings" color="primary" />
            <Chip icon={<ViewTimelineRoundedIcon aria-hidden />} label="Scales" variant="outlined" />
            <Chip icon={<TableViewRoundedIcon aria-hidden />} label="Tooltips" variant="outlined" />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

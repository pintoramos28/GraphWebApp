'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import type { SelectChangeEvent } from '@mui/material';
import {
  describeFilter,
  type DateRangeFilter,
  type DatasetFilter,
  type DatasetFilterId,
  type NewDatasetFilter,
  type RangeFilter
} from '@/lib/datasetFilters';
import { useImportStore } from '@/state/importStore';

type DialogMode = 'create' | 'edit';

type FilterFormState = {
  columnId: string;
  kind: DatasetFilter['kind'];
  rangeMin: string;
  rangeMax: string;
  equalsValue: string;
  containsValue: string;
  caseSensitive: boolean;
  dateStart: string;
  dateEnd: string;
};

const defaultFormState: FilterFormState = {
  columnId: '',
  kind: 'equals',
  rangeMin: '',
  rangeMax: '',
  equalsValue: '',
  containsValue: '',
  caseSensitive: false,
  dateStart: '',
  dateEnd: ''
};

const getDefaultKindForColumn = (columnType: string): DatasetFilter['kind'] => {
  switch (columnType) {
    case 'number':
      return 'range';
    case 'datetime':
      return 'dateRange';
    case 'boolean':
      return 'equals';
    default:
      return 'contains';
  }
};

const getAllowedKinds = (columnType: string): DatasetFilter['kind'][] => {
  switch (columnType) {
    case 'number':
      return ['range', 'equals'];
    case 'datetime':
      return ['dateRange', 'equals'];
    case 'boolean':
      return ['equals'];
    default:
      return ['contains', 'equals'];
  }
};

const parseNumberOrNull = (value: string): number | null | undefined => {
  if (!value.trim().length) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const DatasetFiltersPanel = () => {
  const preview = useImportStore((state) => state.preview);
  const filters = useImportStore((state) => state.filters);
  const addFilter = useImportStore((state) => state.addFilter);
  const updateFilter = useImportStore((state) => state.updateFilter);
  const removeFilter = useImportStore((state) => state.removeFilter);
  const clearFilters = useImportStore((state) => state.clearFilters);

  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [editingFilterId, setEditingFilterId] = useState<DatasetFilterId | null>(null);
  const [formState, setFormState] = useState<FilterFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns = preview?.columns ?? [];
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.fieldId, column])),
    [columns]
  );

  const selectedColumn = columnsById.get(formState.columnId);
  const allowedKinds = selectedColumn ? getAllowedKinds(selectedColumn.type) : [];

  const handleOpenDialog = (mode: DialogMode, filter?: DatasetFilter) => {
    setDialogMode(mode);
    if (mode === 'edit' && filter) {
      const column = columnsById.get(filter.columnId);
      setEditingFilterId(filter.id);
      setFormState({
        columnId: filter.columnId,
        kind: filter.kind,
        rangeMin: filter.kind === 'range' && filter.min !== undefined && filter.min !== null ? String(filter.min) : '',
        rangeMax: filter.kind === 'range' && filter.max !== undefined && filter.max !== null ? String(filter.max) : '',
        equalsValue:
          filter.kind === 'equals' && filter.value !== null && filter.value !== undefined
            ? String(filter.value)
            : '',
        containsValue: filter.kind === 'contains' ? filter.value : '',
        caseSensitive: filter.kind === 'contains' ? Boolean(filter.caseSensitive) : false,
        dateStart: filter.kind === 'dateRange' && filter.start ? filter.start.slice(0, 10) : '',
        dateEnd: filter.kind === 'dateRange' && filter.end ? filter.end.slice(0, 10) : ''
      });
      if (!columnsById.has(filter.columnId) && column) {
        setFormState((prev) => ({ ...prev, columnId: column.fieldId }));
      }
    } else {
      setEditingFilterId(null);
      const firstColumn = columns[0];
      setFormState({
        ...defaultFormState,
        columnId: firstColumn?.fieldId ?? '',
        kind: firstColumn ? getDefaultKindForColumn(firstColumn.type) : 'equals'
      });
    }
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFilterId(null);
    setFormState(defaultFormState);
    setFormError(null);
  };

  const handleColumnChange = (event: SelectChangeEvent<string>) => {
    const columnId = event.target.value;
    const column = columnsById.get(columnId);
    setFormState((prev) => ({
      ...prev,
      columnId,
      kind: column ? getDefaultKindForColumn(column.type) : prev.kind,
      rangeMin: '',
      rangeMax: '',
      equalsValue: '',
      containsValue: '',
      caseSensitive: false,
      dateStart: '',
      dateEnd: ''
    }));
  };

  const handleKindChange = (event: SelectChangeEvent<DatasetFilter['kind']>) => {
    const kind = event.target.value as DatasetFilter['kind'];
    setFormState((prev) => ({
      ...prev,
      kind,
      rangeMin: '',
      rangeMax: '',
      equalsValue: '',
      containsValue: '',
      caseSensitive: false,
      dateStart: '',
      dateEnd: ''
    }));
  };

  const buildFilterPayload = (): NewDatasetFilter | null => {
    const columnId = formState.columnId;
    const column = columnsById.get(columnId);
    if (!columnId || !column) {
      setFormError('Select a column to filter.');
      return null;
    }

    switch (formState.kind) {
      case 'range': {
        const min = parseNumberOrNull(formState.rangeMin);
        const max = parseNumberOrNull(formState.rangeMax);
        if (min === null || max === null) {
          setFormError('Range values must be valid numbers.');
          return null;
        }
        if (min !== undefined && max !== undefined && min > max) {
          setFormError('Minimum cannot be greater than maximum.');
          return null;
        }
        const payload: Omit<RangeFilter, 'id'> = {
          columnId,
          kind: 'range'
        };
        if (min !== undefined) {
          payload.min = min;
        }
        if (max !== undefined) {
          payload.max = max;
        }
        return payload;
      }
      case 'equals': {
        if (!formState.equalsValue.trim().length) {
          setFormError('Enter a comparison value.');
          return null;
        }
        let value: string | number | boolean | null = formState.equalsValue;
        if (column.type === 'number') {
          const parsed = Number(formState.equalsValue);
          if (!Number.isFinite(parsed)) {
            setFormError('Enter a numeric value.');
            return null;
          }
          value = parsed;
        } else if (column.type === 'boolean') {
          const normalized = formState.equalsValue.toLowerCase();
          if (normalized !== 'true' && normalized !== 'false') {
            setFormError('Enter “true” or “false”.');
            return null;
          }
          value = normalized === 'true';
        }
        return {
          columnId,
          kind: 'equals',
          value
        };
      }
      case 'contains': {
        if (!formState.containsValue.trim().length) {
          setFormError('Enter text to search for.');
          return null;
        }
        return {
          columnId,
          kind: 'contains',
          value: formState.containsValue.trim(),
          caseSensitive: formState.caseSensitive
        };
      }
      case 'dateRange': {
        const payload: Omit<DateRangeFilter, 'id'> = {
          columnId,
          kind: 'dateRange'
        };
        if (formState.dateStart) {
          payload.start = new Date(formState.dateStart).toISOString();
        }
        if (formState.dateEnd) {
          payload.end = new Date(formState.dateEnd).toISOString();
        }
        return payload;
      }
      default:
        return null;
    }
  };

  const handleSubmit = () => {
    const payload = buildFilterPayload();
    if (!payload) {
      return;
    }
    if (dialogMode === 'edit' && editingFilterId) {
      updateFilter(editingFilterId, payload as DatasetFilter);
    } else {
      addFilter(payload);
    }
    handleCloseDialog();
  };

  const renderFilterForm = () => {
    if (!columns.length) {
      return <Typography variant="body2">Import data to create filters.</Typography>;
    }

    return (
      <Stack spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel id="filter-column-label">Column</InputLabel>
          <Select
            labelId="filter-column-label"
            label="Column"
            value={formState.columnId}
            onChange={handleColumnChange}
          >
            {columns.map((column) => (
              <MenuItem key={column.fieldId} value={column.fieldId}>
                {column.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!selectedColumn}>
          <InputLabel id="filter-kind-label">Filter type</InputLabel>
          <Select
            labelId="filter-kind-label"
            label="Filter type"
            value={formState.kind}
            onChange={handleKindChange}
          >
            {allowedKinds.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {kind === 'range'
                  ? 'Range'
                  : kind === 'equals'
                    ? 'Equals'
                    : kind === 'contains'
                      ? 'Contains'
                      : 'Date range'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {formState.kind === 'range' ? (
          <Stack direction="row" spacing={2}>
            <TextField
              label="Minimum"
              size="small"
              fullWidth
              value={formState.rangeMin}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, rangeMin: event.target.value }))
              }
            />
            <TextField
              label="Maximum"
              size="small"
              fullWidth
              value={formState.rangeMax}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, rangeMax: event.target.value }))
              }
            />
          </Stack>
        ) : null}

        {formState.kind === 'equals' ? (
          selectedColumn?.type === 'boolean' ? (
            <FormControl fullWidth size="small">
              <InputLabel id="boolean-value-label">Value</InputLabel>
              <Select
                labelId="boolean-value-label"
                label="Value"
                value={formState.equalsValue || 'true'}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, equalsValue: event.target.value }))
                }
              >
                <MenuItem value="true">True</MenuItem>
                <MenuItem value="false">False</MenuItem>
              </Select>
            </FormControl>
          ) : (
            <TextField
              label="Value"
              size="small"
              fullWidth
              value={formState.equalsValue}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, equalsValue: event.target.value }))
              }
            />
          )
        ) : null}

        {formState.kind === 'contains' ? (
          <Stack spacing={1.5}>
            <TextField
              label="Contains"
              size="small"
              fullWidth
              value={formState.containsValue}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, containsValue: event.target.value }))
              }
            />
            <FormControl size="small">
              <Select
                value={formState.caseSensitive ? 'case-sensitive' : 'case-insensitive'}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    caseSensitive: event.target.value === 'case-sensitive'
                  }))
                }
              >
                <MenuItem value="case-insensitive">Case insensitive</MenuItem>
                <MenuItem value="case-sensitive">Case sensitive</MenuItem>
              </Select>
              <FormHelperText>Match options</FormHelperText>
            </FormControl>
          </Stack>
        ) : null}

        {formState.kind === 'dateRange' ? (
          <Stack direction="row" spacing={2}>
            <TextField
              label="Start date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formState.dateStart}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, dateStart: event.target.value }))
              }
            />
            <TextField
              label="End date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formState.dateEnd}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, dateEnd: event.target.value }))
              }
            />
          </Stack>
        ) : null}

        {formError ? <FormHelperText error>{formError}</FormHelperText> : null}
      </Stack>
    );
  };

  return (
    <Stack spacing={1.5} sx={{ marginTop: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <FilterAltIcon fontSize="small" />
        <Typography variant="subtitle1">Filters</Typography>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {filters.map((filter) => {
          const column = columnsById.get(filter.columnId);
          return (
            <Chip
              key={filter.id}
              label={describeFilter(filter, column)}
              onClick={() => handleOpenDialog('edit', filter)}
              onDelete={() => removeFilter(filter.id)}
              sx={{ marginBottom: 1 }}
            />
          );
        })}
        {!filters.length && (
          <Typography variant="body2" color="text.secondary">
            No filters applied.
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          disabled={!columns.length}
          data-testid="filter-add-button"
        >
          Add filter
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ClearAllIcon />}
          onClick={clearFilters}
          disabled={!filters.length}
          data-testid="filter-clear-button"
        >
          Clear
        </Button>
      </Stack>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'edit' ? 'Edit filter' : 'Add filter'}</DialogTitle>
        <DialogContent>{renderFilterForm()}</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!columns.length}
            data-testid="filter-submit-button"
          >
            {dialogMode === 'edit' ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default DatasetFiltersPanel;

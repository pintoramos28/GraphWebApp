'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { createDefaultLabel } from '@/lib/fieldMetadata';
import { useImportStore } from '@/state/importStore';
import { useAppStore } from '@/state/appStore';
import { sanitizeColumnType, validateColumnType, type ColumnType } from '@/lib/typeValidation';

const DataPreviewTable = () => {
  const [validationState, setValidationState] = useState<Record<string, string | null>>({});
  const preview = useImportStore((state) => state.preview);
  const filters = useImportStore((state) => state.filters);
  const clearFilters = useImportStore((state) => state.clearFilters);
  const lastFilterDurationMs = useImportStore((state) => state.lastFilterDurationMs);
  const overrideColumnType = useImportStore((state) => state.overrideColumnType);
  const renameColumn = useImportStore((state) => state.renameColumn);
  const setColumnLabel = useImportStore((state) => state.setColumnLabel);
  const setColumnUnit = useImportStore((state) => state.setColumnUnit);
  const dispatch = useAppStore((state) => state.dispatch);

  const previewColumns = preview?.columns;
  const columns = useMemo(() => previewColumns ?? [], [previewColumns]);
  const rows = useMemo(() => {
    if (!preview) {
      return [] as Array<Record<string, unknown>>;
    }
    return preview.filteredRows ?? preview.rows;
  }, [preview]);
  const totalRowCount = preview?.rows.length ?? 0;
  const filteredRowCount = preview?.filteredRowCount ?? rows.length;
  const truncated = preview?.truncated ?? false;
  const datasetId = preview?.datasetId ?? null;
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [renameErrors, setRenameErrors] = useState<Record<string, string | null>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const handleTypeChange = useCallback(
    (fieldId: string, event: SelectChangeEvent<string>) => {
      const requestedType = sanitizeColumnType(event.target.value);
      const { valid } = validateColumnType(rows, fieldId, requestedType);

      if (valid) {
        overrideColumnType(fieldId, requestedType);
        setValidationState((current) => ({ ...current, [fieldId]: null }));
      } else {
        setExpandedFields((current) => ({ ...current, [fieldId]: true }));
        setValidationState((current) => ({
          ...current,
          [fieldId]: `Values cannot be parsed as ${requestedType}.`
        }));
      }
    },
    [overrideColumnType, rows]
  );

  const allowedTypes = useMemo(() => {
    const baseTypes: ColumnType[] = ['string', 'number', 'boolean', 'datetime', 'object'];
    return baseTypes;
  }, []);

  useEffect(() => {
    setRenameDrafts((current) =>
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.fieldId] = column.name;
        return acc;
      }, {})
    );
    setLabelDrafts((current) =>
      columns.reduce<Record<string, string>>((acc, column) => {
        if (column.hasLabelOverride) {
          acc[column.fieldId] = column.label;
        } else {
          const existing = current[column.fieldId];
          acc[column.fieldId] = existing ?? column.name;
        }
        return acc;
      }, {})
    );
    setUnitDrafts((current) =>
      columns.reduce<Record<string, string>>((acc, column) => {
        const existing = current[column.fieldId];
        acc[column.fieldId] = column.hasUnitOverride ? column.unit : existing ?? '';
        return acc;
      }, {})
    );
    setRenameErrors({});
    setExpandedFields((current) => {
      const next: Record<string, boolean> = {};
      columns.forEach((column) => {
        next[column.fieldId] = current[column.fieldId] ?? false;
      });
      return next;
    });
  }, [columns]);

  const commitRename = useCallback(
    (fieldId: string) => {
      const currentColumn = columns.find((column) => column.fieldId === fieldId);
      if (!currentColumn) {
        return;
      }
      const draft = renameDrafts[fieldId] ?? currentColumn.name;
      const trimmed = draft.trim();
      if (!trimmed) {
        setExpandedFields((existing) => ({ ...existing, [fieldId]: true }));
        setRenameDrafts((existing) => ({ ...existing, [fieldId]: currentColumn.name }));
        setRenameErrors((existing) => ({
          ...existing,
          [fieldId]: 'Field name cannot be empty.'
        }));
        return;
      }

      const duplicate = columns.some(
        (column) =>
          column.fieldId !== fieldId && column.name.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0
      );
      if (duplicate) {
        setExpandedFields((existing) => ({ ...existing, [fieldId]: true }));
        setRenameDrafts((existing) => ({ ...existing, [fieldId]: currentColumn.name }));
        setRenameErrors((existing) => ({
          ...existing,
          [fieldId]: 'Field name must be unique.'
        }));
        return;
      }

      setRenameErrors((existing) => ({ ...existing, [fieldId]: null }));
      if (trimmed !== currentColumn.name) {
        renameColumn(fieldId, trimmed);
        if (datasetId) {
          const nextLabel = currentColumn.hasLabelOverride
            ? currentColumn.label
            : createDefaultLabel(trimmed);
          dispatch({
            type: 'datasets/updateField',
            datasetId,
            fieldId,
            changes: {
              name: trimmed,
              label: nextLabel
            }
          });
        }
      }
    },
    [columns, datasetId, dispatch, renameColumn, renameDrafts]
  );

  const commitLabel = useCallback(
    (fieldId: string) => {
      const column = columns.find((item) => item.fieldId === fieldId);
      if (!column) {
        return;
      }
      const draft = labelDrafts[fieldId] ?? (column.hasLabelOverride ? column.label : column.name);
      const trimmed = draft.trim();

      if (!column.hasLabelOverride && trimmed === column.name) {
        setLabelDrafts((current) => ({
          ...current,
          [fieldId]: column.name
        }));
        return;
      }

      setColumnLabel(fieldId, draft);
      if (datasetId) {
        const nextLabel =
          trimmed.length > 0 ? trimmed : createDefaultLabel(column.name);
        dispatch({
          type: 'datasets/updateField',
          datasetId,
          fieldId,
          changes: {
            label: nextLabel
          }
        });
      }
    },
    [columns, datasetId, dispatch, labelDrafts, setColumnLabel]
  );

  const commitUnit = useCallback(
    (fieldId: string) => {
      const draft = unitDrafts[fieldId] ?? '';
      setColumnUnit(fieldId, draft);
      if (datasetId) {
        dispatch({
          type: 'datasets/updateField',
          datasetId,
          fieldId,
          changes: {
            unit: draft.trim()
          }
        });
      }
    },
    [datasetId, dispatch, setColumnUnit, unitDrafts]
  );

  if (!preview) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{ padding: 2, borderRadius: 3, border: '1px solid var(--surface-border)' }}
      data-testid="data-preview-table"
    >
      <Stack spacing={1} sx={{ marginBottom: 2 }}>
        <Typography variant="h6">Data Preview</Typography>
        <Typography variant="body2" color="text.secondary">
          {filters.length
            ? `Showing ${filteredRowCount.toLocaleString()} of ${totalRowCount.toLocaleString()} rows${truncated ? ' (preview limited to first 1,000 rows)' : ''}.`
            : `Showing ${rows.length.toLocaleString()} rows${truncated ? ' (preview limited to first 1,000 rows)' : ''}.`}
          {' '}Scroll horizontally to view additional columns.
          {lastFilterDurationMs && filters.length ? ` Filtered in ${lastFilterDurationMs.toFixed(1)}ms.` : ''}
        </Typography>
      </Stack>
      {filters.length > 0 && filteredRowCount === 0 ? (
        <Alert
          severity="warning"
          sx={{ marginBottom: 2 }}
          action={
            <Button color="warning" size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        >
          No data matches the current filters.
        </Alert>
      ) : null}
      <div className="data-preview-table__container">
        <table className="data-preview-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.fieldId}>
                  <Stack
                    spacing={0.5}
                    alignItems="stretch"
                    sx={{ minWidth: 220 }}
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <TextField
                        label="Display label"
                        size="small"
                        value={
                          labelDrafts[column.fieldId] ??
                          (column.hasLabelOverride ? column.label : column.name)
                        }
                        onChange={(event) =>
                          setLabelDrafts((current) => ({
                            ...current,
                            [column.fieldId]: event.target.value
                          }))
                        }
                        onBlur={() => commitLabel(column.fieldId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            commitLabel(column.fieldId);
                          } else if (event.key === 'Escape') {
                            setLabelDrafts((current) => ({
                              ...current,
                              [column.fieldId]: column.hasLabelOverride ? column.label : ''
                            }));
                          }
                        }}
                        variant="outlined"
                        margin="dense"
                        inputProps={{ 'data-testid': `column-label-input-${column.fieldId}` }}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        aria-label={`Toggle metadata for ${column.name}`}
                        aria-expanded={expandedFields[column.fieldId] ?? false}
                        onClick={() =>
                          setExpandedFields((current) => ({
                            ...current,
                            [column.fieldId]: !(current[column.fieldId] ?? false)
                          }))
                        }
                      >
                        {(expandedFields[column.fieldId] ?? false) ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Stack>
                    <Collapse in={expandedFields[column.fieldId] ?? false} timeout="auto">
                      <Stack spacing={0.5} mt={0.5}>
                        <TextField
                          label="Field name"
                          size="small"
                          value={renameDrafts[column.fieldId] ?? column.name}
                          onChange={(event) =>
                            setRenameDrafts((current) => ({
                              ...current,
                              [column.fieldId]: event.target.value
                            }))
                          }
                          onBlur={() => commitRename(column.fieldId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              commitRename(column.fieldId);
                            } else if (event.key === 'Escape') {
                              setRenameDrafts((current) => ({
                                ...current,
                                [column.fieldId]: column.name
                              }));
                              setRenameErrors((current) => ({ ...current, [column.fieldId]: null }));
                            }
                          }}
                          error={Boolean(renameErrors[column.fieldId])}
                          inputProps={{ 'data-testid': `column-name-input-${column.fieldId}` }}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                        {renameErrors[column.fieldId] ? (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ marginTop: -0.25 }}
                            data-testid={`column-name-error-${column.fieldId}`}
                          >
                            {renameErrors[column.fieldId]}
                          </Typography>
                        ) : null}
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Select
                            size="small"
                            value={column.type}
                            onChange={(event) => handleTypeChange(column.fieldId, event)}
                            className="data-preview-table__column-type-select"
                            displayEmpty
                            inputProps={{ 'aria-label': `Column type for ${column.name}` }}
                            sx={{ minWidth: 120 }}
                          >
                            {allowedTypes.map((typeOption) => (
                              <MenuItem key={typeOption} value={typeOption}>
                                {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                              </MenuItem>
                            ))}
                          </Select>
                          <TextField
                            label="Unit"
                            placeholder="e.g., kg, °C"
                            size="small"
                            value={
                              unitDrafts[column.fieldId] ??
                              (column.hasUnitOverride ? column.unit : '')
                            }
                            onChange={(event) =>
                              setUnitDrafts((current) => ({
                                ...current,
                                [column.fieldId]: event.target.value
                              }))
                            }
                            onBlur={() => commitUnit(column.fieldId)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitUnit(column.fieldId);
                              } else if (event.key === 'Escape') {
                                setUnitDrafts((current) => ({
                                  ...current,
                                  [column.fieldId]: column.hasUnitOverride ? column.unit : ''
                                }));
                              }
                            }}
                            variant="outlined"
                            margin="dense"
                            inputProps={{ 'data-testid': `column-unit-input-${column.fieldId}` }}
                            sx={{ maxWidth: 110 }}
                          />
                        </Stack>
                        {column.originalType && column.originalType !== column.type ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            className="data-preview-table__column-original"
                          >
                            Auto type: {column.originalType}
                          </Typography>
                        ) : null}
                        {validationState[column.fieldId] ? (
                          <Typography
                            variant="caption"
                            color="error"
                            className="data-preview-table__column-error"
                          >
                            {validationState[column.fieldId]}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Collapse>
                  </Stack>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${preview.datasetId}-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.fieldId}-${index}`}>
                    {renderCellValue(row[column.fieldId])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Paper>
  );
};

const renderCellValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : 'NaN';
  }
  return String(value);
};

export default memo(DataPreviewTable);

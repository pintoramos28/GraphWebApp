'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { createDefaultLabel } from '@/lib/fieldMetadata';
import { useImportStore } from '@/state/importStore';
import { useAppStore } from '@/state/appStore';
import { sanitizeColumnType, validateColumnType, type ColumnType } from '@/lib/typeValidation';

const DataPreviewTable = () => {
  const [validationState, setValidationState] = useState<Record<string, string | null>>({});
  const preview = useImportStore((state) => state.preview);
  const overrideColumnType = useImportStore((state) => state.overrideColumnType);
  const renameColumn = useImportStore((state) => state.renameColumn);
  const setColumnLabel = useImportStore((state) => state.setColumnLabel);
  const setColumnUnit = useImportStore((state) => state.setColumnUnit);
  const dispatch = useAppStore((state) => state.dispatch);

  const columns = useMemo(() => preview?.columns ?? [], [preview?.columns]);
  const rows = useMemo(() => preview?.rows ?? [], [preview?.rows]);
  const truncated = preview?.truncated ?? false;
  const datasetId = preview?.datasetId ?? null;
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [renameErrors, setRenameErrors] = useState<Record<string, string | null>>({});

  const handleTypeChange = useCallback(
    (fieldId: string, event: SelectChangeEvent<string>) => {
      const requestedType = sanitizeColumnType(event.target.value);
      const { valid } = validateColumnType(rows, fieldId, requestedType);

      if (valid) {
        overrideColumnType(fieldId, requestedType);
        setValidationState((current) => ({ ...current, [fieldId]: null }));
      } else {
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
    setRenameDrafts(
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.fieldId] = column.name;
        return acc;
      }, {})
    );
    setLabelDrafts(
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.fieldId] = column.hasLabelOverride ? column.label : '';
        return acc;
      }, {})
    );
    setUnitDrafts(
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.fieldId] = column.hasUnitOverride ? column.unit : '';
        return acc;
      }, {})
    );
    setRenameErrors({});
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
      const draft = labelDrafts[fieldId] ?? '';
      setColumnLabel(fieldId, draft);
      if (datasetId) {
        const column = columns.find((item) => item.fieldId === fieldId);
        if (!column) {
          return;
        }
        const trimmed = draft.trim();
        const nextLabel = trimmed.length > 0 ? trimmed : createDefaultLabel(column.name);
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
          Showing {rows.length.toLocaleString()} rows{truncated ? ' (preview limited to first 1,000 rows)' : ''}.
          Scroll horizontally to view additional columns.
        </Typography>
      </Stack>
      <div className="data-preview-table__container">
        <table className="data-preview-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.fieldId}>
                  <Stack spacing={0.75} alignItems="stretch" sx={{ minWidth: 220 }}>
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
                      helperText={renameErrors[column.fieldId] ?? ' '}
                      FormHelperTextProps={{ sx: { minHeight: 18 } }}
                      inputProps={{ 'data-testid': `column-name-input-${column.fieldId}` }}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                    />
                    <Select
                      size="small"
                      value={column.type}
                      onChange={(event) => handleTypeChange(column.fieldId, event)}
                      className="data-preview-table__column-type-select"
                      displayEmpty
                      inputProps={{ 'aria-label': `Column type for ${column.name}` }}
                      sx={{ width: '100%' }}
                    >
                      {allowedTypes.map((typeOption) => (
                        <MenuItem key={typeOption} value={typeOption}>
                          {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
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
                    <TextField
                      label="Display label"
                      placeholder="Defaults to field name"
                      size="small"
                      value={
                        labelDrafts[column.fieldId] ??
                        (column.hasLabelOverride ? column.label : '')
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
                      helperText=" "
                      variant="outlined"
                      margin="dense"
                      inputProps={{ 'data-testid': `column-label-input-${column.fieldId}` }}
                      fullWidth
                    />
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
                      helperText=" "
                      variant="outlined"
                      margin="dense"
                      inputProps={{ 'data-testid': `column-unit-input-${column.fieldId}` }}
                      fullWidth
                    />
                    <Stack spacing={0} alignItems="flex-start">
                      <Typography variant="caption" color="text.secondary">
                        Label preview: {column.label}
                        {column.unit ? ` (${column.unit})` : ''}
                      </Typography>
                    </Stack>
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

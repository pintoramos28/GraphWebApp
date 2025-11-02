'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useImportStore } from '@/state/importStore';
import { sanitizeColumnType, validateColumnType } from '@/lib/typeValidation';

const DataPreviewTable = () => {
  const [validationState, setValidationState] = useState<Record<string, string | null>>({});
  const preview = useImportStore((state) => state.preview);
  const overrideColumnType = useImportStore((state) => state.overrideColumnType);

  const columns = useMemo(() => preview?.columns ?? [], [preview?.columns]);
  const rows = useMemo(() => preview?.rows ?? [], [preview?.rows]);
  const truncated = preview?.truncated ?? false;

  const handleTypeChange = useCallback(
    (columnName: string, event: SelectChangeEvent<string>) => {
      const requestedType = sanitizeColumnType(event.target.value);
      const { valid } = validateColumnType(rows, columnName, requestedType);

      if (valid) {
        overrideColumnType(columnName, requestedType);
        setValidationState((current) => ({ ...current, [columnName]: null }));
      } else {
        setValidationState((current) => ({
          ...current,
          [columnName]: `Values cannot be parsed as ${requestedType}.`
        }));
      }
    },
    [overrideColumnType, rows]
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
                <th key={column.name}>
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Typography variant="subtitle2" component="span">
                      {column.name}
                    </Typography>
                    <Select
                      size="small"
                      value={column.type}
                      onChange={(event) => handleTypeChange(column.name, event)}
                      className="data-preview-table__column-type-select"
                      displayEmpty
                      inputProps={{ 'aria-label': `Column type for ${column.name}` }}
                    >
                      <MenuItem value="string">String</MenuItem>
                      <MenuItem value="number">Number</MenuItem>
                      <MenuItem value="boolean">Boolean</MenuItem>
                      <MenuItem value="datetime">Datetime</MenuItem>
                      <MenuItem value="object">Object</MenuItem>
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
                    {validationState[column.name] ? (
                      <Typography
                        variant="caption"
                        color="error"
                        className="data-preview-table__column-error"
                      >
                        {validationState[column.name]}
                      </Typography>
                    ) : null}
                  </Stack>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${preview.datasetId}-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.name}-${index}`}>
                    {renderCellValue(row[column.name])}
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

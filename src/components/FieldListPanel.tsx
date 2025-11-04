'use client';

import { forwardRef, memo, useEffect, useMemo, useState, type HTMLAttributes } from 'react';
import { Button, Collapse, Paper, Stack, TextField, Typography, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useDraggable } from '@dnd-kit/core';
import type { EncodingField } from '@/lib/encodingTypes';
import { getFieldCategory } from '@/lib/shelfConfig';

type FieldListPanelProps = {
  fields: EncodingField[];
  datasetName: string;
};

const categoryLabel = (field: EncodingField) => {
  const category = getFieldCategory(field);
  switch (category) {
    case 'quantitative':
      return 'Continuous';
    case 'temporal':
      return 'Date/Time';
    case 'categorical':
      return 'Categorical';
    default:
      return 'Other';
  }
};

type FieldPillProps = HTMLAttributes<HTMLDivElement> & {
  field: EncodingField;
  dragging?: boolean;
  variant?: 'list' | 'overlay';
};

const FieldPill = forwardRef<HTMLDivElement, FieldPillProps>(
  ({ field, dragging = false, variant = 'list', className, style, ...rest }, ref) => {
    const overlay = variant === 'overlay';
    const combinedClassName = [
      'encoding-field-list__item',
      overlay ? 'encoding-field-list__item--overlay' : '',
      className ?? ''
    ]
      .filter(Boolean)
      .join(' ');

    const combinedStyle = {
      opacity: dragging && !overlay ? 0.4 : 1,
      cursor: overlay ? 'grabbing' : dragging ? 'grabbing' : 'grab',
      pointerEvents: overlay ? 'none' : style?.pointerEvents,
      ...style
    };

    return (
      <Stack
        ref={ref}
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        className={combinedClassName}
        style={combinedStyle}
        {...rest}
      >
        <Stack spacing={0.5} flex={1}>
        <Typography variant="subtitle2">{field.label ?? field.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {field.name}
        </Typography>
      </Stack>
      <Chip label={categoryLabel(field)} size="small" variant="outlined" />
      </Stack>
    );
  }
);

FieldPill.displayName = 'FieldPill';

const FieldListItem = ({ field }: { field: EncodingField }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: field.fieldId,
    data: { fieldId: field.fieldId }
  });

  return (
    <FieldPill
      ref={setNodeRef}
      field={field}
      dragging={isDragging}
      variant="list"
      aria-label={`Drag ${field.label ?? field.name}`}
      {...listeners}
      {...attributes}
    />
  );
};

const FieldListPanel = ({ fields, datasetName }: FieldListPanelProps) => {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setHydrated(true);
  }, []);

  const filteredFields = useMemo(() => {
    if (!query.trim()) {
      return fields;
    }
    const normalized = query.trim().toLowerCase();
    return fields.filter((field) => {
      const label = field.label ?? field.name;
      return (
        label.toLowerCase().includes(normalized) ||
        field.name.toLowerCase().includes(normalized)
      );
    });
  }, [fields, query]);

  return (
    <Paper variant="outlined" className="encoding-field-list">
      <Typography variant="subtitle1" component="h2" gutterBottom>
        Fields
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        {datasetName}
      </Typography>
      <Button
        size="small"
        variant="text"
        onClick={() => setOpen((value) => !value)}
        endIcon={open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start', paddingX: 0 }}
      >
        {open ? 'Hide field list' : 'Show field list'}
      </Button>
      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        size="small"
        placeholder="Search fields…"
        inputProps={{ 'aria-label': 'Search fields' }}
        fullWidth
        sx={{ marginTop: 1 }}
      />
      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Import a dataset to populate fields.
        </Typography>
      ) : hydrated ? (
        <Collapse in={open} unmountOnExit>
          <div className="encoding-field-list__scroll">
            <Stack spacing={1} component="ul" className="encoding-field-list__items">
              {filteredFields.length ? (
                filteredFields.map((field) => (
                  <li key={field.fieldId}>
                    <FieldListItem field={field} />
                  </li>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" paddingY={1} paddingX={0.5}>
                  No fields match “{query.trim()}”.
                </Typography>
              )}
            </Stack>
          </div>
        </Collapse>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Preparing drag handles…
        </Typography>
      )}
    </Paper>
  );
};

export const FieldDragPreview = ({ field }: { field: EncodingField }) => (
  <FieldPill field={field} variant="overlay" />
);

export default memo(FieldListPanel);

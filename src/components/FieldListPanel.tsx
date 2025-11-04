'use client';

import { memo, useEffect, useState } from 'react';
import { Paper, Stack, Typography, Chip } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import type { EncodingField } from '@/lib/encodingTypes';
import { getFieldCategory } from '@/lib/shelfConfig';

type FieldListPanelProps = {
  fields: EncodingField[];
  datasetName: string;
};

const categoryLabel = (type: string) => {
  const category = getFieldCategory(type);
  switch (category) {
    case 'quantitative':
      return 'Numeric';
    case 'temporal':
      return 'Date/Time';
    case 'categorical':
      return 'Categorical';
    default:
      return 'Other';
  }
};

const FieldListItem = ({ field }: { field: EncodingField }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: field.fieldId,
    data: { fieldId: field.fieldId }
  });

  return (
    <Stack
      direction="row"
      spacing={1}
      ref={setNodeRef}
      className="encoding-field-list__item"
      aria-label={`Drag ${field.label ?? field.name}`}
      {...listeners}
      {...attributes}
      sx={{
        opacity: isDragging ? 0.4 : 1
      }}
    >
      <Stack spacing={0.5} flex={1}>
        <Typography variant="subtitle2">{field.label ?? field.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {field.name}
        </Typography>
      </Stack>
      <Chip label={categoryLabel(field.type)} size="small" variant="outlined" />
    </Stack>
  );
};

const FieldListPanel = ({ fields, datasetName }: FieldListPanelProps) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <Paper variant="outlined" className="encoding-field-list">
      <Typography variant="subtitle1" component="h2" gutterBottom>
        Fields
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        {datasetName}
      </Typography>
      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Import a dataset to populate fields.
        </Typography>
      ) : hydrated ? (
        <Stack spacing={1} component="ul" className="encoding-field-list__items">
          {fields.map((field) => (
            <li key={field.fieldId}>
              <FieldListItem field={field} />
            </li>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Preparing drag handles…
        </Typography>
      )}
    </Paper>
  );
};

export default memo(FieldListPanel);

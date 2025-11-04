'use client';

import { memo } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import type { EncodingDataset, EncodingField } from '@/lib/encodingTypes';
import type { ShelfAssignments, ShelfKey } from '@/state/appStore';
import { SHELF_DEFINITIONS, getShelfDefinition } from '@/lib/shelfConfig';

type EncodingShelvesProps = {
  dataset: EncodingDataset;
  assignments: ShelfAssignments;
  onClearShelf: (shelf: ShelfKey) => void;
  dropError: string | null;
};

type ShelfDropZoneProps = {
  shelf: ShelfKey;
  field: EncodingField | undefined;
  onClear: (shelf: ShelfKey) => void;
};

const ShelfDropZone = ({ shelf, field, onClear }: ShelfDropZoneProps) => {
  const definition = getShelfDefinition(shelf);
  const { isOver, setNodeRef } = useDroppable({
    id: shelf,
    data: { shelf }
  });

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      className={`encoding-shelf ${isOver ? 'encoding-shelf--over' : ''}`}
      aria-label={`${definition.label} shelf`}
    >
      <Typography variant="subtitle2" component="div">
        {definition.label}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div">
        {definition.helper}
      </Typography>
      {field ? (
        <Stack spacing={0.5} mt={1}>
          <Typography variant="body2" fontWeight={600}>
            {field.label ?? field.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {field.name}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => onClear(shelf)}
            sx={{ width: 'fit-content', padding: 0 }}
          >
            Clear
          </Button>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" mt={1}>
          Drag a field here
        </Typography>
      )}
    </Paper>
  );
};

const EncodingShelves = ({ dataset, assignments, onClearShelf, dropError }: EncodingShelvesProps) => {
  const fieldMap = new Map(dataset.fields.map((field) => [field.fieldId, field]));

  return (
    <Paper variant="outlined" className="encoding-shelves">
      <Typography variant="subtitle1" component="h2" gutterBottom>
        Encoding shelves
      </Typography>
      <div className="encoding-shelves__grid">
        {SHELF_DEFINITIONS.map((definition) => (
          <ShelfDropZone
            key={definition.key}
            shelf={definition.key}
            field={assignments[definition.key] ? fieldMap.get(assignments[definition.key]!) : undefined}
            onClear={onClearShelf}
          />
        ))}
      </div>
      {dropError ? (
        <Alert severity="warning" role="status" aria-live="polite" sx={{ mt: 2 }}>
          {dropError}
        </Alert>
      ) : null}
    </Paper>
  );
};

export default memo(EncodingShelves);

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { selectShelves, useAppStore, type ShelfAssignments, type ShelfKey } from '@/state/appStore';
import { useImportStore } from '@/state/importStore';
import type { EncodingDataset, EncodingField } from '@/lib/encodingTypes';
import FieldListPanel, { FieldDragPreview } from './FieldListPanel';
import EncodingShelves from './EncodingShelves';
import { SAMPLE_DATASET } from '@/lib/sampleDataset';
import { buildEncodingSpec } from '@/charts/specBuilder';
import VegaLiteChart from './VegaLiteChart';
import DataPreviewTable from './DataPreviewTable';
import { validateShelfAssignment } from '@/lib/shelfConfig';

const SAMPLE_SHELF_ASSIGNMENTS: ShelfAssignments = {
  x: 'hours',
  y: 'defects',
  color: 'team',
  shape: 'team'
};

const resolveDataset = (preview: ReturnType<typeof useImportStore.getState>['preview']): EncodingDataset => {
  if (!preview) {
    return SAMPLE_DATASET;
  }
  const rows = (preview.filteredRows?.length ?? 0) > 0 ? preview.filteredRows : preview.rows;
  const fields: EncodingField[] = preview.columns.map((column) => ({
    fieldId: column.fieldId,
    name: column.name,
    label: column.label,
    semanticType: column.semanticType,
    unit: column.unit,
    type: column.type
  }));
  return {
    id: preview.datasetId,
    name: preview.fileName,
    fields,
    rows
  };
};

const EncodingWorkspace = () => {
  const preview = useImportStore((state) => state.preview);
  const dataset = useMemo(() => resolveDataset(preview), [preview]);
  const dispatch = useAppStore((state) => state.dispatch);
  const shelves = useAppStore(selectShelves);
  const [dropError, setDropError] = useState<string | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4
      }
    })
  );

  const fieldMap = useMemo(() => new Map(dataset.fields.map((field) => [field.fieldId, field])), [dataset.fields]);

  useEffect(() => {
    const validFieldIds = new Set(dataset.fields.map((field) => field.fieldId));
    (Object.entries(shelves) as Array<[ShelfKey, string]>).forEach(([shelf, fieldId]) => {
      if (!validFieldIds.has(fieldId)) {
        dispatch({ type: 'shelf/clear', shelf });
      }
    });
  }, [dataset.fields, dispatch, shelves]);

  const handleClearShelf = useCallback(
    (shelf: ShelfKey) => {
      dispatch({ type: 'shelf/clear', shelf });
    },
    [dispatch]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const fieldId = event.active.data?.current?.fieldId ?? event.active.id;
      setDropError(null);
      if (typeof fieldId === 'string') {
        setActiveFieldId(fieldId);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveFieldId(null);
      const { active, over } = event;
      if (!over) {
        setDropError(null);
        return;
      }
      const fieldId = active.data?.current?.fieldId ?? active.id;
      if (typeof fieldId !== 'string') {
        setDropError(null);
        return;
      }
      const shelf = over.id as ShelfKey;
      const field = fieldMap.get(fieldId);
      if (!field) {
        setDropError('Dropped field is no longer available.');
        return;
      }
      const validation = validateShelfAssignment(shelf, field);
      if (!validation.valid) {
        setDropError(validation.reason);
        return;
      }
      dispatch({ type: 'shelf/assign', shelf, fieldId });
      setDropError(null);
    },
    [dispatch, fieldMap]
  );
  const handleDragCancel = useCallback(() => {
    setActiveFieldId(null);
    setDropError(null);
  }, []);

  const spec = useMemo(() => buildEncodingSpec(dataset, shelves), [dataset, shelves]);
  const sampleSpec = useMemo(
    () => (preview ? null : buildEncodingSpec(SAMPLE_DATASET, SAMPLE_SHELF_ASSIGNMENTS)),
    [preview]
  );
  const specToRender = spec ?? sampleSpec;
  const activeField = activeFieldId ? dataset.fields.find((field) => field.fieldId === activeFieldId) ?? null : null;

  return (
    <div className="encoding-workspace">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div className="encoding-workspace__board">
          <FieldListPanel fields={dataset.fields} datasetName={dataset.name} />
          <EncodingShelves dataset={dataset} assignments={shelves} onClearShelf={handleClearShelf} dropError={dropError} />
        </div>
        <DragOverlay dropAnimation={null}>
          {activeField ? <FieldDragPreview field={activeField} /> : null}
        </DragOverlay>
      </DndContext>
      {specToRender ? (
        <div className="chart-card__content" data-testid="sample-scatter">
          <VegaLiteChart
            spec={specToRender}
            aria-label="Scatter exploration generated from shelf assignments"
          />
        </div>
      ) : (
        <Stack spacing={1} className="chart-card__placeholder" data-testid="sample-scatter">
          <Typography variant="h6">Assign fields to X and Y to generate a chart.</Typography>
          <Typography variant="body2" color="text.secondary">
            Drag a continuous field to the Y shelf and a continuous, temporal, or categorical field to the X shelf.
          </Typography>
          {Object.keys(shelves).length > 0 ? (
            <Alert severity="info">
              Valid axes require compatible fields. Ensure at least one axis has a supported field.
            </Alert>
          ) : null}
        </Stack>
      )}
      <DataPreviewTable />
    </div>
  );
};

export default EncodingWorkspace;

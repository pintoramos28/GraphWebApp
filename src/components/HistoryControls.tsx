'use client';

import { useCallback } from 'react';
import { Button, Stack } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { useAppStore } from '@/state/appStore';

const schedulePostCommit = (callback: () => void) => {
  forceCommitActiveInput();
  // ensure blur handlers dispatch before invoking history mutation
  setTimeout(callback, 0);
};

const forceCommitActiveInput = () => {
  if (typeof document === 'undefined') {
    return;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
};

const HistoryControls = () => {
  const canUndo = useAppStore((state) => state.canUndo);
  const canRedo = useAppStore((state) => state.canRedo);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);

  const handleUndo = useCallback(() => {
    schedulePostCommit(undo);
  }, [undo]);

  const handleRedo = useCallback(() => {
    schedulePostCommit(redo);
  }, [redo]);

  return (
    <Stack direction="row" spacing={1} role="group" aria-label="History controls">
      <Button
        variant="outlined"
        startIcon={<UndoIcon />}
        onClick={handleUndo}
        disabled={!canUndo}
        aria-disabled={!canUndo}
      >
        Undo
      </Button>
      <Button
        variant="outlined"
        startIcon={<RedoIcon />}
        onClick={handleRedo}
        disabled={!canRedo}
        aria-disabled={!canRedo}
      >
        Redo
      </Button>
    </Stack>
  );
};

export default HistoryControls;

'use client';

import { useCallback } from 'react';
import { useAppStore, selectCanRedo, selectCanUndo } from '@/state/appStore';

const HistoryControls = () => {
  const canUndo = useAppStore(selectCanUndo);
  const canRedo = useAppStore(selectCanRedo);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  return (
    <div className="history-controls" role="group" aria-label="History controls">
      <button
        type="button"
        className="history-controls__button"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-disabled={!canUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="history-controls__button"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-disabled={!canRedo}
      >
        Redo
      </button>
    </div>
  );
};

export default HistoryControls;

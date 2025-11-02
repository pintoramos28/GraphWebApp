'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useAppStore, selectProjectMeta } from '@/state/appStore';

const ProjectTitleControl = () => {
  const { title } = useAppStore(selectProjectMeta);
  const dispatch = useAppStore((state) => state.dispatch);
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(title);
      return;
    }
    if (trimmed !== title) {
      dispatch({ type: 'project/setTitle', title: trimmed });
    }
  }, [dispatch, draft, title]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur();
      }
      if (event.key === 'Escape') {
        setDraft(title);
        event.currentTarget.blur();
      }
    },
    [title],
  );

  return (
    <div className="project-title" aria-label="Project title">
      <label className="project-title__label" htmlFor="project-title-input">
        Project
      </label>
      <input
        id="project-title-input"
        className="project-title__input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="Untitled Project"
        spellCheck={false}
        aria-describedby="project-title-help"
      />
      <span id="project-title-help" className="project-title__help">
        Press Enter to save, Escape to revert.
      </span>
    </div>
  );
};

export default ProjectTitleControl;

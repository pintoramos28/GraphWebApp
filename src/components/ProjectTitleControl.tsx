'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { FormHelperText, Stack, TextField, Typography } from '@mui/material';
import { useAppStore } from '@/state/appStore';

const ProjectTitleControl = () => {
  const { title, dispatch } = useAppStore((state) => ({
    title: state.present.project.title,
    dispatch: state.dispatch
  }));
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
    setDraft(trimmed);
  }, [dispatch, draft, title]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Escape') {
        const { presentTitle } = {
          presentTitle: useAppStore.getState().present.project.title
        };
        setDraft(presentTitle);
        event.currentTarget.blur();
      }
    },
    [commit],
  );

  return (
    <Stack spacing={0.5} minWidth={240} aria-label="Project title">
      <Typography variant="caption" fontWeight={600} textTransform="uppercase" color="text.secondary">
        Project
      </Typography>
      <TextField
        id="project-title-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="Untitled Project"
        spellCheck={false}
        inputProps={{ 'aria-describedby': 'project-title-help' }}
      />
      <FormHelperText id="project-title-help">Press Enter to save, Escape to revert.</FormHelperText>
    </Stack>
  );
};

export default ProjectTitleControl;

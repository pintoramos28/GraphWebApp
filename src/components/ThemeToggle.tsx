'use client';

import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeStore } from '@/state/themeStore';

const forceCommitActiveInput = () => {
  if (typeof document === 'undefined') {
    return;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
};

const schedulePostCommit = (callback: () => void) => {
  forceCommitActiveInput();
  setTimeout(callback, 0);
};

const ThemeToggle = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggleMode);

  const label =
    mode === 'light' ? 'Switch to dark mode for low-light environments' : 'Switch to light mode';

  return (
    <Tooltip title={label}>
      <IconButton
        color="primary"
        aria-label={label}
        onClick={() => schedulePostCommit(toggle)}
        size="large"
        data-testid="theme-toggle"
      >
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

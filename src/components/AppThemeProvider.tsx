'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme, type ThemeMode } from '@/styles/theme';
import { useThemeStore } from '@/state/themeStore';

type AppThemeProviderProps = {
  children: ReactNode;
};

const AppThemeProvider = ({ children }: AppThemeProviderProps) => {
  const mode = useThemeStore((state) => state.mode);
  const applySystemMode = useThemeStore((state) => state.applySystemMode);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncWithSystem = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = 'matches' in event ? event.matches : (event as MediaQueryList).matches;
      const systemMode: ThemeMode = matches ? 'dark' : 'light';
      applySystemMode(systemMode);
    };

    syncWithSystem(mediaQuery);
    mediaQuery.addEventListener('change', syncWithSystem);
    return () => mediaQuery.removeEventListener('change', syncWithSystem);
  }, [applySystemMode]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = mode;
      document.body.dataset.theme = mode;
    }
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default AppThemeProvider;

'use client';

import { useEffect, useMemo } from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { selectThemeMode, useProjectStore } from '@/state/project-store';
import { createAppTheme } from '@/components/theme/theme-factory';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const mode = useProjectStore(selectThemeMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => {
    document.body.dataset.theme = mode;
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}

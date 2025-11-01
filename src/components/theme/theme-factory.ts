import { createTheme, responsiveFontSizes } from '@mui/material/styles';

import type { ThemeMode } from '@/state/project-store';

const okabeItoPalette = {
  blue: '#0072B2',
  sky: '#56B4E9',
  green: '#009E73',
  yellow: '#F0E442',
  orange: '#E69F00',
  vermillion: '#D55E00',
  purple: '#CC79A7',
  gray: '#999999',
} as const;

const getPalette = (mode: ThemeMode) =>
  mode === 'dark'
    ? {
        mode,
        primary: { main: okabeItoPalette.sky },
        secondary: { main: okabeItoPalette.orange },
        success: { main: okabeItoPalette.green },
        warning: { main: okabeItoPalette.yellow },
        error: { main: okabeItoPalette.vermillion },
        info: { main: okabeItoPalette.blue },
        background: {
          default: '#0F172A',
          paper: '#111827',
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#E2E8F0',
        },
      }
    : {
        mode,
        primary: { main: okabeItoPalette.blue },
        secondary: { main: okabeItoPalette.purple },
        success: { main: okabeItoPalette.green },
        warning: { main: okabeItoPalette.orange },
        error: { main: okabeItoPalette.vermillion },
        info: { main: okabeItoPalette.sky },
        background: {
          default: '#F7F9FC',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#0B1A2A',
          secondary: '#334155',
        },
      };

export const createAppTheme = (mode: ThemeMode) => {
  const baseTheme = createTheme({
    palette: getPalette(mode),
    typography: {
      fontFamily: ['"Inter"', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'].join(','),
      fontSize: 14,
      h1: { fontSize: '2.25rem', fontWeight: 600 },
      h2: { fontSize: '1.75rem', fontWeight: 600 },
      h3: { fontSize: '1.5rem', fontWeight: 600 },
      h4: { fontSize: '1.25rem', fontWeight: 600 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.2s ease, color 0.2s ease',
          },
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          ':focus-visible': {
            outline: `3px solid ${mode === 'dark' ? okabeItoPalette.yellow : okabeItoPalette.blue}`,
            outlineOffset: '2px',
          },
          a: {
            color: 'inherit',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          variant: 'contained',
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
    },
  });

  return responsiveFontSizes(baseTheme);
};

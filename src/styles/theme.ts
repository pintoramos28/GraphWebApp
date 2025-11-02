import {
  createTheme,
  responsiveFontSizes,
  type PaletteOptions,
  type ThemeOptions
} from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const baseTypography: ThemeOptions['typography'] = {
  fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
  h1: { fontSize: '2.25rem', fontWeight: 700 },
  h2: { fontSize: '1.75rem', fontWeight: 700 },
  h3: { fontSize: '1.5rem', fontWeight: 600 },
  body1: { fontSize: '1rem' },
  body2: { fontSize: '0.9rem' },
  button: { fontWeight: 600, textTransform: 'none' }
};

const getPalette = (mode: ThemeMode): PaletteOptions => {
  if (mode === 'dark') {
    return {
      mode,
      primary: {
        main: '#7dd3fc',
        contrastText: '#0f172a'
      },
      secondary: {
        main: '#a5f3fc',
        contrastText: '#0f172a'
      },
      background: {
        default: '#0f172a',
        paper: '#1f2937'
      },
      text: {
        primary: '#e2e8f0',
        secondary: '#94a3b8'
      }
    };
  }

  return {
    mode,
    primary: {
      main: '#2563eb',
      contrastText: '#f9fafb'
    },
    secondary: {
      main: '#0ea5e9',
      contrastText: '#f8fafc'
    },
    background: {
      default: '#f5f5f7',
      paper: '#ffffff'
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563'
    }
  };
};

const componentOverrides: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 999,
        paddingInline: '1rem',
        paddingBlock: '0.45rem'
      }
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 20,
        backgroundImage: 'none'
      }
    }
  },
  MuiTextField: {
    defaultProps: {
      size: 'small'
    }
  }
};

export const createAppTheme = (mode: ThemeMode) =>
  responsiveFontSizes(
    createTheme({
      palette: getPalette(mode),
      typography: baseTypography,
      shape: {
        borderRadius: 16
      },
      components: componentOverrides
    }),
  );

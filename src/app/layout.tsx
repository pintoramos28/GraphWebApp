import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { Stack, Typography } from '@mui/material';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import GlobalErrorHooks from '@/components/GlobalErrorHooks';
import ProjectTitleControl from '@/components/ProjectTitleControl';
import HistoryControls from '@/components/HistoryControls';
import ThemeToggle from '@/components/ThemeToggle';
import AppThemeProvider from '@/components/AppThemeProvider';
import DataImportPanel from '@/components/DataImportPanel';
import DatasetFiltersPanel from '@/components/DatasetFiltersPanel';
import ExpressionEditorPanel from '@/components/ExpressionEditorPanel';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Graph Builder',
  description: 'JMP Graph Builder-inspired explorations for scatter, line, and bar charts.'
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" className={inter.className}>
    <body>
      <AppErrorBoundary>
        <AppThemeProvider>
          <GlobalErrorHooks />
          <div data-testid="app-shell" className="app-shell">
            <header className="app-shell__header">
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                width="100%"
              >
                <Stack spacing={0.5}>
                  <Typography variant="h4" component="h1" className="app-shell__title">
                    Graph Builder
                  </Typography>
                  <Typography variant="body2" color="text.secondary" className="app-shell__subtitle">
                    Scatter · Line · Bar Exploration
                  </Typography>
                </Stack>
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  spacing={{ xs: 2, lg: 3 }}
                  alignItems={{ xs: 'stretch', lg: 'center' }}
                  justifyContent="flex-end"
                >
                  <ProjectTitleControl />
                  <HistoryControls />
                  <ThemeToggle />
                </Stack>
              </Stack>
            </header>
          <aside aria-label="Field list" className="app-shell__sidebar">
              <DataImportPanel />
              <DatasetFiltersPanel />
          </aside>
            <main className="app-shell__main">{children}</main>
            <aside aria-label="Inspector" className="app-shell__inspector">
              <ExpressionEditorPanel />
            </aside>
          </div>
        </AppThemeProvider>
      </AppErrorBoundary>
    </body>
  </html>
);

export default RootLayout;

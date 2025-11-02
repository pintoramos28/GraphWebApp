import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import GlobalErrorHooks from '@/components/GlobalErrorHooks';
import ProjectTitleControl from '@/components/ProjectTitleControl';
import HistoryControls from '@/components/HistoryControls';
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
        <GlobalErrorHooks />
        <div data-testid="app-shell" className="app-shell">
          <header className="app-shell__header">
            <div className="app-shell__branding">
              <h1 className="app-shell__title">Graph Builder</h1>
              <p className="app-shell__subtitle">Scatter · Line · Bar Exploration</p>
            </div>
            <ProjectTitleControl />
            <HistoryControls />
          </header>
          <aside aria-label="Field list" className="app-shell__sidebar">
            <p>Drag fields here (coming soon).</p>
          </aside>
          <main className="app-shell__main">{children}</main>
          <aside aria-label="Inspector" className="app-shell__inspector">
            <p>Inspector controls will appear here.</p>
          </aside>
        </div>
      </AppErrorBoundary>
    </body>
  </html>
);

export default RootLayout;

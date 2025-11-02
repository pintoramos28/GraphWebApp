'use client';

import React, { type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Top-level error boundary that surfaces runtime failures in the UI and console (R47/P85).
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  public override state: AppErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught an error', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="app-shell__error">
          <div>
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message ?? 'An unexpected error occurred.'}</p>
          </div>
          <div className="app-shell__error-actions">
            <button type="button" onClick={this.handleReset}>
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;

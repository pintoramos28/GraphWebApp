'use client';

import { useEffect } from 'react';

/**
 * Registers global window-level error and unhandled rejection listeners (R47/P85).
 */
const GlobalErrorHooks = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global window error', event.error ?? event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
};

export default GlobalErrorHooks;

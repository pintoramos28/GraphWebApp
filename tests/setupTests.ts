import { afterAll, beforeAll } from 'vitest';

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    throw new Error(`[console.error] ${message}`);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    throw new Error(`[console.warn] ${message}`);
  };

  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUnhandledException);
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;

  process.off('unhandledRejection', handleUnhandledRejection);
  process.off('uncaughtException', handleUnhandledException);
});

const handleUnhandledRejection = (reason: unknown) => {
  throw normalizeError(reason);
};

const handleUnhandledException = (error: Error) => {
  throw normalizeError(error);
};

const normalizeError = (input: unknown): Error => {
  if (input instanceof Error) {
    return input;
  }

  return new Error(
    typeof input === 'object' ? JSON.stringify(input) : String(input ?? 'Unknown error'),
  );
};

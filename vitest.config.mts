import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const alias: Record<string, string> = {
  '@': resolve(rootDir, 'src'),
};

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
  ],
  resolve: { alias },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup-tests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
  },
});

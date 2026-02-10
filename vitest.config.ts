/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@insight/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@insight/core': path.resolve(__dirname, 'packages/core/src'),
      '@insight/api': path.resolve(__dirname, 'packages/api/src'),
      '@insight/ml': path.resolve(__dirname, 'packages/ml/src'),
      '@insight/llm': path.resolve(__dirname, 'packages/llm/src'),
      '@insight/reports': path.resolve(__dirname, 'packages/reports/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'packages/ml/src/**',
        'packages/shared/src/**',
        'components/**',
      ],
    },
  },
});

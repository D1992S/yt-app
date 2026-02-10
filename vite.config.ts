import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@insight/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@insight/core': path.resolve(__dirname, 'packages/core/src'),
      '@insight/api': path.resolve(__dirname, 'packages/api/src'),
      '@insight/llm': path.resolve(__dirname, 'packages/llm/src'),
      '@insight/ml': path.resolve(__dirname, 'packages/ml/src'),
      '@insight/reports': path.resolve(__dirname, 'packages/reports/src'),
    },
  },
});

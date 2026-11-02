import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: { include: ['pdf-lib', 'pdfjs-dist', 'fflate'] },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});

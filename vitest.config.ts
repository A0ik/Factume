import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.tsx'],
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // APEX : exclure les worktrees git obsolètes (.claude/worktrees/agent-*)
    // qui sinon sont ramassés par le glob '**/*.test.*' et génèrent des centaines
    // de faux échecs (copies de sessions d'agents précédentes).
    exclude: ['node_modules', '.next', 'dist', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        '**/*.config.{ts,js}',
        '**/__tests__/**',
        'vitest.setup.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

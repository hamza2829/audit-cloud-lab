import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@ai': fileURLToPath(new URL('./ai/src', import.meta.url)),
      '@': fileURLToPath(new URL('./web/src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    environment: 'node',
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/vitest-junit.xml' },
    coverage: { provider: 'v8', include: ['shared/**', 'ai/src/**', 'functions/src/logic.ts', 'web/src/**'], reporter: ['text-summary', 'json-summary'], reportsDirectory: 'reports/coverage' },
  },
});

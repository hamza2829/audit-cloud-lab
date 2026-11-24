import { defineConfig } from 'vitest/config';

// Firestore security rules tests. Needs the Firestore emulator (npm run test:rules starts it).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/rules-junit.xml' },
  },
});

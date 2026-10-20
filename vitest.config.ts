import { defineConfig } from 'vitest/config';

// Tests unitaires des modules métier (logique pure, sans DOM).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
  },
});

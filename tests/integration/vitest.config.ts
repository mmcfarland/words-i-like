import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    globalSetup: './src/globalSetup.ts',
    setupFiles: ['./src/testSetup.ts'],
    include: ['src/**/*.integration.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})

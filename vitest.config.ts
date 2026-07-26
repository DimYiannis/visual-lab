import { defineConfig } from 'vitest/config'

/**
 * Tests target the pure trace-runner functions directly (lib/algorithms/*,
 * stores/concurrency.ts's runners) — no Nuxt runtime, no Pinia instance, no
 * DOM. None of those files use Nuxt auto-imports or the `~` alias
 * internally, so plain vitest needs no special resolution here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})

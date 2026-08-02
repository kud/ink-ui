import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // Every test here renders a real Ink tree, so a fork is far heavier than a
    // typical unit test. Left at the default (~cpus-1 workers) on a 12-core Mac,
    // 11 of 24 files failed to start with "Timeout waiting for worker to
    // respond" — and vitest reports those as *unhandled errors* beside a green
    // "Test Files 13 passed (13)", then exits 0. A third of the suite silently
    // not running is indistinguishable from a third of it passing.
    maxWorkers: 4,
  },
})

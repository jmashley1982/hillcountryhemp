import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // The auth flow tests share a single database and mutate rows, so run them
    // serially to avoid cross-test interference.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});

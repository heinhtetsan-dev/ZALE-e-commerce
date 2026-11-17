import "dotenv/config";
import { defineConfig } from "vitest/config";

const testDbUrl = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/zale_test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // All test files share one database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDbUrl,
      PAYMENTS_MODE: "mock",
      JWT_SECRET: "test-secret-test-secret-test-secret-123",
      RATE_LIMIT_MAX: "100000",
      AUTH_RATE_LIMIT_MAX: "100000",
      ORDER_SWEEP_INTERVAL_SECONDS: "0",
      UPLOAD_DIR: ".test-uploads",
    },
  },
});

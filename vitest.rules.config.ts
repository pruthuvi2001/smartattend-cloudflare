import { defineConfig } from "vitest/config";

// Firestore security-rules tests. They need the local emulator — run:  npm run test:rules
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests-rules/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});

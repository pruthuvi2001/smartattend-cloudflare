import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // tests-rules/ needs the Firestore emulator: npm run test:rules
    exclude: ["**/node_modules/**", "tests-rules/**"],
    environment: "node",
  },
});

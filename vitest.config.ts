import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "@motor/analysis-contracts": `${root}packages/analysis-contracts/src/index.ts`,
      "@motor/analysis-engine": `${root}packages/analysis-engine/src/index.ts`
    }
  },
  test: {
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts", "lib/**/*.test.ts"],
    coverage: { reporter: ["text", "json", "html"] }
  }
});

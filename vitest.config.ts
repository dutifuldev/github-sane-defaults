import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      exclude: [
        "dist/**",
        "coverage/**",
        "tests/**",
        "src/cli/main.ts",
        "src/github/client.ts",
        "src/**/types.ts"
      ],
      include: ["src/**/*.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    }
  }
});

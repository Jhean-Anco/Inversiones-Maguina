import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Pruebas del frontend. La cobertura se exige sobre las capas con lógica
 * (dominio, servicios, impresión, utilidades y hooks); las vistas se validan
 * además con Playwright contra la aplicación real.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/domain/**/*.{ts,tsx}",
        "src/services/**/*.{ts,tsx}",
        "src/impresion/**/*.{ts,tsx}",
        "src/utilidades/**/*.{ts,tsx}",
        "src/lib/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/pages/**/*-calculos.ts",
        "src/pages/**/*-formatters.ts",
        "src/pages/**/*-periodos.ts",
      ],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/**/*.d.ts"],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
    },
  },
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");
  const apiUrl = env.VITE_API_URL?.trim() ?? "";
  if (mode === "production" && apiUrl) {
    let url: URL;
    try { url = new URL(apiUrl); } catch { throw new Error("VITE_API_URL debe ser una URL HTTPS o quedar vacío si web y API comparten origen."); }
    if (url.protocol !== "https:" || /localhost|127\.0\.0\.1/i.test(url.hostname)) {
      throw new Error("La compilación de producción no puede apuntar a localhost ni usar HTTP en VITE_API_URL.");
    }
  }
  return {
    envDir: "../../",
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            const normalizedId = id.replaceAll("\\", "/");
            if (/\/node_modules\/(?:@heroui\/react|@react-aria|@react-stately|@internationalized)\//.test(normalizedId)) return "vendor-heroui";
            if (/react-dom|\/react\/|\\react\\|scheduler/.test(id)) return "vendor-react";
            if (/react-router|@remix-run/.test(id)) return "vendor-router";
          },
        },
      },
    },
  };
});

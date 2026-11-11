import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");
  const apiUrl = env.VITE_API_URL?.trim() ?? "";
  if (apiUrl) {
    let url: URL;
    try { url = new URL(apiUrl); } catch { throw new Error("VITE_API_URL debe ser una URL válida o quedar vacío si web y API comparten origen."); }
    const localhostHttp = url.protocol === "http:" && /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(url.hostname);
    if (url.protocol !== "https:" && !localhostHttp) {
      throw new Error("VITE_API_URL debe usar HTTPS; HTTP solo se permite en loopback local.");
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

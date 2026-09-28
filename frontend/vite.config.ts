import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const apiBaseUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE_URL?.trim();
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: apiBaseUrl
        ? { "/api": { target: apiBaseUrl, changeOrigin: true } }
        : undefined,
    },
  };
});

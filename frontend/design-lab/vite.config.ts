import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";

/** Static gallery for stakeholder concept review (not the production app). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, ".."), "");
  const apiTarget = (env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  return {
    root: resolve(__dirname),
    envDir: resolve(__dirname, ".."),
    server: {
      port: 5179,
      open: "/index.html",
      proxy: apiTarget
        ? {
            "/api": {
              target: apiTarget,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
    build: {
      outDir: resolve(__dirname, "dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  };
});

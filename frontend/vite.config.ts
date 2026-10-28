import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

function maplibreWorkerPlugin() {
  const syncWorker = (root: string) => {
    const src = path.resolve(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
    const destDir = path.resolve(root, "public/assets");
    const dest = path.resolve(destDir, "maplibre-gl-worker.mjs");
    if (fs.existsSync(src)) {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  };

  return {
    name: "maplibre-worker-sync",
    buildStart() {
      syncWorker(process.cwd());
    },
    configureServer(server: any) {
      syncWorker(server.config.root || process.cwd());
    },
  };
}

export default defineConfig(({ mode }) => {
  const apiBaseUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE_URL?.trim();
  return {
    plugins: [react(), tailwindcss(), maplibreWorkerPlugin()],
    server: {
      port: 5173,
      proxy: apiBaseUrl
        ? {
            "/api": {
              target: apiBaseUrl,
              changeOrigin: true,
              configure: (proxy) => {
                proxy.on("proxyReq", (proxyReq) => {
                  proxyReq.removeHeader("cookie");
                });
              },
            },
          }
        : undefined,
    },
  };
});

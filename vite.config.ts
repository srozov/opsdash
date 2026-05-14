import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "web",
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["<host>.ts.net"],
    proxy: {
      "/api": "http://127.0.0.1:7890",
    },
  },
  build: {
    outDir: resolve(__dirname, "server/public"),
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 2048,
  },
  optimizeDeps: {
    include: ["monaco-editor/esm/vs/editor/editor.api"],
  },
  worker: {
    format: "es",
  },
});

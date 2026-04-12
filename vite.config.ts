import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "web",
  build: {
    outDir: resolve(__dirname, "server/public"),
    emptyOutDir: true,
    target: "es2022",
  },
});

import { defineConfig } from "vite";

// OpsDash is a static application. The repository root is the Vite root and the
// build writes to dist/. There is no application backend and no dev proxy;
// the browser talks to Dagmar directly over WSS (see src/dagmar-client.ts).
export default defineConfig({
  root: ".",
  server: {
    host: true,
    // Allow the tailnet hostname during development.
    allowedHosts: ["<host>.ts.net"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});

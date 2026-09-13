import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// OpsDash is a static React application. The repository root is the Vite root
// and the build writes to dist/. There is no application backend and no dev
// proxy; the browser talks to Dagmar directly over WSS (see dagmar-client.ts).
//
// The dev server listens on loopback and is published to the tailnet by
// `tailscale serve` on https://<node>.<tailnet>.ts.net:7890. HMR is told to
// reach the browser back over that TLS endpoint.
export default defineConfig({
  root: ".",
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 7890,
    strictPort: true,
    allowedHosts: [".ts.net"],
    hmr: {
      protocol: "wss",
      clientPort: 7890,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});

import { defineConfig } from "vite";

// OpsDash is a static application. The repository root is the Vite root and the
// build writes to dist/. There is no application backend and no dev proxy; the
// browser talks to Dagmar directly over WSS (see src/dagmar-client.ts).
//
// The dev server listens on loopback and is published to the tailnet by
// `tailscale serve` on https://<node>.<tailnet>.ts.net:7890 — the same way the
// old OpsDash was served (see the opsdash.service systemd user unit). HMR is
// told to reach the browser back over that TLS endpoint.
export default defineConfig({
  root: ".",
  server: {
    host: "127.0.0.1",
    port: 7890,
    strictPort: true,
    // Requests arrive through the serve proxy with the tailnet Host header; the
    // leading dot matches every hostname in this tailnet.
    allowedHosts: [".ts.net"],
    hmr: {
      // The page is served over TLS on :7890, so the HMR socket must be wss on
      // the same port; the host is taken from the page so any tailnet name works.
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

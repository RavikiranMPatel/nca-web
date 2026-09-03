import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend origin for the dev proxy. Defaults to the normal local backend; the
// Playwright scoring suite overrides it to the test backend (8081) so the suite
// never shares a database with day-to-day local work.
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.authorization) {
              proxyReq.setHeader("Authorization", req.headers.authorization);
            }
            // Forward original host so TenantResolverFilter sees the subdomain
            if (req.headers.host) {
              proxyReq.setHeader("Host", req.headers.host);
            }
          });
        },
      },
      "/actuator": {
        target: API_TARGET,
        changeOrigin: false,
      },
      "/uploads": {
        target: API_TARGET,
        changeOrigin: false,
      },
    },
  },
});

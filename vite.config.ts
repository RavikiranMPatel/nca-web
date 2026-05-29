import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
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
      "/uploads": {
        target: "http://localhost:8080",
        changeOrigin: false,
      },
    },
  },
});

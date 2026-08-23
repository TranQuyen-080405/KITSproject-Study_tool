// This file configures Vite for the React web client.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      // Host/dev: Vite forwards to local gateway.
      // Docker image uses nginx to reach the api-gateway service instead.
      "/api": "http://localhost:3000",
    },
  },
});

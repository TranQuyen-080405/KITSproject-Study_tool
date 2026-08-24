import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
    proxy: {
      // Local Vite → AI FastAPI (docker/host :3004)
      "/conversations": "http://localhost:3004",
      "/health": "http://localhost:3004",
      "/api": "http://localhost:3004",
    },
  },
});

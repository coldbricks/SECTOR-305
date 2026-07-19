import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@sector305/core": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
  server: {
    port: 3050,
  },
});

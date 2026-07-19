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
    // Bind IPv4 explicitly — Windows often resolves localhost oddly; bare
    // default can listen only on ::1 and make 127.0.0.1 look "dead".
    host: "127.0.0.1",
    port: 3050,
    strictPort: true,
  },
});


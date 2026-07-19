import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3050",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 3050",
    url: "http://127.0.0.1:3050",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

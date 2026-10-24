import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    actionTimeout: 10000,
    ...devices[process.env.TEST_BROWSER === "webkit" ? "iPhone 13" : "Pixel 7"],
    browserName: process.env.TEST_BROWSER === "webkit" ? "webkit" : "chromium",
    channel:
      process.env.TEST_BROWSER === "webkit"
        ? undefined
        : process.env.PLAYWRIGHT_CHANNEL || undefined,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  timeout: 60000,
});

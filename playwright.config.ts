import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 測試配置
 * 符合憲法要求：多瀏覽器測試、效能監控、TypeScript 支援
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",

  // 測試執行設定
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // 測試報告
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  use: {
    // 基礎 URL - 開發伺服器位址
    baseURL: "http://localhost:5173",

    // 截圖與錄影
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",

    // 效能監控
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // 多瀏覽器測試設定（符合憲法要求）
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Core Web Vitals 監控
        contextOptions: {
          recordHar: {
            path: "test-results/chromium-har.json",
          },
        },
      },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // 移動端測試（符合憲法的 Mobile-First 要求）
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },

    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },

    // 平板測試
    {
      name: "tablet",
      use: { ...devices["iPad Pro"] },
    },
  ],

  // 本地開發伺服器設定
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

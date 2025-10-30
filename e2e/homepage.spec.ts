import { test, expect } from "@playwright/test";

test.describe("首頁測試", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("應該顯示頁面標題", async ({ page }) => {
    await expect(page).toHaveTitle(/Vite \+ React \+ TS/);
  });

  test("應該渲染主要標題", async ({ page }) => {
    const heading = page.getByRole("heading", { name: /vite \+ react/i });
    await expect(heading).toBeVisible();
  });

  test("計數器功能測試", async ({ page }) => {
    // 檢查初始計數
    const button = page.getByRole("button", { name: /count is 0/i });
    await expect(button).toBeVisible();

    // 點擊按鈕
    await button.click();

    // 驗證計數增加
    await expect(
      page.getByRole("button", { name: /count is 1/i }),
    ).toBeVisible();

    // 再次點擊
    await page.getByRole("button", { name: /count is 1/i }).click();
    await expect(
      page.getByRole("button", { name: /count is 2/i }),
    ).toBeVisible();
  });

  test("Logo 連結應該正確", async ({ page }) => {
    // 檢查 Vite logo
    const viteLogo = page.getByAltText(/vite logo/i);
    await expect(viteLogo).toBeVisible();

    const viteLink = page.getByRole("link", { name: /vite logo/i });
    await expect(viteLink).toHaveAttribute("href", "https://vite.dev");

    // 檢查 React logo
    const reactLogo = page.getByAltText(/react logo/i);
    await expect(reactLogo).toBeVisible();

    const reactLink = page.getByRole("link", { name: /react logo/i });
    await expect(reactLink).toHaveAttribute("href", "https://react.dev");
  });

  test("效能指標檢查 - 應符合憲法要求", async ({ page }) => {
    // 導航到首頁並等待載入完成
    await page.goto("/", { waitUntil: "networkidle" });

    // 收集 Web Vitals
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ("PerformanceObserver" in window) {
          const metrics: Record<string, number> = {};

          // 收集 LCP (Largest Contentful Paint)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[
              entries.length - 1
            ] as PerformanceEntry & {
              renderTime?: number;
              loadTime?: number;
            };
            metrics.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
          }).observe({ type: "largest-contentful-paint", buffered: true });

          setTimeout(() => resolve(metrics), 1000);
        } else {
          resolve({});
        }
      });
    });

    console.log("Performance Metrics:", performanceMetrics);

    // 驗證 LCP < 2.5s (憲法要求)
    // 注意：在測試環境中可能更快
    if ((performanceMetrics as { lcp?: number }).lcp) {
      expect((performanceMetrics as { lcp: number }).lcp).toBeLessThan(2500);
    }
  });

  test("響應式設計 - 移動端視窗", async ({ page }) => {
    // 設定移動端視窗大小
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // 驗證內容可見
    await expect(
      page.getByRole("heading", { name: /vite \+ react/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /count is 0/i }),
    ).toBeVisible();
  });
});

import { describe, it, expect } from "vitest";

/**
 * 工具函式測試範例
 * 展示 Test-First Development 的實踐
 */

// 待實作的函式（Test-First 方法：先寫測試，再實作功能）
function formatCryptoPrice(price: number, currency = "USD"): string {
  // TODO: 實作此函式
  return `${currency} ${price.toFixed(2)}`;
}

describe("formatCryptoPrice", () => {
  it("應該正確格式化價格為兩位小數", () => {
    const result = formatCryptoPrice(1234.567);
    expect(result).toBe("USD 1234.57");
  });

  it("應該支援自訂貨幣", () => {
    const result = formatCryptoPrice(1000, "EUR");
    expect(result).toBe("EUR 1000.00");
  });

  it("應該處理零值", () => {
    const result = formatCryptoPrice(0);
    expect(result).toBe("USD 0.00");
  });

  it("應該處理負值", () => {
    const result = formatCryptoPrice(-100.5);
    expect(result).toBe("USD -100.50");
  });

  it("應該處理超大數值", () => {
    const result = formatCryptoPrice(999999.999);
    expect(result).toBe("USD 1000000.00");
  });
});

// WebSocket 連線狀態檢查範例（符合憲法的即時資料完整性要求）
function isConnectionStale(
  lastUpdateTime: number,
  thresholdMs = 5000,
): boolean {
  return Date.now() - lastUpdateTime > thresholdMs;
}

describe("isConnectionStale", () => {
  it("應該判斷連線為新鮮的（最近更新）", () => {
    const recentTime = Date.now() - 1000; // 1 秒前
    expect(isConnectionStale(recentTime)).toBe(false);
  });

  it("應該判斷連線為過時的（超過閾值）", () => {
    const oldTime = Date.now() - 10000; // 10 秒前
    expect(isConnectionStale(oldTime)).toBe(true);
  });

  it("應該支援自訂閾值", () => {
    const time = Date.now() - 3000; // 3 秒前
    expect(isConnectionStale(time, 2000)).toBe(true);
    expect(isConnectionStale(time, 5000)).toBe(false);
  });

  it("應該處理邊界情況", () => {
    const time = Date.now() - 5000; // 正好 5 秒
    expect(isConnectionStale(time, 5000)).toBe(false);
  });
});

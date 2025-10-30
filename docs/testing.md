# 測試指南

本專案遵循憲法中的 **Test-First Development** 原則，要求最低 80% 的測試覆蓋率。

## 測試框架

### Vitest - 單元測試與組件測試

- **用途**: React 組件、自訂 Hooks、工具函式的單元測試
- **環境**: Happy-DOM (模擬瀏覽器環境)
- **工具**: React Testing Library, @testing-library/user-event

#### 為何選擇 Happy-DOM？

我們選擇 Happy-DOM 而非 jsdom 作為測試環境，理由如下：

| 特性         | Happy-DOM          | jsdom          |
| ------------ | ------------------ | -------------- |
| **執行速度** | ⚡ 快 2-3 倍       | 較慢           |
| **API 覆蓋** | 涵蓋大多數常見情境 | 完整瀏覽器 API |
| **相容性**   | Node 18/22 良好    | Node 18 有問題 |
| **適用場景** | 單元測試、組件測試 | 複雜 DOM 操作  |

**決策考量**：

- ✅ 測試執行速度直接影響開發體驗
- ✅ Happy-DOM 支援 React Testing Library 的所有核心功能
- ✅ 需要進階 Web API 的測試可用 Playwright E2E 補足
- ✅ 符合專案憲法對效能的要求

### Playwright - E2E 測試

- **用途**: 端到端測試、跨瀏覽器測試、效能監控
- **支援瀏覽器**: Chromium, Firefox, WebKit
- **測試裝置**: Desktop, Mobile (Pixel 5, iPhone 12), Tablet (iPad Pro)

## 執行測試

### Vitest 測試命令

```bash
# 執行所有單元測試 (watch mode)
pnpm test

# 執行測試並產生覆蓋率報告
pnpm test:coverage

# 開啟視覺化測試介面
pnpm test:ui
```

### Playwright E2E 測試命令

```bash
# 執行所有 E2E 測試
pnpm test:e2e

# 開啟 Playwright UI 模式
pnpm test:e2e:ui

# Debug 模式 (逐步執行)
pnpm test:e2e:debug
```

## 測試覆蓋率要求

根據專案憲法，必須維持以下覆蓋率門檻：

| 指標       | 最低要求 |
| ---------- | -------- |
| Lines      | 80%      |
| Functions  | 80%      |
| Branches   | 80%      |
| Statements | 80%      |

**關鍵業務邏輯路徑要求 100% 覆蓋率**。

## 測試檔案結構

```
crypto-realtime/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── __tests__/
│   │       └── Button.test.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   └── __tests__/
│   │       └── useWebSocket.test.ts
│   └── utils/
│       ├── formatPrice.ts
│       └── __tests__/
│           └── formatPrice.test.ts
├── e2e/
│   ├── homepage.spec.ts
│   ├── trading.spec.ts
│   └── websocket.spec.ts
└── vitest.setup.ts
```

## Test-First Development 流程

### 1. 先寫測試

```typescript
// src/utils/__tests__/formatPrice.test.ts
import { describe, it, expect } from "vitest";
import { formatPrice } from "../formatPrice";

describe("formatPrice", () => {
  it("應該格式化價格為兩位小數", () => {
    expect(formatPrice(1234.567)).toBe("$1,234.57");
  });
});
```

### 2. 實作功能

```typescript
// src/utils/formatPrice.ts
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}
```

### 3. 執行測試並驗證

```bash
pnpm test formatPrice
```

## React 組件測試範例

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PriceCard } from '../PriceCard';

describe('PriceCard', () => {
  it('應該顯示加密貨幣價格', () => {
    render(<PriceCard symbol="BTC" price={50000} />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
  });

  it('價格變化時應該顯示動畫', async () => {
    const { rerender } = render(<PriceCard symbol="BTC" price={50000} />);

    rerender(<PriceCard symbol="BTC" price={51000} />);

    const priceElement = screen.getByText('$51,000.00');
    expect(priceElement).toHaveClass('price-increase');
  });
});
```

## WebSocket 連線測試

### 單元測試 (Vitest)

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWebSocket } from "../useWebSocket";

describe("useWebSocket", () => {
  it("應該在連線失敗時自動重試", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:8080"));

    // 模擬連線失敗
    await waitFor(() => {
      expect(result.current.status).toBe("reconnecting");
    });
  });
});
```

### E2E 測試 (Playwright)

```typescript
test("應該顯示 WebSocket 連線狀態", async ({ page }) => {
  await page.goto("/");

  // 檢查連線指示器
  await expect(page.locator('[data-testid="ws-status"]')).toHaveText(
    "Connected",
  );

  // 驗證接收到即時資料
  await expect(page.locator('[data-testid="btc-price"]')).not.toBeEmpty();
});
```

## 效能測試

根據憲法要求，必須監控以下效能指標：

- **FCP (First Contentful Paint)**: < 1.5s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **TTI (Time to Interactive)**: < 3.5s

```typescript
test("效能指標應符合憲法要求", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const metrics = await page.evaluate(
    () => performance.getEntriesByType("navigation")[0],
  );

  expect(metrics.domContentLoadedEventEnd).toBeLessThan(1500);
});
```

## 無障礙測試

確保符合 WCAG 2.1 AA 標準：

```typescript
test("應符合無障礙標準", async ({ page }) => {
  await page.goto("/");

  // 檢查 ARIA 標籤
  await expect(page.locator("main")).toHaveAttribute("role", "main");

  // 鍵盤導航測試
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
```

## CI/CD 整合

測試會在以下情況自動執行：

1. **Pre-commit hook**: 執行受影響檔案的測試
2. **Pull Request**: 完整測試套件 + 覆蓋率檢查
3. **Main branch**: E2E 測試 + 效能基準測試

## 最佳實踐

### ✅ 應該做的

- 先寫測試，再寫程式碼 (TDD)
- 測試應該獨立且可重複執行
- 使用描述性的測試名稱
- 測試真實的使用者行為，而非實作細節
- Mock 外部依賴 (API、WebSocket)
- 保持測試簡單且專注

### ❌ 避免的

- 測試實作細節（如內部 state）
- 過度使用 snapshot 測試
- 測試第三方函式庫
- 共享測試狀態
- 忽略 act() 警告
- 使用真實的 API 端點

## 除錯技巧

### Vitest

```bash
# 執行特定測試檔案
pnpm test src/components/Button.test.tsx

# 只執行符合名稱的測試
pnpm test -t "應該顯示載入狀態"

# 開啟 UI 介面進行除錯
pnpm test:ui
```

### Playwright

```bash
# Debug 模式 - 逐步執行
pnpm test:e2e:debug

# 執行特定測試檔案
pnpm test:e2e homepage.spec.ts

# 產生測試程式碼 (錄製互動)
pnpm exec playwright codegen http://localhost:5173
```

## 相關資源

- [Vitest 官方文件](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright 文件](https://playwright.dev/)
- [專案憲法](../.specify/memory/constitution.md)

---

**記住**: 高品質的測試是高品質程式碼的基礎。遵循 Test-First 原則不僅能捕捉 bug，更能引導更好的設計決策。

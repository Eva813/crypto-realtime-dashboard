# Quickstart Guide: Crypto Realtime Dashboard

**Date**: 2025-10-31  
**Phase**: 1 - Design & Contracts  
**Target Audience**: 開發者、貢獻者、學習者

## Overview

本指南幫助您快速設定開發環境並開始開發 Crypto Realtime Dashboard。本專案是一個基於 React + TypeScript 的即時加密貨幣行情儀表板,使用 Binance WebSocket API 提供即時價格與 K 線圖表。

---

## 前置需求

### 必要軟體

- **Node.js**: >= 18.0.0 (推薦使用 20.x LTS)
- **pnpm**: >= 8.0.0 (套件管理器)
- **Git**: 版本控制

### 推薦工具

- **VS Code**: 推薦使用的編輯器
- **VS Code 擴充套件**:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - GitLens

### 檢查環境

```bash
# 檢查 Node.js 版本
node --version  # 應顯示 v18.x 或更高

# 檢查 pnpm 版本
pnpm --version  # 應顯示 8.x 或更高

# 如果未安裝 pnpm
npm install -g pnpm
```

---

## 安裝步驟

### 1. 複製專案

```bash
# Clone 專案
git clone <repository-url>
cd crypto-realtime

# 切換到開發分支
git checkout 001-crypto-realtime
```

### 2. 安裝依賴套件

```bash
# 安裝所有依賴
pnpm install

# 預期安裝時間: 30-60 秒
```

### 3. 環境配置 (可選)

建立 `.env.local` 檔案 (如果需要自訂設定):

```bash
# WebSocket API 端點 (預設已在程式碼中配置)
VITE_BINANCE_WS_URL=wss://stream.binance.com:9443

# 預設訂閱的幣種 (可選)
VITE_DEFAULT_SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT
```

---

## 啟動開發伺服器

```bash
# 啟動 Vite 開發伺服器
pnpm dev

# 應該看到類似輸出:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

開啟瀏覽器訪問 `http://localhost:5173`,您應該會看到儀表板首頁顯示即時加密貨幣價格。

---

## 專案結構導覽

```
crypto-realtime/
├── src/
│   ├── components/       # React 組件
│   │   ├── common/      # 通用組件 (Button, Card)
│   │   ├── crypto/      # 加密貨幣組件 (PriceCard, CryptoList)
│   │   ├── chart/       # 圖表組件 (KLineChart)
│   │   └── layout/      # 佈局組件 (Header, Sidebar)
│   ├── hooks/           # Custom React Hooks
│   │   ├── useWebSocket.ts
│   │   ├── useCryptoPrice.ts
│   │   └── useWatchlist.ts
│   ├── services/        # 業務邏輯服務
│   │   ├── binance/    # Binance API 整合
│   │   └── storage/    # localStorage 管理
│   ├── stores/          # Zustand 狀態管理
│   │   ├── websocketStore.ts
│   │   └── watchlistStore.ts
│   ├── types/           # TypeScript 型別定義
│   ├── utils/           # 工具函式
│   ├── pages/           # 頁面組件
│   ├── App.tsx          # 主應用組件
│   └── main.tsx         # 應用進入點
├── tests/               # 測試檔案
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/              # 靜態資源
├── specs/               # 規格文件
│   └── 001-crypto-realtime/
├── docs/                # 專案文件
├── package.json         # 依賴套件定義
├── tsconfig.json        # TypeScript 配置
├── vite.config.ts       # Vite 配置
├── tailwind.config.ts   # Tailwind CSS 配置
└── eslint.config.js     # ESLint 配置
```

---

## 核心功能測試

### 1. 即時價格更新

啟動開發伺服器後,您應該會看到:

- 至少 10 種主流加密貨幣的即時價格
- 價格每 30 秒自動更新
- 漲跌幅以顏色標示 (綠色上漲,紅色下跌)

### 2. K 線圖表

點擊任一幣種卡片:

- 進入詳情頁,顯示 K 線圖表
- 支援切換時間框架 (1h, 4h, 1d, 1w)
- 圖表即時更新

### 3. 自選清單

點擊星號圖示收藏幣種:

- 收藏後星號變為實心
- 重新整理頁面,收藏清單仍存在
- 點擊實心星號可取消收藏

---

## 開發工作流程

### 1. 建立新分支

```bash
# 從 001-crypto-realtime 分支建立功能分支
git checkout -b feature/my-new-feature
```

### 2. 開發與測試

```bash
# 啟動開發伺服器 (熱重載)
pnpm dev

# 在另一個終端執行單元測試 (watch 模式)
pnpm test

# 執行型別檢查
pnpm type-check

# 執行 lint 檢查
pnpm lint
```

### 3. 提交程式碼

```bash
# 暫存變更
git add .

# 提交 (遵循 Conventional Commits 格式)
git commit -m "feat: add cryptocurrency price alert feature"

# Commit 格式:
# feat: 新功能
# fix: 修復 bug
# docs: 文件變更
# refactor: 重構
# perf: 效能優化
# test: 測試相關
```

### 4. Pre-commit Hooks

專案已配置 lefthook,會在 commit 前自動執行:

- ESLint 檢查
- TypeScript 型別檢查
- Prettier 格式化

如果檢查失敗,commit 會被阻止,請修正問題後重新提交。

---

## 常用指令

### 開發指令

```bash
# 啟動開發伺服器
pnpm dev

# 建構生產版本
pnpm build

# 預覽生產版本
pnpm preview

# 型別檢查
pnpm type-check
```

### 測試指令

```bash
# 執行單元測試 (Vitest)
pnpm test

# 執行測試 (watch 模式)
pnpm test:watch

# 測試覆蓋率報告
pnpm test:coverage

# 執行 E2E 測試 (Playwright)
pnpm test:e2e

# 執行 E2E 測試 (UI 模式)
pnpm test:e2e:ui
```

### 程式碼品質指令

```bash
# ESLint 檢查
pnpm lint

# ESLint 自動修復
pnpm lint:fix

# Prettier 格式化
pnpm format

# 執行所有檢查 (lint + type-check)
pnpm check
```

---

## 關鍵技術要點

### 1. WebSocket 連接

WebSocket 連接由 `useWebSocket` Hook 管理:

```typescript
import { useWebSocket } from "@/hooks/useWebSocket";

function MyComponent() {
  const { status, error, reconnect } = useWebSocket(["BTCUSDT", "ETHUSDT"]);

  // status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'
}
```

### 2. 即時價格更新

使用 TanStack Query 管理快取與更新:

```typescript
import { useCryptoPrice } from '@/hooks/useCryptoPrice';

function PriceDisplay({ symbol }: { symbol: string }) {
  const { data, isLoading, dataAge } = useCryptoPrice(symbol);

  if (isLoading) return <Skeleton />;
  return <div>{data?.currentPrice}</div>;
}
```

### 3. 自選清單持久化

使用 Zustand + localStorage:

```typescript
import { useWatchlist } from '@/hooks/useWatchlist';

function FavoriteButton({ symbol }: { symbol: string }) {
  const { addFavorite, removeFavorite, isFavorite } = useWatchlist();

  const handleClick = () => {
    isFavorite(symbol) ? removeFavorite(symbol) : addFavorite(symbol);
  };

  return <button onClick={handleClick}>⭐</button>;
}
```

---

## 疑難排解

### 問題 1: WebSocket 連接失敗

**症狀**: 頁面顯示「連線已中斷」

**解決方法**:

1. 檢查網路連線
2. 確認防火牆未封鎖 WebSocket 連接
3. 檢查瀏覽器控制台是否有錯誤訊息
4. 嘗試手動重新連接 (應用會自動重試)

### 問題 2: 自選清單無法保存

**症狀**: 刷新頁面後收藏清單消失

**解決方法**:

1. 檢查瀏覽器是否啟用隱私模式 (隱私模式禁用 localStorage)
2. 清除瀏覽器快取後重試
3. 檢查 localStorage 容量是否已滿
4. 查看應用是否顯示「無法保存收藏」警告

### 問題 3: 圖表無法顯示

**症狀**: K 線圖表區域空白

**解決方法**:

1. 檢查瀏覽器控制台是否有 JavaScript 錯誤
2. 確認 Lightweight Charts 套件已正確安裝
3. 檢查網路請求是否成功取得 K 線資料
4. 嘗試切換不同的時間框架

### 問題 4: 效能問題

**症狀**: 頁面卡頓,CPU 使用率高

**解決方法**:

1. 減少訂閱的幣種數量 (建議 < 50 個)
2. 檢查是否有記憶體洩漏 (使用 Chrome DevTools Memory Profiler)
3. 確認 React Compiler 已啟用 (檢查 vite.config.ts)
4. 檢查 WebSocket 訊息是否正確節流處理

---

## 學習資源

### 官方文件

- [React 官方文件](https://react.dev/)
- [TypeScript 官方文件](https://www.typescriptlang.org/docs/)
- [Vite 官方文件](https://vitejs.dev/)
- [TanStack Query 文件](https://tanstack.com/query/latest)
- [Zustand 文件](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
- [TradingView Lightweight Charts 文件](https://tradingview.github.io/lightweight-charts/)

### Binance API 文件

- [Binance WebSocket Streams](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
- [Binance API 使用指南](https://www.binance.com/en/support/faq/c-6)

### 專案文件

- [規格文件 (spec.md)](./spec.md)
- [技術計畫 (plan-tech.md)](./plan-tech.md)
- [資料模型 (data-model.md)](./data-model.md)
- [API 合約 (api-contracts.md)](./contracts/api-contracts.md)
- [研究文件 (research.md)](./research.md)

---

## 下一步

完成 Quickstart 後,建議您:

1. **閱讀規格文件**: 了解完整的功能需求與使用者故事
2. **瀏覽程式碼**: 熟悉專案結構與程式碼風格
3. **執行測試**: 確保所有測試通過,理解測試策略
4. **實作功能**: 選擇一個 User Story 開始開發
5. **貢獻程式碼**: 提交 Pull Request 參與專案開發

---

## 支援與聯絡

- **GitHub Issues**: 報告 bug 或提出功能請求
- **Pull Requests**: 貢獻程式碼改進
- **Discussions**: 技術討論與問題解答

---

**祝您開發順利!** 🚀

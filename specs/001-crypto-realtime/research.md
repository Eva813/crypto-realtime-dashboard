# Research: Crypto Realtime Dashboard

**Date**: 2025-10-31  
**Phase**: 0 - Outline & Research  
**Status**: Complete

## Overview

本文件記錄了 Crypto Realtime Dashboard 專案在技術選型、架構設計和最佳實踐方面的研究成果。所有技術決策都已在 `plan-tech.md` 中明確定義,本研究文件提供了決策依據、替代方案評估和實作建議。

---

## 1. WebSocket 資料源選擇

### Decision: Binance WebSocket API (公開層級)

### Rationale:

- **工業級穩定性**: Binance 是全球最大的加密貨幣交易所之一,其 WebSocket API 具有極高的可靠性和上線時間
- **廣泛的幣種覆蓋**: 支援 500+ 加密貨幣交易對,滿足專案需求
- **免費且無需認證**: 公開 API 無需註冊或 API key,降低開發門檻
- **多種推送格式**: 支援 ticker、aggTrade、kline 等多種數據流,靈活滿足不同需求
- **低延遲**: 即時推送,延遲通常 < 100ms
- **完善的文件**: 官方文件詳細,社群支援活躍

### Alternatives Considered:

1. **Coinbase WebSocket API**
   - 優點: 合規性強,適合美國用戶
   - 缺點: 幣種覆蓋較少,推送格式較單一
   - 拒絕原因: 幣種數量不足以支援專案的延展性需求

2. **Kraken WebSocket API**
   - 優點: 老牌交易所,穩定性高
   - 缺點: 文件較舊,社群活躍度低
   - 拒絕原因: 開發者體驗不如 Binance

3. **自建後端 + 多數據源聚合**
   - 優點: 完全控制數據源,可整合多個交易所
   - 缺點: 需要後端開發、部署、維護,增加複雜度和成本
   - 拒絕原因: 與專案目標不符 (純前端專案)

### Implementation Notes:

- 使用 Binance WebSocket Streams API: `wss://stream.binance.com:9443/ws`
- 推薦訂閱格式:
  - **Ticker**: `<symbol>@ticker` (24小時價格統計)
  - **Aggregate Trade**: `<symbol>@aggTrade` (聚合交易流,高頻更新)
  - **Kline/Candlestick**: `<symbol>@kline_<interval>` (K線數據)
- 多幣種訂閱使用 Combined Streams: `wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/...`

---

## 2. 狀態管理策略

### Decision: Zustand + TanStack Query

### Rationale:

- **Zustand**: 輕量級狀態管理 (< 1KB),API 簡潔,適合管理 WebSocket 連線狀態、自選清單等全域狀態
- **TanStack Query**: 專為異步資料管理設計,內建快取、自動重試、背景更新等功能,完美適配即時資料場景
- **職責分離**: Zustand 管理應用狀態,TanStack Query 管理伺服器狀態,架構清晰
- **TypeScript 友好**: 兩者都提供優秀的 TypeScript 支援

### Alternatives Considered:

1. **Redux Toolkit + RTK Query**
   - 優點: 生態系統成熟,大型專案標準選擇
   - 缺點: 配置複雜,bundle size 較大,對中小型專案過度工程化
   - 拒絕原因: 本專案規模不需要如此重量級的方案

2. **React Context + useReducer**
   - 優點: 原生解決方案,無需額外依賴
   - 缺點: 缺少快取、自動重試等進階功能,需要手動實作
   - 拒絕原因: 即時資料管理需要更強大的工具

3. **Jotai / Recoil**
   - 優點: 原子化狀態管理,細粒度更新
   - 缺點: 學習曲線較陡,社群較小
   - 拒絕原因: Zustand 更簡單且足夠滿足需求

### Implementation Notes:

- **Zustand Store 結構**:

  ```typescript
  // websocketStore.ts
  interface WebSocketState {
    status: "connecting" | "connected" | "disconnected" | "reconnecting";
    error: string | null;
    lastUpdate: Date | null;
  }

  // watchlistStore.ts
  interface WatchlistState {
    favorites: string[]; // 幣種代號陣列
    addFavorite: (symbol: string) => void;
    removeFavorite: (symbol: string) => void;
  }
  ```

- **TanStack Query 配置**:
  - `staleTime`: 30 秒 (價格數據 30 秒內視為新鮮)
  - `refetchOnWindowFocus`: false (避免頻繁重新取得)
  - `retry`: 3 次,指數退避 (1s, 2s, 4s)

---

## 3. K線圖表函式庫選擇

### Decision: TradingView Lightweight Charts

### Rationale:

- **金融專用**: 由 TradingView 開發,專為金融圖表設計,支援所有標準圖表類型
- **輕量高效**: Bundle size < 50KB,渲染性能優秀 (60 FPS 穩定)
- **API 簡潔**: 函式庫 API 設計直觀,學習成本低
- **即時更新支援**: 提供 `update()` 方法,適合 WebSocket 即時資料流
- **開源免費**: MIT 授權,無使用限制
- **TypeScript 原生支援**: 完整型別定義

### Alternatives Considered:

1. **Recharts**
   - 優點: React 原生圖表庫,聲明式 API,易於使用
   - 缺點: 非專為金融圖表設計,缺少專業功能 (如十字游標、時間軸縮放)
   - 拒絕原因: 功能不足以滿足 K 線圖表需求

2. **Chart.js + chartjs-chart-financial**
   - 優點: 通用圖表庫,生態系統成熟
   - 缺點: 金融圖表插件維護不活躍,性能不如 Lightweight Charts
   - 拒絕原因: 性能和專業性不足

3. **ApexCharts**
   - 優點: 功能豐富,支援多種圖表類型
   - 缺點: Bundle size 較大 (> 200KB),配置複雜
   - 拒絕原因: 對本專案而言過於重量級

### Implementation Notes:

- 安裝: `pnpm add lightweight-charts`
- 基本用法:

  ```typescript
  import { createChart } from "lightweight-charts";

  const chart = createChart(container, {
    width: 800,
    height: 400,
    layout: {
      backgroundColor: "#eae0d5", // 配合 UI 配色
      textColor: "#22333b",
    },
  });

  const candlestickSeries = chart.addCandlestickSeries();
  candlestickSeries.setData(klineData);
  ```

---

## 4. UI 框架與樣式系統

### Decision: Tailwind CSS + ShadCN

### Rationale:

- **Tailwind CSS**:
  - Utility-first 設計,快速開發
  - 優秀的 PurgeCSS 支援,production bundle 極小
  - 配合 `tailwind.config.ts` 自訂主題,實現復古配色
- **ShadCN**:
  - 基於 Radix UI 的無頭組件庫
  - 完全可自訂,與 Tailwind 無縫整合
  - 無障礙性 (WCAG 2.1 AA) 內建支援
  - 複製即用,無需安裝額外套件

### Alternatives Considered:

1. **Material-UI (MUI)**
   - 優點: 組件豐富,設計完整
   - 缺點: Bundle size 大,預設樣式難以自訂
   - 拒絕原因: 與專案的復古配色風格不符

2. **Ant Design**
   - 優點: 企業級 UI,組件完善
   - 缺點: 中國風格設計,自訂成本高
   - 拒絕原因: 樣式風格與專案需求差異大

3. **CSS Modules / Styled Components**
   - 優點: 完全自訂,無預設樣式
   - 缺點: 需要手動實作所有組件,開發效率低
   - 拒絕原因: 本專案需要快速開發

### Implementation Notes:

- Tailwind 主題配置已在 `plan-tech.md` 中定義 (Navy + Cream 復古色系)
- ShadCN 組件安裝: `npx shadcn-ui@latest init`
- 推薦組件: Button, Card, Select, Tabs, Skeleton (for loading states)

---

## 5. 即時資料處理最佳實踐

### Decision: WebSocket + TanStack Query Optimistic Updates

### Rationale:

- **職責分離**:
  - WebSocket: 負責接收即時推送
  - TanStack Query: 負責資料快取與 UI 同步
- **Optimistic Updates**: 接收到 WebSocket 訊息後,立即更新 TanStack Query 快取,UI 瞬間響應
- **節流處理**: 使用 `throttle` 限制高頻更新 (如 aggTrade 每秒 > 10 次),避免過度渲染

### Best Practices:

1. **連接管理**:

   ```typescript
   // useWebSocket.ts
   useEffect(() => {
     const ws = new WebSocket(BINANCE_WS_URL);

     ws.onopen = () => {
       setStatus('connected');
       // 訂閱幣種
       ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: [...] }));
     };

     ws.onmessage = (event) => {
       const data = JSON.parse(event.data);
       // 更新 TanStack Query 快取
       queryClient.setQueryData(['crypto', data.symbol], data);
     };

     ws.onerror = () => {
       setStatus('reconnecting');
       // 指數退避重試
       setTimeout(() => reconnect(), retryDelay);
     };

     return () => ws.close();
   }, []);
   ```

2. **節流處理**:

   ```typescript
   import { throttle } from "lodash-es";

   const updatePrice = throttle((data) => {
     queryClient.setQueryData(["crypto", data.symbol], data);
   }, 1000); // 每秒最多更新一次
   ```

3. **錯誤恢復**:
   - 最多重試 3 次,退避時間: 1s → 2s → 4s
   - 顯示連線狀態指示器
   - 保留最後成功的價格數據

---

## 6. 本地存儲策略

### Decision: localStorage + Fallback to Memory

### Rationale:

- **localStorage**: 瀏覽器原生 API,簡單可靠,支援 5-10MB 存儲空間 (足夠存放 100+ 收藏幣種)
- **Fallback**: 當 localStorage 不可用時 (隱私模式、已滿),降級至記憶體存儲,核心功能不受影響

### Best Practices:

1. **抽象存儲層**:

   ```typescript
   // storage.ts
   class Storage {
     set(key: string, value: any): boolean {
       try {
         localStorage.setItem(key, JSON.stringify(value));
         return true;
       } catch (error) {
         console.warn("localStorage unavailable, using memory storage");
         this.memoryStore.set(key, value);
         return false;
       }
     }

     get<T>(key: string): T | null {
       try {
         const item = localStorage.getItem(key);
         return item ? JSON.parse(item) : null;
       } catch {
         return this.memoryStore.get(key) || null;
       }
     }
   }
   ```

2. **資料結構**:

   ```typescript
   interface WatchlistData {
     favorites: string[];
     createdAt: string;
     lastUpdated: string;
   }

   // 存儲 key: 'crypto-watchlist'
   ```

---

## 7. 效能最佳化策略

### Decision: Code Splitting + React Compiler + Memoization

### Rationale:

- **Code Splitting**: 路由層級切分,減少初始 bundle size
- **React Compiler**: 自動優化組件渲染,減少不必要的 re-render
- **Memoization**: 對高成本計算使用 `useMemo`,對穩定函式使用 `useCallback`

### Best Practices:

1. **路由 Lazy Loading**:

   ```typescript
   const Dashboard = lazy(() => import("./pages/Dashboard"));
   const CryptoDetail = lazy(() => import("./pages/CryptoDetail"));
   ```

2. **組件 Memoization**:

   ```typescript
   const PriceCard = memo(({ crypto }: Props) => {
     // Only re-render if crypto data changes
   });
   ```

3. **Virtual Scrolling**:
   - 若幣種清單 > 50 個,使用 `react-window` 實作虛擬滾動
   - 僅渲染可見區域,提升性能

---

## 8. 無障礙性 (WCAG 2.1 AA) 實作

### Decision: Semantic HTML + ARIA Labels + Keyboard Navigation

### Best Practices:

1. **語義化 HTML**:

   ```tsx
   <nav aria-label="主導航">
     <button aria-label="收藏此幣種">⭐</button>
   </nav>
   ```

2. **鍵盤導航**:
   - 所有互動元素支援 Tab 鍵導航
   - 圖表支援方向鍵移動游標

3. **顏色對比**:
   - 文字對比度 > 4.5:1 (已在配色方案中驗證)
   - 漲跌顏色使用圖示輔助,不僅依賴顏色

---

## 9. 測試策略

### Decision: Vitest (Unit) + Playwright (E2E) + Testing Library (Component)

### Test Coverage Goals:

- **Overall**: 80%
- **Critical Paths**: 100% (WebSocket, Price Updates, K-line Rendering)

### Test Examples:

1. **WebSocket Connection Test** (Integration):

   ```typescript
   test("WebSocket reconnects after failure", async () => {
     // Mock WebSocket error
     // Verify retry with exponential backoff
   });
   ```

2. **Price Update Test** (Unit):

   ```typescript
   test('Price card displays updated price', () => {
     render(<PriceCard crypto={mockCrypto} />);
     // Verify price display
   });
   ```

3. **E2E Flow Test** (Playwright):
   ```typescript
   test("User can add cryptocurrency to watchlist", async ({ page }) => {
     await page.goto("/");
     await page.click('[aria-label="收藏此幣種"]');
     // Verify added to watchlist
   });
   ```

---

## Summary

所有技術決策已完成研究並記錄在本文件中。無未解決的 NEEDS CLARIFICATION 項目。專案已準備好進入 Phase 1: Design & Contracts。

**Key Takeaways**:

- Binance WebSocket API 提供穩定的即時資料源
- Zustand + TanStack Query 組合提供清晰的狀態管理架構
- TradingView Lightweight Charts 是最適合的 K 線圖表解決方案
- Tailwind CSS + ShadCN 實現快速開發與一致的 UI 體驗
- 完善的測試策略確保程式碼品質與功能可靠性

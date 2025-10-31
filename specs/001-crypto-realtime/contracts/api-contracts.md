# API Contracts: Crypto Realtime Dashboard

**Date**: 2025-10-31  
**Phase**: 1 - Design & Contracts  
**Status**: Complete

## Overview

本文件定義 Crypto Realtime Dashboard 的所有 API 合約,包括 Binance WebSocket API 整合規格、內部服務介面和本地存儲合約。由於本專案為純前端應用,主要依賴第三方 API (Binance WebSocket),因此合約著重於外部 API 整合和內部模組介面。

---

## 1. Binance WebSocket Streams (Market Data)

### 1.1 連接端點

**Base URL**: `wss://stream.binance.com:9443`

#### 單一串流連接

```
wss://stream.binance.com:9443/ws/<streamName>
```

#### 組合串流連接 (推薦)

```
wss://stream.binance.com:9443/stream?streams=<streamName1>/<streamName2>/<streamName3>
```

**範例**:

```
wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker
```

**替代端點**:

- `wss://stream.binance.com:443` (替代埠號)
- `wss://data-stream.binance.vision` (純市場數據，不含用戶數據流)

---

### 1.2 連線技術規格

#### 連線限制

- **單一連線最大串流數**: 1024 個串流
- **連線嘗試限制**: 每 5 分鐘每 IP 最多 300 次連線嘗試
- **連線有效期**: 24 小時（連線建立後 24 小時自動斷開，需重新連接）

#### 心跳機制 (Ping/Pong)

- **伺服器 PING 頻率**: 每 20 秒發送一次 PING frame
- **客戶端 PONG 超時**: 必須在 60 秒內回應 PONG frame
- **逾時處理**: 若 60 秒內未收到 PONG，伺服器將主動中斷連線

**實作建議**:

```typescript
// WebSocket 客戶端應自動處理 PING/PONG
// 大多數 WebSocket 庫會自動回應 PING
// 若手動處理:
ws.on("ping", () => {
  ws.pong(); // 立即回應 PONG
});
```

#### 訊息速率限制

- **最大速率**: 每秒最多 5 則訊息（包含 PING、PONG、JSON 控制訊息）
- **超過限制**: 可能導致連線被伺服器中斷

#### 時間戳格式

- **預設格式**: 毫秒（milliseconds）
- **微秒選項**: 在連線 URL 添加參數 `timeUnit=MICROSECOND`
  ```
  wss://stream.binance.com:9443/stream?streams=btcusdt@ticker&timeUnit=MICROSECOND
  ```

---

### 1.3 24小時價格統計串流 (Ticker)

**Stream Name**: `<symbol>@ticker`

**推送頻率**: 1000ms (固定每秒更新)

**訊息格式**:

```json
{
  "e": "24hrTicker", // 事件類型
  "E": 1698765432000, // 事件時間
  "s": "BTCUSDT", // 交易對
  "p": "1234.56", // 24小時價格變化
  "P": "2.78", // 24小時價格變化百分比
  "w": "45000.00", // 加權平均價格
  "x": "44444.34", // 前一個收盤價
  "c": "45678.90", // 最新價格
  "Q": "0.123", // 最新成交量
  "b": "45678.50", // 最佳買價
  "B": "10.5", // 最佳買價數量
  "a": "45679.00", // 最佳賣價
  "A": "5.2", // 最佳賣價數量
  "o": "44444.34", // 24小時前開盤價
  "h": "46000.00", // 24小時最高價
  "l": "44000.00", // 24小時最低價
  "v": "123456.789", // 24小時基礎資產交易量
  "q": "5555555555.00", // 24小時計價資產交易量
  "O": 1698679032000, // 統計開始時間
  "C": 1698765432000, // 統計結束時間
  "F": 123456789, // 第一筆交易ID
  "L": 123556789, // 最後一筆交易ID
  "n": 100000 // 交易筆數
}
```

**TypeScript 介面**:

```typescript
interface BinanceTickerMessage {
  e: "24hrTicker";
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  x: string; // First trade(F)-1 price (first trade before the 24hr rolling window)
  c: string; // Last price
  Q: string; // Last quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade ID
  n: number; // Total number of trades
}
```

**使用的欄位**:

- `s`: 交易對 → `Cryptocurrency.symbol`
- `c`: 最新價格 → `Cryptocurrency.currentPrice`
- `p`: 價格變化 → `Cryptocurrency.priceChange24h`
- `P`: 價格變化百分比 → `Cryptocurrency.priceChangePercent24h`
- `v`: 交易量 → `Cryptocurrency.volume24h`
- `E`: 事件時間 → `Cryptocurrency.lastUpdateTime`

---

### 1.4 K線/蠟燭線串流

**Stream Name**: `<symbol>@kline_<interval>`

**支援的時間間隔**: `1h`, `4h`, `1d`, `1w` (專案使用) | 完整支援: `1s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

**推送頻率**: 1000ms (1s 間隔) / 2000ms (其他間隔)

**訊息格式**:

```json
{
  "e": "kline", // 事件類型
  "E": 1698765432000, // 事件時間
  "s": "BTCUSDT", // 交易對
  "k": {
    "t": 1698761400000, // K線開始時間
    "T": 1698765000000, // K線結束時間
    "s": "BTCUSDT", // 交易對
    "i": "1h", // 時間間隔
    "f": 123456789, // 第一筆交易ID
    "L": 123556789, // 最後一筆交易ID
    "o": "45000.00", // 開盤價
    "c": "45678.90", // 收盤價
    "h": "45800.00", // 最高價
    "l": "44900.00", // 最低價
    "v": "1234.567", // 基礎資產交易量
    "n": 5000, // 交易筆數
    "x": false, // K線是否完結
    "q": "56789012.34", // 計價資產交易量
    "V": "600.123", // 主動買入基礎資產交易量
    "Q": "27500000.00", // 主動買入計價資產交易量
    "B": "0" // 忽略此參數
  }
}
```

**TypeScript 介面**:

```typescript
interface BinanceKlineMessage {
  e: "kline";
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}
```

**使用的欄位**:

- `s`: 交易對 → `KLine.symbol`
- `k.i`: 時間間隔 → `KLine.interval`
- `k.t`: 開始時間 → `KLine.openTime`
- `k.T`: 結束時間 → `KLine.closeTime`
- `k.o`: 開盤價 → `KLine.open`
- `k.h`: 最高價 → `KLine.high`
- `k.l`: 最低價 → `KLine.low`
- `k.c`: 收盤價 → `KLine.close`
- `k.v`: 交易量 → `KLine.volume`
- `k.x`: 是否完結 → `KLine.isFinal`

---

### 1.5 訂閱/取消訂閱管理

**訂閱訊息格式**:

```json
{
  "method": "SUBSCRIBE",
  "params": ["btcusdt@ticker", "ethusdt@ticker", "bnbusdt@kline_1h"],
  "id": 1
}
```

**取消訂閱訊息格式**:

```json
{
  "method": "UNSUBSCRIBE",
  "params": ["btcusdt@ticker"],
  "id": 2
}
```

**回應訊息**:

```json
{
  "result": null,
  "id": 1
}
```

**TypeScript 介面**:

```typescript
interface SubscribeMessage {
  method: "SUBSCRIBE" | "UNSUBSCRIBE";
  params: string[];
  id: number;
}

interface SubscribeResponse {
  result: null;
  id: number;
}
```

---

## 2. 內部服務介面

### 2.1 WebSocket 服務

**檔案**: `src/services/binance/websocket.ts`

```typescript
interface WebSocketService {
  /**
   * 連接到 Binance WebSocket
   */
  connect(): Promise<void>;

  /**
   * 斷開連接
   */
  disconnect(): void;

  /**
   * 訂閱幣種的 ticker 串流
   * @param symbols - 幣種代號陣列 (如 ['BTCUSDT', 'ETHUSDT'])
   */
  subscribeTicker(symbols: string[]): void;

  /**
   * 取消訂閱 ticker 串流
   * @param symbols - 幣種代號陣列
   */
  unsubscribeTicker(symbols: string[]): void;

  /**
   * 訂閱 K 線串流
   * @param symbol - 幣種代號
   * @param interval - 時間間隔 ('1h' | '4h' | '1d' | '1w')
   */
  subscribeKline(symbol: string, interval: KLineInterval): void;

  /**
   * 取消訂閱 K 線串流
   * @param symbol - 幣種代號
   * @param interval - 時間間隔
   */
  unsubscribeKline(symbol: string, interval: KLineInterval): void;

  /**
   * 註冊 ticker 訊息處理器
   * @param handler - 處理函式
   */
  onTicker(handler: (data: PriceUpdate) => void): () => void;

  /**
   * 註冊 K 線訊息處理器
   * @param handler - 處理函式
   */
  onKline(handler: (data: KLine) => void): () => void;

  /**
   * 註冊連線狀態變化處理器
   * @param handler - 處理函式
   */
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void;
}
```

---

### 2.2 本地存儲服務

**檔案**: `src/services/storage/localStorage.ts`

```typescript
interface StorageService {
  /**
   * 取得自選清單
   * @returns Watchlist 物件,若不存在則返回預設值
   */
  getWatchlist(): Watchlist;

  /**
   * 儲存自選清單
   * @param watchlist - Watchlist 物件
   * @returns 是否成功儲存 (localStorage 可用時為 true)
   */
  saveWatchlist(watchlist: Watchlist): boolean;

  /**
   * 新增幣種到自選清單
   * @param symbol - 幣種代號
   * @returns 是否成功
   */
  addFavorite(symbol: string): boolean;

  /**
   * 從自選清單移除幣種
   * @param symbol - 幣種代號
   * @returns 是否成功
   */
  removeFavorite(symbol: string): boolean;

  /**
   * 檢查幣種是否在自選清單中
   * @param symbol - 幣種代號
   */
  isFavorite(symbol: string): boolean;

  /**
   * 清空自選清單
   */
  clearWatchlist(): void;

  /**
   * 檢查 localStorage 是否可用
   */
  isAvailable(): boolean;
}
```

---

### 2.3 資料轉換服務

**檔案**: `src/services/binance/mapper.ts`

```typescript
interface MapperService {
  /**
   * 將 Binance Ticker 訊息轉換為 PriceUpdate
   * @param message - Binance ticker 訊息
   */
  mapTickerToPriceUpdate(message: BinanceTickerMessage): PriceUpdate;

  /**
   * 將 Binance Kline 訊息轉換為 KLine
   * @param message - Binance kline 訊息
   */
  mapKlineMessageToKLine(message: BinanceKlineMessage): KLine;

  /**
   * 將 PriceUpdate 更新到 Cryptocurrency
   * @param crypto - 現有加密貨幣物件
   * @param update - 價格更新事件
   */
  applyPriceUpdate(crypto: Cryptocurrency, update: PriceUpdate): Cryptocurrency;
}
```

---

## 3. React Hooks 介面

### 3.1 useWebSocket Hook

**檔案**: `src/hooks/useWebSocket.ts`

```typescript
interface UseWebSocketReturn {
  /**
   * 連線狀態
   */
  status: ConnectionState;

  /**
   * 錯誤訊息 (若有)
   */
  error: string | null;

  /**
   * 最後連接時間
   */
  lastConnected: Date | null;

  /**
   * 手動重新連接
   */
  reconnect: () => void;
}

/**
 * WebSocket 連接管理 Hook
 * @param symbols - 要訂閱的幣種陣列
 * @param enabled - 是否啟用連接 (預設 true)
 */
function useWebSocket(symbols: string[], enabled?: boolean): UseWebSocketReturn;
```

---

### 3.2 useCryptoPrice Hook

**檔案**: `src/hooks/useCryptoPrice.ts`

```typescript
interface UseCryptoPriceReturn {
  /**
   * 加密貨幣資料
   */
  data: Cryptocurrency | undefined;

  /**
   * 是否載入中
   */
  isLoading: boolean;

  /**
   * 錯誤物件 (若有)
   */
  error: Error | null;

  /**
   * 資料新鮮度 (資料年齡,秒)
   */
  dataAge: number;
}

/**
 * 取得單一幣種的即時價格
 * @param symbol - 幣種代號
 */
function useCryptoPrice(symbol: string): UseCryptoPriceReturn;
```

---

### 3.3 useCryptoPrices Hook

**檔案**: `src/hooks/useCryptoPrices.ts`

```typescript
interface UseCryptoPricesReturn {
  /**
   * 多個加密貨幣資料 (Map: symbol → Cryptocurrency)
   */
  data: Map<string, Cryptocurrency>;

  /**
   * 是否載入中
   */
  isLoading: boolean;

  /**
   * 錯誤物件 (若有)
   */
  error: Error | null;
}

/**
 * 取得多個幣種的即時價格
 * @param symbols - 幣種代號陣列
 */
function useCryptoPrices(symbols: string[]): UseCryptoPricesReturn;
```

---

### 3.4 useKLineChart Hook

**檔案**: `src/hooks/useKLineChart.ts`

```typescript
interface UseKLineChartReturn {
  /**
   * K 線資料陣列
   */
  data: KLine[];

  /**
   * 是否載入中
   */
  isLoading: boolean;

  /**
   * 錯誤物件 (若有)
   */
  error: Error | null;

  /**
   * 切換時間間隔
   * @param newInterval - 新的時間間隔
   */
  setInterval: (newInterval: KLineInterval) => void;

  /**
   * 當前時間間隔
   */
  currentInterval: KLineInterval;
}

/**
 * 取得 K 線圖表資料
 * @param symbol - 幣種代號
 * @param interval - 時間間隔 (預設 '1d')
 */
function useKLineChart(
  symbol: string,
  interval?: KLineInterval,
): UseKLineChartReturn;
```

---

### 3.5 useWatchlist Hook

**檔案**: `src/hooks/useWatchlist.ts`

```typescript
interface UseWatchlistReturn {
  /**
   * 收藏的幣種陣列
   */
  favorites: string[];

  /**
   * 新增收藏
   * @param symbol - 幣種代號
   */
  addFavorite: (symbol: string) => void;

  /**
   * 移除收藏
   * @param symbol - 幣種代號
   */
  removeFavorite: (symbol: string) => void;

  /**
   * 檢查是否已收藏
   * @param symbol - 幣種代號
   */
  isFavorite: (symbol: string) => boolean;

  /**
   * 清空收藏清單
   */
  clearFavorites: () => void;

  /**
   * localStorage 是否可用
   */
  isStorageAvailable: boolean;
}

/**
 * 自選清單管理 Hook
 */
function useWatchlist(): UseWatchlistReturn;
```

---

## 4. Zustand Store 介面

### 4.1 WebSocket Store

**檔案**: `src/stores/websocketStore.ts`

```typescript
interface WebSocketStore {
  // State
  status: ConnectionState;
  error: string | null;
  lastConnected: Date | null;
  retryCount: number;

  // Actions
  setStatus: (status: ConnectionState) => void;
  setError: (error: string | null) => void;
  setLastConnected: (date: Date) => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
}

const useWebSocketStore = create<WebSocketStore>((set) => ({ ... }));
```

---

### 4.2 Watchlist Store

**檔案**: `src/stores/watchlistStore.ts`

```typescript
interface WatchlistStore {
  // State
  favorites: string[];
  isStorageAvailable: boolean;

  // Actions
  addFavorite: (symbol: string) => void;
  removeFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
  clearFavorites: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const useWatchlistStore = create<WatchlistStore>((set, get) => ({ ... }));
```

---

## 5. 錯誤處理合約

### 5.1 錯誤類型定義

```typescript
/**
 * WebSocket 連接錯誤
 */
class WebSocketConnectionError extends Error {
  constructor(
    message: string,
    public readonly retryCount: number,
    public readonly maxRetries: number,
  ) {
    super(message);
    this.name = "WebSocketConnectionError";
  }
}

/**
 * 資料驗證錯誤
 */
class DataValidationError extends Error {
  constructor(
    message: string,
    public readonly invalidData: unknown,
    public readonly validationErrors: string[],
  ) {
    super(message);
    this.name = "DataValidationError";
  }
}

/**
 * 存儲錯誤
 */
class StorageError extends Error {
  constructor(
    message: string,
    public readonly operation: "read" | "write" | "delete",
  ) {
    super(message);
    this.name = "StorageError";
  }
}
```

---

### 5.2 錯誤處理策略

| 錯誤類型            | 處理策略              | 使用者通知                                |
| ------------------- | --------------------- | ----------------------------------------- |
| WebSocket 斷線      | 自動重試 (指數退避)   | 顯示「連線已中斷,正在重新連接...」        |
| WebSocket 重試失敗  | 停止重試,顯示錯誤     | 顯示「無法連接伺服器,請檢查網路」         |
| 資料驗證失敗        | 記錄錯誤,忽略無效訊息 | 無 (靜默處理)                             |
| localStorage 不可用 | 降級至記憶體存儲      | 顯示「無法保存收藏,頁面刷新後清單將丟失」 |
| 圖表渲染失敗        | 顯示錯誤佔位符        | 顯示「圖表載入失敗,請重試」               |

---

## 6. 效能合約

### 6.1 回應時間目標

| 操作               | 目標時間 | 測量方式                     |
| ------------------ | -------- | ---------------------------- |
| WebSocket 連接建立 | < 1s     | `onopen` 事件觸發時間        |
| 價格更新延遲       | < 1s     | 接收訊息到 UI 更新的時間差   |
| 自選清單操作       | < 100ms  | 操作執行到 UI 更新的時間差   |
| K 線圖表切換       | < 500ms  | 切換時間間隔到圖表重繪完成   |
| 首屏載入           | < 2s     | FCP (First Contentful Paint) |

---

### 6.2 節流與防抖策略

```typescript
// Ticker 更新節流 (每秒最多更新一次)
const throttledPriceUpdate = throttle((update: PriceUpdate) => {
  updateCryptoPrice(update);
}, 1000);

// 搜尋輸入防抖 (300ms)
const debouncedSearch = debounce((query: string) => {
  searchCryptocurrencies(query);
}, 300);

// K 線圖表滾動節流 (60 FPS = 16.67ms)
const throttledChartScroll = throttle((event: WheelEvent) => {
  handleChartScroll(event);
}, 16);
```

---

## Summary

本文件定義了以下 API 合約:

1. **Binance WebSocket API**: Ticker 串流、K 線串流、訂閱管理
2. **內部服務介面**: WebSocket 服務、本地存儲服務、資料轉換服務
3. **React Hooks 介面**: useWebSocket, useCryptoPrice, useKLineChart, useWatchlist
4. **Zustand Store 介面**: WebSocket Store, Watchlist Store
5. **錯誤處理合約**: 錯誤類型定義、處理策略
6. **效能合約**: 回應時間目標、節流防抖策略

所有合約均包含完整的 TypeScript 介面定義,可直接用於實作和單元測試。

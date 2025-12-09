# WebSocket 學習路徑指南

> 🎯 **目標讀者**：沒有使用過 WebSocket 的前端工程師
> ⏱️ **預估學習時間**：2-3 週（每天 2-3 小時）
> 🏆 **學習成果**：掌握企業級 WebSocket 架構的設計與實作

---

## 📚 學習路徑規劃（由淺入深）

本專案是一個連接幣安（Binance）加密貨幣即時報價的 WebSocket 應用，採用企業級架構設計。學習路徑分為五個階段，建議按順序學習。

---

### 🎯 第一階段：基礎概念理解（1-2 天）

**目標**：理解 WebSocket 是什麼，以及如何在前端使用

#### 1. [src/services/websocket/constants.ts](../src/services/websocket/constants.ts)

- 📍 **為什麼先看這個**：了解 WebSocket 的配置參數（端點、超時時間、心跳檢測）
- 🔍 **學習重點**：
  - Binance WebSocket 端點 URL 格式
  - 連接超時、心跳檢測的時間設定
  - 重連策略的參數配置
  - 訊息佇列配置
  - 訂閱限制（1024 個/連接）

#### 2. [src/services/websocket/types/connection.types.ts](../src/services/websocket/types/connection.types.ts)

- 📍 **為什麼看這個**：了解 WebSocket 連接的狀態和事件
- 🔍 **學習重點**：
  - `ConnectionStatus`（連接中、已連接、斷線中等狀態）
  - `ConnectionEvent`（連接、訊息、錯誤、關閉等事件）
  - `ConnectionState` 和 `ConnectionMetrics`
  - WebSocket 的生命週期

#### 3. [src/services/websocket/types/subscription.types.ts](../src/services/websocket/types/subscription.types.ts)

- 📍 **為什麼看這個**：了解如何訂閱數據流
- 🔍 **學習重點**：
  - `StreamType`（miniTicker、kline 等數據流類型）
  - 訂閱請求的格式
  - Callback 函數的簽名
  - 訂閱管理器的狀態

---

### 🔧 第二階段：核心連接管理（2-3 天）

**目標**：理解 WebSocket 連接的建立、維護、斷線重連

#### 4. [src/services/websocket/core/WebSocketConnection.ts](../src/services/websocket/core/WebSocketConnection.ts) ⭐ **核心重點**

- 📍 **為什麼這是核心**：封裝原生 WebSocket API，提供企業級功能
- 🔍 **學習重點**：
  - **第 100-200 行**：連接建立和 Promise 化
  - **第 300-400 行**：事件處理（onopen、onmessage、onerror、onclose）
  - **第 500-600 行**：重連邏輯和錯誤處理
  - **第 700+ 行**：狀態管理和清理
- 💡 **學習建議**：
  - 先看構造函數和 `connect()` 方法
  - 理解如何將原生 WebSocket 的 callback 轉換成 Promise
  - 學習事件監聽器模式（`on()`/`off()`）
  - 注意資源清理的時機

#### 5. [src/services/websocket/strategy/ReconnectStrategy.ts](../src/services/websocket/strategy/ReconnectStrategy.ts)

- 📍 **為什麼看這個**：理解斷線重連的策略
- 🔍 **學習重點**：
  - **指數退避演算法**（Exponential Backoff）：每次重連間隔加倍
  - **抖動機制**（Jitter）：避免所有客戶端同時重連，造成「雷擊效應」
  - **最大重試次數限制**：防止無限重連
  - **Strategy Pattern** 的應用
- 💡 **重要概念**：
  ```
  第 1 次重連：1 秒
  第 2 次重連：2 秒
  第 3 次重連：4 秒
  第 4 次重連：8 秒
  ... 最多 30 秒
  ```

#### 6. [src/services/websocket/core/HealthMonitor.ts](../src/services/websocket/core/HealthMonitor.ts)

- 📍 **為什麼看這個**：理解如何監控 WebSocket 健康狀態
- 🔍 **學習重點**：
  - **心跳檢測機制**（Heartbeat）：定期發送 ping，檢測連接是否存活
  - **靜默斷線檢測**：一段時間沒收到訊息，主動斷線重連
  - **訊息速率監控**：計算每秒接收訊息數
  - **延遲採樣和計算**：使用循環緩衝區（Circular Buffer）
  - **連接品質評分**（0-100 分）：EXCELLENT、GOOD、POOR、CRITICAL
- 💡 **學習建議**：
  - 理解「靜默斷線」vs「實際斷線」的區別
  - 學習如何使用循環緩衝區優化記憶體

---

### 🎨 第三階段：訂閱和訊息處理（2-3 天）

**目標**：理解如何訂閱數據、處理訊息、優化效能

#### 7. [src/services/websocket/subscription/SubscriptionManager.ts](../src/services/websocket/subscription/SubscriptionManager.ts)

- 📍 **為什麼看這個**：理解訂閱管理的核心邏輯
- 🔍 **學習重點**：
  - **訂閱去重**：多個元件訂閱同一 symbol 只發送一次請求
  - **自動恢復訂閱**：重連後自動恢復所有訂閱
  - **Callback 管理**：多個元件訂閱同一數據，每個都能收到更新
  - **訂閱-發布模式**（Pub-Sub Pattern）
- 💡 **重要概念**：
  ```
  元件 A 訂閱 BTCUSDT → 發送訂閱請求
  元件 B 訂閱 BTCUSDT → 不發送請求，共用同一訂閱
  元件 A 取消訂閱   → 不發送取消請求，因為 B 還在用
  元件 B 取消訂閱   → 發送取消訂閱請求
  ```

#### 8. [src/services/websocket/performance/MessageRouter.ts](../src/services/websocket/performance/MessageRouter.ts)

- 📍 **為什麼看這個**：理解訊息解析和路由
- 🔍 **學習重點**：
  - **訊息類型識別**：如何判斷 24hrMiniTicker、kline 等
  - **訊息驗證**：檢查必要欄位是否存在
  - **格式轉換**：Binance 格式 → 內部格式（Adapter Pattern）
  - **錯誤隔離**：單一訊息解析失敗不影響其他訊息
- 💡 **學習建議**：
  - 對照 [Binance WebSocket API 文檔](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
  - 理解為什麼需要格式轉換（封裝外部 API，便於未來替換）

#### 9. [src/services/websocket/performance/MessageQueue.ts](../src/services/websocket/performance/MessageQueue.ts)

- 📍 **為什麼看這個**：理解高頻訊息的效能優化
- 🔍 **學習重點**：
  - **`requestAnimationFrame` 批次處理**：配合瀏覽器重繪週期（60 FPS）
  - **訊息合併**：同一 symbol 只保留最新訊息
  - **Producer-Consumer 模式**：生產者添加訊息，消費者批次處理
  - **優先級處理**：重要訊息優先處理
  - **過期訊息處理**：丟棄過舊的訊息
- 💡 **為什麼需要批次處理**：
  ```
  沒有批次：1 秒收到 1000 個訊息 → 觸發 1000 次 React 重渲染 → 卡頓
  有批次：1 秒收到 1000 個訊息 → 批次處理 → 觸發 60 次重渲染 → 流暢
  ```

---

### 🏗️ 第四階段：架構整合（2-3 天）

**目標**：理解整體架構如何協同工作

#### 10. [src/services/websocket/core/ConnectionManager.ts](../src/services/websocket/core/ConnectionManager.ts) ⭐⭐ **最重要**

- 📍 **為什麼這是最重要的**：整合所有組件的協調者，99% 情況下唯一需要使用的類別
- 🔍 **學習重點**：
  - **第 50-150 行**：參照計數機制（Reference Counting）解決 React StrictMode 問題
  - **第 200-300 行**：`acquire()`/`release()` 資源管理
  - **第 400+ 行**：如何協調 ConnectionPool、SubscriptionManager、MessageQueue、MessageRouter
  - **Singleton Pattern**：全域單例
  - **Mediator Pattern**：協調各組件交互
- 💡 **學習建議**：
  - 理解為什麼需要參照計數（React 18 StrictMode 會雙重掛載組件）
  - 理解延遲斷線機制（500ms 緩衝，避免頻繁斷開/重連）
  - 這是前端開發者主要使用的 API
- 💡 **參照計數原理**：
  ```
  元件 A mount  → acquire() → refCount = 1 → 建立連接
  元件 B mount  → acquire() → refCount = 2 → 共用連接
  元件 A unmount → release() → refCount = 1 → 不斷線
  元件 B unmount → release() → refCount = 0 → 500ms 後斷線
  ```

#### 11. [src/services/websocket/core/ConnectionPool.ts](../src/services/websocket/core/ConnectionPool.ts)

- 📍 **為什麼看這個**：理解連接池管理
- 🔍 **學習重點**：
  - **單例模式**：公開市場流（Public Market Stream）
  - **連接的獲取和釋放**：`acquire()`/`release()`
  - **連接監控**：狀態查詢、健康檢查
  - **未來擴展點**：私有用戶流（Private User Stream）預留架構
- 💡 **為什麼需要連接池**：
  - Binance 限制每個連接最多 1024 個訂閱
  - 未來可能需要私有用戶流（需要認證）
  - 統一管理多個連接的生命週期

---

### ⚛️ 第五階段：React 整合（3-4 天）

**目標**：理解如何在 React 元件中使用 WebSocket

#### 12. [src/hooks/useCrypto.ts](../src/hooks/useCrypto.ts) ⭐⭐⭐ **實戰必讀**

- 📍 **為什麼這是實戰必讀**：完整的 React Hooks 整合範例
- 🔍 **學習重點**：
  - **第 50-150 行**：`useWebSocket()` - 連接管理（acquire/release 模式）
  - **第 200-350 行**：`useCryptoPrices(symbols)` - 批次訂閱多個 symbols
  - **第 400-550 行**：`useKLineChart(symbol)` - K線訂閱和智能合併
  - **第 600+ 行**：`useCrypto(symbol)` - 整合所有功能的高階 Hook
- 💡 **學習建議**：
  - **理解 `useEffect` 的依賴管理**：避免無限循環
  - **理解 `useRef` 避免閉包問題**：Callback 中引用最新狀態
  - **理解 `useCallback` 避免不必要的重渲染**：優化效能
  - **理解清理函數**：`useEffect` 的 return，確保資源釋放
- 💡 **Hooks 最佳實踐**：

  ```typescript
  // ✅ 正確：使用 useRef 避免閉包問題
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // ✅ 正確：清理函數釋放資源
  useEffect(() => {
    manager.acquire();
    return () => manager.release();
  }, []);

  // ❌ 錯誤：忘記清理
  useEffect(() => {
    manager.acquire();
  }, []);
  ```

#### 13. [src/stores/market.store.ts](../src/stores/market.store.ts)

- 📍 **為什麼看這個**：理解狀態管理（Zustand）
- 🔍 **學習重點**：
  - **集中管理 WebSocket 數據**：價格、K線、訂閱狀態
  - **精準訂閱**（Selective Subscription）：避免不必要的重渲染
  - **訂閱去重**：Store 層級的去重
  - **自動清理機制**：移除不再使用的訂閱
- 💡 **學習建議**：

  ```typescript
  // ✅ 精準訂閱：只在價格變化時重渲染
  const price = useMarketStore((state) => state.prices[symbol]);

  // ❌ 過度訂閱：任何資料變化都重渲染
  const store = useMarketStore();
  const price = store.prices[symbol];
  ```

#### 14. 實際元件範例

##### [src/components/CryptoList.tsx](../src/components/CryptoList.tsx)

- **用途**：列表顯示多個加密貨幣即時價格
- **使用的 Hook**：`useCryptoPrices(symbols)`
- **學習重點**：批次訂閱、列表渲染優化

##### [src/components/KLineChart.tsx](../src/components/KLineChart.tsx)

- **用途**：顯示 K線圖表
- **使用的 Hook**：`useKLineChart(symbol)`
- **學習重點**：圖表整合、資料視覺化

##### [src/components/ConnectionStatus.tsx](../src/components/ConnectionStatus.tsx)

- **用途**：顯示 WebSocket 連接狀態指示器
- **使用的 Hook**：`useWebSocket()`
- **學習重點**：狀態顯示、使用者回饋

##### [src/components/crypto/CryptoPriceCard.tsx](../src/components/crypto/CryptoPriceCard.tsx)

- **用途**：單個加密貨幣卡片元件
- **學習重點**：價格顯示、漲跌指示

---

## 🎓 學習建議和最佳實踐

### 📖 學習方法

#### 1. 從上到下，由淺入深

- ❌ **不要一開始就看 ConnectionManager**
- ✅ **先理解基礎概念**（types、constants）
- ✅ **再理解單一連接**（WebSocketConnection）
- ✅ **最後理解整體架構**（ConnectionManager）

#### 2. 動手實驗

- **在瀏覽器 Console 開啟 Network → WS** 查看實際訊息
- **修改 constants.ts 的參數**，觀察行為變化
- **在 hooks 中加 `console.log`** 觀察數據流
- **刻意觸發錯誤**，觀察錯誤處理和重連機制

#### 3. 畫圖理解

- **畫出連接生命週期圖**
  ```
  DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → CONNECTED
                      ↓              ↓
                   ERROR        DISCONNECTED
  ```
- **畫出訂閱流程圖**
  ```
  Component → Hook → Store → SubscriptionManager → WebSocketConnection → Binance
  ```
- **畫出訊息處理流程圖**
  ```
  Binance → WebSocket → MessageRouter → MessageQueue → Callbacks → React State
  ```

---

### 💡 關鍵概念速查

| 概念                 | 說明                                                     | 檔案位置               |
| -------------------- | -------------------------------------------------------- | ---------------------- |
| **WebSocket 是什麼** | 雙向通訊協議，比 HTTP 更即時，適合即時數據推送           | WebSocketConnection.ts |
| **心跳檢測**         | 定期發送 ping，檢測連接是否存活，防止靜默斷線            | HealthMonitor.ts       |
| **重連策略**         | 斷線後自動重連，指數退避避免伺服器過載                   | ReconnectStrategy.ts   |
| **訂閱去重**         | 多個元件訂閱同一數據只發送一次請求，節省資源             | SubscriptionManager.ts |
| **批次處理**         | 使用 rAF 批次更新，避免高頻渲染導致卡頓                  | MessageQueue.ts        |
| **參照計數**         | 解決 React StrictMode 雙重掛載問題，智能管理連接生命週期 | ConnectionManager.ts   |
| **連接池**           | 管理多個 WebSocket 連接，支援公開流和私有流              | ConnectionPool.ts      |
| **訊息路由**         | 解析和轉換 Binance 訊息格式，封裝外部 API                | MessageRouter.ts       |
| **健康監控**         | 監控連接品質、訊息速率、延遲，提供品質評分               | HealthMonitor.ts       |
| **精準訂閱**         | 只訂閱需要的狀態，避免不必要的重渲染                     | market.store.ts        |

---

### 🚀 快速上手路徑（如果時間有限）

如果你只想快速使用而不深入理解架構，按照這個順序：

1. **[src/hooks/useCrypto.ts](../src/hooks/useCrypto.ts)** - 看如何使用 Hooks（15 分鐘）
2. **[src/components/CryptoList.tsx](../src/components/CryptoList.tsx)** - 看實際元件範例（10 分鐘）
3. **[src/services/websocket/core/ConnectionManager.ts](../src/services/websocket/core/ConnectionManager.ts)** - 理解 API（20 分鐘）
4. **[src/services/websocket/constants.ts](../src/services/websocket/constants.ts)** - 了解配置（5 分鐘）

**總計：50 分鐘**，你就能開始使用 WebSocket 功能。

---

### 🔍 除錯技巧

#### 1. 查看 WebSocket 訊息

```
Chrome DevTools → Network → WS → 點擊連接 → Messages
```

可以看到：

- ⬆️ 發送的訊息（訂閱請求）
- ⬇️ 接收的訊息（價格更新）

#### 2. 查看連接狀態

- **方法 1**：使用 `<ConnectionStatus />` 元件
- **方法 2**：在 Console 執行：
  ```javascript
  ConnectionManager.getInstance().getStatus();
  ```

#### 3. 查看訂閱列表

- **React DevTools** → Components → 查看 `useWebSocketStore` 狀態
- **Console 執行**：
  ```javascript
  useWebSocketStore.getState().subscriptions;
  ```

#### 4. 監控效能

- **Chrome DevTools** → Performance → 錄製
- **查看 MessageQueue 統計**：
  ```javascript
  ConnectionManager.getInstance().getMetrics();
  ```

#### 5. 模擬斷線

- **Chrome DevTools** → Network → Offline
- 觀察重連行為和訂閱恢復

---

### ⚠️ 常見陷阱

#### 1. React StrictMode 雙重掛載

- **問題**：開發模式下 WebSocket 連接兩次又斷開一次
- ✅ **已解決**：使用參照計數機制
- 📍 **查看**：[ConnectionManager.ts](../src/services/websocket/core/ConnectionManager.ts) 的 `acquire()`/`release()`

#### 2. 重複訂閱

- **問題**：多個元件訂閱同一 symbol，發送多次訂閱請求
- ✅ **已解決**：SubscriptionManager 自動去重
- 📍 **查看**：[SubscriptionManager.ts](../src/services/websocket/subscription/SubscriptionManager.ts)

#### 3. 高頻更新導致卡頓

- **問題**：價格更新太快（1 秒 1000 次），React 重渲染卡頓
- ✅ **已解決**：MessageQueue 批次處理（60 FPS）
- 📍 **查看**：[MessageQueue.ts](../src/services/websocket/performance/MessageQueue.ts)

#### 4. 忘記清理訂閱

- **問題**：元件卸載後仍在接收訊息，導致記憶體洩漏
- ✅ **已解決**：Hooks 自動在 `useEffect` cleanup 中釋放
- 📍 **查看**：[useCrypto.ts](../src/hooks/useCrypto.ts) 的 `useEffect` return

#### 5. 閉包問題

- **問題**：Callback 中引用的狀態是舊的
- ✅ **已解決**：使用 `useRef` 保存最新的 callback
- 📍 **查看**：[useCrypto.ts](../src/hooks/useCrypto.ts) 的 `callbackRef`

#### 6. 訂閱限制

- **問題**：Binance 限制每個連接最多 1024 個訂閱
- ✅ **已解決**：ConnectionPool 支援多連接（未來擴展）
- 📍 **查看**：[constants.ts](../src/services/websocket/constants.ts) 的 `MAX_SUBSCRIPTIONS_PER_CONNECTION`

---

## 🏛️ 核心架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  (CryptoList, KLineChart, ConnectionStatus, ...)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     React Hooks                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │ useCrypto  │  │useCryptoPrices│  │ useKLineChart  │    │
│  └─────┬──────┘  └──────┬───────┘  └────────┬────────┘    │
│        └─────────────────┴──────────────────┬─────────────┐ │
│                                             ▼             │ │
│                              ┌─────────────────────────┐ │ │
│                              │   useWebSocket()        │ │ │
│                              └────────┬────────────────┘ │ │
└───────────────────────────────────────┼──────────────────┼─┘
                                        │                  │
                                        ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management                          │
│  ┌──────────────────┐          ┌────────────────────────┐  │
│  │ useWebSocketStore│          │ useMarketDataStore     │  │
│  │ (Zustand)        │          │ (Zustand)              │  │
│  └────────┬─────────┘          └───────┬────────────────┘  │
└───────────┼────────────────────────────┼─────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│               ConnectionManager (Singleton) ⭐               │
│                    (協調者 - Mediator)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Reference Counting (參照計數)                        │  │
│  │ • Delayed Disconnect (延遲斷線 500ms)                  │  │
│  │ • Coordination (協調各組件)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└───┬────────────┬────────────┬────────────┬────────────────┘
    │            │            │            │
    ▼            ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐
│Connection│ │Subscription│ │ Message │ │  Message   │
│  Pool   │ │ Manager │ │  Queue  │ │  Router    │
└────┬────┘ └─────────┘ └─────────┘ └────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│        WebSocketConnection (單一連接)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Native WebSocket Wrapper                           │  │
│  │ • Promise-based API (async/await)                    │  │
│  │ • Event-driven (on/off)                              │  │
│  │ • Auto Reconnect                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
  ┌────────────┐ ┌────────┐ ┌──────────┐
  │  Health    │ │Reconnect│ │ Error   │
  │  Monitor   │ │Strategy │ │Handling │
  └────────────┘ └────────┘ └──────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Binance WebSocket API                        │
│     wss://stream.binance.com:9443/ws/{streamName}           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 核心設計模式

| 設計模式               | 應用位置                               | 說明                                   |
| ---------------------- | -------------------------------------- | -------------------------------------- |
| **Singleton Pattern**  | ConnectionManager, WebSocketConnection | 全域單例，確保只有一個實例             |
| **Factory Pattern**    | ConnectionPool                         | 建立和管理多個連接                     |
| **Observer Pattern**   | 事件系統、訂閱管理                     | 事件驅動架構，發布-訂閱模式            |
| **Strategy Pattern**   | ReconnectStrategy                      | 可插拔的重連策略（指數退避、固定間隔） |
| **Mediator Pattern**   | ConnectionManager                      | 協調各組件之間的交互                   |
| **Producer-Consumer**  | MessageQueue                           | 批次處理訊息，優化效能                 |
| **Adapter Pattern**    | MessageRouter                          | 轉換 Binance 格式為內部格式            |
| **Reference Counting** | ConnectionManager                      | 智能管理連接生命週期                   |

---

## 🏆 企業級特性清單

本專案展現了企業級 WebSocket 架構的以下特性：

- ✅ **完整的連接管理**（建立、維護、斷線重連）
- ✅ **智能訂閱管理**（去重、自動恢復）
- ✅ **高效訊息處理**（批次處理、合併、路由）
- ✅ **健康監控**（心跳檢測、品質評分）
- ✅ **重連策略**（指數退避、抖動機制）
- ✅ **React 完美整合**（Hooks、Store、自動清理）
- ✅ **生產級錯誤處理**（錯誤分類、統一處理）
- ✅ **效能優化**（參照計數、訊息批次、節流更新）
- ✅ **可擴展架構**（連接池、策略模式）
- ✅ **完整的型別定義**（TypeScript 強型別）
- ✅ **詳細的文件和註解**
- ✅ **企業級程式碼品質**

---

## 📊 學習時間規劃

| 階段         | 內容           | 預估時間   | 累計時間 |
| ------------ | -------------- | ---------- | -------- |
| **第一階段** | 基礎概念理解   | 1-2 天     | 1-2 天   |
| **第二階段** | 核心連接管理   | 2-3 天     | 3-5 天   |
| **第三階段** | 訂閱和訊息處理 | 2-3 天     | 5-8 天   |
| **第四階段** | 架構整合       | 2-3 天     | 7-11 天  |
| **第五階段** | React 整合     | 3-4 天     | 10-15 天 |
| **實作練習** | 自己動手實作   | 5-7 天     | 15-22 天 |
| **總計**     | -              | **2-3 週** | -        |

**每天建議學習時間**：2-3 小時

---

## 📚 延伸閱讀

### 官方文檔

- [Binance WebSocket API](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
- [MDN - WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Hooks 官方文檔](https://react.dev/reference/react)

### 設計模式

- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)

### WebSocket 最佳實踐

- [WebSocket 連接管理最佳實踐](https://web.dev/websockets-basics/)
- [React 中使用 WebSocket 的最佳實踐](https://react.dev/learn/synchronizing-with-effects)

---

## 💬 常見問題 FAQ

### Q1：為什麼不直接使用原生 WebSocket API？

**A**：原生 API 缺少企業級功能：

- ❌ 沒有自動重連
- ❌ 沒有訂閱管理
- ❌ 沒有效能優化
- ❌ 沒有健康監控
- ❌ 難以整合 React

### Q2：為什麼需要 MessageQueue 批次處理？

**A**：加密貨幣價格更新非常頻繁（1 秒可能 1000 次），直接更新 React 狀態會導致嚴重卡頓。批次處理配合 `requestAnimationFrame`，將更新頻率控制在 60 FPS，既保證即時性又流暢。

### Q3：為什麼需要參照計數？

**A**：React 18 的 StrictMode 在開發模式下會雙重掛載元件，導致 WebSocket 連接兩次又斷開一次。參照計數機制追蹤有多少個元件在使用連接，只有當所有元件都卸載時才真正斷開。

### Q4：如何擴展到其他 WebSocket 服務（如 Coinbase、Kraken）？

**A**：

1. 修改 `MessageRouter` 的解析邏輯（Adapter Pattern）
2. 修改 `constants.ts` 的端點 URL
3. 其他組件無需修改（封裝良好）

### Q5：如何添加認證（Private User Stream）？

**A**：

1. 在 `ConnectionPool` 中添加 `getUserStream()` 方法
2. 在連接時傳入 API Key 和 Secret
3. 實作簽名邏輯
4. 其他組件無需修改（架構已預留擴展點）

---

## 🎉 學習完成檢查清單

完成以下檢查項目，表示你已經掌握 WebSocket 的核心知識：

### 基礎知識

- [ ] 理解 WebSocket 與 HTTP 的區別
- [ ] 理解 WebSocket 的生命週期（連接、訊息、斷線）
- [ ] 理解心跳檢測的原理和必要性
- [ ] 理解重連策略（指數退避、抖動機制）

### 架構理解

- [ ] 理解 ConnectionManager 的協調者角色
- [ ] 理解 SubscriptionManager 的訂閱去重機制
- [ ] 理解 MessageQueue 的批次處理原理
- [ ] 理解參照計數解決 React StrictMode 問題

### React 整合

- [ ] 能使用 `useCrypto()` Hook 訂閱加密貨幣價格
- [ ] 理解 `useEffect` 的清理函數重要性
- [ ] 理解 `useRef` 避免閉包問題
- [ ] 能整合 Zustand Store 管理 WebSocket 狀態

### 實戰能力

- [ ] 能使用 Chrome DevTools 除錯 WebSocket
- [ ] 能監控連接狀態和訊息流
- [ ] 能處理常見錯誤（斷線、重連失敗）
- [ ] 能優化效能（避免高頻重渲染）

### 進階能力

- [ ] 能擴展到其他 WebSocket 服務
- [ ] 能實作新的重連策略
- [ ] 能添加新的訊息類型
- [ ] 能優化架構（連接池、訊息路由）

---

## 🚀 下一步

完成學習後，建議：

1. **實作一個小專案**：使用本專案的 WebSocket 架構，連接其他 API（如天氣、股票）
2. **閱讀原始碼**：深入理解每個檔案的實作細節
3. **優化效能**：使用 Chrome DevTools 分析效能瓶頸
4. **擴展功能**：添加新功能（如訂單簿、交易記錄）
5. **分享學習心得**：寫一篇技術文章，鞏固學習成果

---

## 📞 獲取幫助

如果在學習過程中遇到問題：

1. **查看原始碼註解**：每個檔案都有詳細的註解
2. **查看 Git 提交歷史**：了解程式碼的演進過程
3. **查看測試檔案**：了解如何使用各個 API
4. **查看 specs 文檔**：了解專案的需求和設計

---

**祝你學習愉快！🎉**

> 💡 **記住**：學習程式設計最好的方法是動手實作。邊學邊寫，邊寫邊學。不要只是看程式碼，要動手改、動手試、動手做！

/**
 * WebSocket 服務統一導出
 *
 * 📚 學習重點：
 * 1. 模組化設計的導出策略
 * 2. 公開 API 與內部實作的分離
 * 3. 便利函數的提供
 *
 * 🎯 導出策略：
 *
 * 1. 核心 API（推薦使用）
 *    - ConnectionManager：主要介面
 *    - 類型定義：TypeScript 支援
 *
 * 2. 進階 API（進階使用）
 *    - 各個獨立組件：用於自定義架構
 *    - 常量配置：用於調整行為
 *
 * 3. 內部實作（不建議直接使用）
 *    - 錯誤類別：用於錯誤處理
 *    - 工具函數：內部使用
 *
 * 💡 最佳實踐：
 * - 優先使用 ConnectionManager
 * - 透過類型定義獲得 IDE 支援
 * - 避免直接操作底層組件
 */

// ============================================================================
// 核心 API（推薦使用）
// ============================================================================

/**
 * 連接管理器（主要介面）
 *
 * 🎯 這是整個 WebSocket 服務的入口點
 * 99% 的情況下，只需要使用這個類別
 *
 * @example
 * import { ConnectionManager } from '@/services/websocket'
 *
 * const manager = ConnectionManager.getInstance({ debug: true })
 *
 * // 在 React Hook 中使用
 * useEffect(() => {
 *   manager.acquire()
 *   return () => manager.release()
 * }, [])
 *
 * // 訂閱價格
 * const unsubscribe = manager.subscribePrice('BTCUSDT', (update) => {
 *   console.log(update.price)
 * })
 */
export { ConnectionManager } from "./core/ConnectionManager";
export type { ConnectionManagerConfig } from "./core/ConnectionManager";

// ============================================================================
// 類型定義（TypeScript 支援）
// ============================================================================

/**
 * 所有類型定義
 *
 * 💡 提供完整的 TypeScript 支援
 * 用於類型註解、泛型參數等
 */
export type {
  // Connection Types
  ConnectionStatus,
  ConnectionType,
  WebSocketConfig,
  ConnectionState,
  WebSocketEventType,
  ConnectionEvent,
  ConnectionMetrics,

  // Subscription Types
  StreamType,
  TimeFrame,
  SubscriptionCallback,
  UnsubscribeFunction,
  SubscriptionManagerState,
  SubscriptionStats,

  // Message Types
  ProcessedMessage,
  MessageType,
  MessageQueueConfig,
  MessageStats,
} from "./types";

// 命名空間導出（進階使用）
export type { Connection, Subscription, Message } from "./types";

// ============================================================================
// 進階 API（進階使用）
// ============================================================================

/**
 * 獨立組件
 *
 * ⚠️ 注意：
 * 這些組件主要用於自定義架構或測試
 * 一般情況下，使用 ConnectionManager 即可
 *
 * 🎯 使用場景：
 * - 自定義連接管理策略
 * - 單元測試
 * - 效能優化實驗
 */
export { ConnectionPool } from "./core/ConnectionPool";
export type {
  ConnectionPoolConfig,
  ConnectionPoolStats,
} from "./core/ConnectionPool";

export { WebSocketConnection } from "./core/WebSocketConnection";

export { HealthMonitor } from "./core/HealthMonitor";
export type { HealthStatus, HealthCheckResult } from "./core/HealthMonitor";

export { SubscriptionManager } from "./subscription/SubscriptionManager";

export { MessageQueue } from "./performance/MessageQueue";

export { MessageRouter } from "./performance/MessageRouter";

// ============================================================================
// 策略與配置
// ============================================================================

/**
 * 重連策略
 *
 * 💡 提供多種重連策略實作
 * 可以根據需求選擇或自定義
 */
export {
  ExponentialBackoffStrategy,
  FixedIntervalStrategy,
  AdaptiveStrategy,
  createDefaultStrategy,
} from "./strategy/ReconnectStrategy";

export type { ReconnectStrategy } from "./strategy/ReconnectStrategy";

/**
 * 常量配置
 *
 * 🎯 所有預設配置值
 * 可用於參考或覆蓋
 */
export {
  BINANCE_WS_ENDPOINTS,
  CONNECTION_TIMEOUT,
  HEARTBEAT_CONFIG,
  RECONNECT_STRATEGY,
  MESSAGE_QUEUE_CONFIG,
  SUBSCRIPTION_LIMITS,
  REFERENCE_COUNTING,
  PERFORMANCE_CONFIG,
  QUALITY_THRESHOLDS,
  DEFAULT_CONFIG,
} from "./constants";

// ============================================================================
// 錯誤處理
// ============================================================================

/**
 * 自定義錯誤類別
 *
 * 💡 用於錯誤處理和類型檢查
 *
 * @example
 * try {
 *   manager.subscribePrice(...)
 * } catch (error) {
 *   if (error instanceof SubscriptionError) {
 *     console.error('Subscription failed:', error.toJSON())
 *   }
 * }
 */
export {
  WebSocketError,
  ConnectionError,
  SubscriptionError,
  MessageError,
  ConfigError,
  createWebSocketError,
  normalizeError,
} from "./errors";

export { WebSocketErrorCode } from "./errors";

// ============================================================================
// 便利函數
// ============================================================================

/**
 * 快速建立連接管理器
 *
 * 💡 便利函數，等同於 ConnectionManager.getInstance()
 *
 * @example
 * import { createConnectionManager } from '@/services/websocket'
 *
 * const manager = createConnectionManager({ debug: true })
 */
export { createConnectionManager } from "./core/ConnectionManager";

/**
 * 快速建立連接池
 */
export { createConnectionPool } from "./core/ConnectionPool";

/**
 * 快速建立重連策略
 */
export { createDefaultStrategy as createReconnectStrategy } from "./strategy/ReconnectStrategy";

// ============================================================================
// 文件說明
// ============================================================================

/**
 * 📚 使用指南
 *
 * ## 快速開始
 *
 * ```typescript
 * import { ConnectionManager } from '@/services/websocket'
 * import type { PriceUpdate } from '@/utils/validation'
 *
 * // 1. 獲取管理器實例
 * const manager = ConnectionManager.getInstance({ debug: true })
 *
 * // 2. 在 React Hook 中管理連接
 * function useWebSocket() {
 *   const manager = useMemo(() => ConnectionManager.getInstance(), [])
 *
 *   useEffect(() => {
 *     manager.acquire()  // 增加參照計數
 *     return () => manager.release()  // 減少參照計數
 *   }, [])
 *
 *   return manager
 * }
 *
 * // 3. 訂閱資料
 * function useBitcoinPrice() {
 *   const [price, setPrice] = useState<number>(0)
 *   const manager = useWebSocket()
 *
 *   useEffect(() => {
 *     const unsubscribe = manager.subscribePrice('BTCUSDT', (update: PriceUpdate) => {
 *       setPrice(update.price)
 *     })
 *
 *     return unsubscribe
 *   }, [manager])
 *
 *   return price
 * }
 * ```
 *
 * ## 進階用法
 *
 * ### 自定義配置
 *
 * ```typescript
 * const manager = ConnectionManager.getInstance({
 *   debug: true,
 *   disconnectDelay: 1000,  // 延遲斷線時間
 *   enableMessageQueue: true,  // 啟用訊息佇列
 * })
 * ```
 *
 * ### 監控連接狀態
 *
 * ```typescript
 * const isConnected = manager.isConnected()
 * const state = manager.getConnectionState()
 * const stats = manager.getQueueStats()
 * const health = manager.performHealthCheck()
 * ```
 *
 * ### 錯誤處理
 *
 * ```typescript
 * try {
 *   manager.subscribePrice('INVALID', callback)
 * } catch (error) {
 *   if (error instanceof SubscriptionError) {
 *     if (error.retryable) {
 *       // 可以重試
 *     } else {
 *       // 不可重試，需要修正程式碼
 *     }
 *   }
 * }
 * ```
 *
 * ## 架構說明
 *
 * ```
 * ConnectionManager（入口點）
 *   ├── ConnectionPool（連接池管理）
 *   │   └── WebSocketConnection（單一連接）
 *   │       └── HealthMonitor（健康監控）
 *   ├── SubscriptionManager（訂閱管理）
 *   ├── MessageQueue（訊息佇列）
 *   └── MessageRouter（訊息路由）
 * ```
 *
 * ## 參照計數機制
 *
 * ConnectionManager 使用參照計數解決 React StrictMode 問題：
 *
 * ```
 * 第一個元件掛載 → acquire() → refCount 0→1 → 建立連接
 * 第二個元件掛載 → acquire() → refCount 1→2 → 使用現有連接
 * 第一個元件卸載 → release() → refCount 2→1 → 保持連接
 * 第二個元件卸載 → release() → refCount 1→0 → 排程斷線（500ms 後）
 * ```
 *
 * ## 訂閱去重
 *
 * SubscriptionManager 自動處理重複訂閱：
 *
 * ```
 * // 元件 A 訂閱
 * manager.subscribePrice('BTCUSDT', callbackA)  // 發送訂閱請求
 *
 * // 元件 B 訂閱（不會發送新請求）
 * manager.subscribePrice('BTCUSDT', callbackB)  // 重用現有訂閱
 *
 * // 收到資料時，通知兩個 callback
 * ```
 *
 * ## 效能優化
 *
 * MessageQueue 使用 requestAnimationFrame 批次處理訊息：
 *
 * ```
 * 收到 100 筆價格更新（1 秒內）
 *   ↓
 * MessageQueue 批次處理（每 16ms 一批）
 *   ↓
 * 合併同一 symbol 的更新（100 → 10）
 *   ↓
 * 一次性更新 React 狀態（觸發 1 次重渲染）
 * ```
 *
 * ## 常見問題
 *
 * Q: StrictMode 會導致連接斷開嗎？
 * A: 不會。參照計數機制會處理 StrictMode 的雙重掛載。
 *
 * Q: 如何確認連接已建立？
 * A: 使用 manager.isConnected() 檢查。
 *
 * Q: 訂閱失敗怎麼辦？
 * A: 捕獲 SubscriptionError，檢查 error.retryable 決定是否重試。
 *
 * Q: 如何監控效能？
 * A: 使用 manager.getHealthMonitor().getMetrics() 獲取詳細指標。
 */

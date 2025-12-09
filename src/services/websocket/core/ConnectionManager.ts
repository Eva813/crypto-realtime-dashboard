/**
 * WebSocket 連接管理器（核心）
 *
 * 📚 學習重點：
 * 1. 參照計數（Reference Counting）
 * 2. 單例模式（Singleton Pattern）
 * 3. 延遲斷線（Delayed Disconnect）
 * 4. React StrictMode 兼容性
 *
 * 🎯 為什麼需要連接管理器？
 *
 * 核心問題：React StrictMode 雙重掛載
 *
 * 場景：
 * ```typescript
 * function Dashboard() {
 *   useEffect(() => {
 *     connect()        // ← 掛載：建立連接
 *     return disconnect  // ← 卸載：斷開連接
 *   }, [])
 * }
 * ```
 *
 * StrictMode 執行流程：
 * 1. 第一次掛載 → connect() → 開始連接
 * 2. StrictMode 卸載 → disconnect() → ❌ 立即斷開！
 * 3. StrictMode 重掛載 → connect() → 重新連接
 *
 * 問題：
 * - 連接被中斷（步驟 2）
 * - 觸發錯誤處理
 * - 浪費資源
 * - 用戶看到「連接中...」的閃爍
 *
 * 解決方案：參照計數 + 延遲斷線
 *
 * 改進後的流程：
 * 1. 第一次掛載 → refCount: 0 → 1 → 建立連接 ✅
 * 2. StrictMode 卸載 → refCount: 1 → 0 → 排程 500ms 後斷線 ⏰
 * 3. StrictMode 重掛載（50ms 內）→ refCount: 0 → 1 → 取消斷線 ✅
 * 4. 連接保持活躍！🎉
 *
 * 💡 交易所級別設計：
 * - 支援多個元件共用一個連接
 * - 避免頻繁重連
 * - 降低伺服器負載
 * - 提升用戶體驗
 *
 * 🎯 架構整合：
 * ConnectionManager 是頂層協調者，整合：
 * - ConnectionPool：管理連接
 * - SubscriptionManager：管理訂閱
 * - MessageQueue：訊息佇列
 * - MessageRouter：訊息路由
 */

import { REFERENCE_COUNTING } from "../constants";
import { ConnectionPool } from "./ConnectionPool";
import { SubscriptionManager } from "../subscription/SubscriptionManager";
import { MessageQueue } from "../performance/MessageQueue";
import { MessageRouter } from "../performance/MessageRouter";
import type { PriceUpdate, KLine } from "../../../utils/validation";
import type { TimeFrame, UnsubscribeFunction } from "../types";
import type { HealthCheckResult } from "./HealthMonitor";
import type { ConnectionState } from "../types/connection.types";

/**
 * 連接管理器配置
 */
export interface ConnectionManagerConfig {
  /** 是否啟用除錯日誌 */
  debug?: boolean;

  /** 延遲斷線時間（毫秒），預設 500ms */
  disconnectDelay?: number;

  /** 是否啟用訊息佇列，預設 true */
  enableMessageQueue?: boolean;
}

/**
 * 事件類型定義
 *
 * 💡 EventEmitter 模式
 * 允許外部監聽 ConnectionManager 的狀態變化
 */
export type ConnectionManagerEventType =
  | "stateChange"
  | "error"
  | "reconnecting"
  | "connected"
  | "disconnected";

/**
 * 事件監聽器類型
 */
export type ConnectionManagerEventListener = (data?: unknown) => void;

/**
 * 連接管理器事件映射類型
 *
 * 💡 為什麼使用映射類型？
 * 1. 類型安全：每個事件的參數類型明確
 * 2. 無 any：符合 ESLint @typescript-eslint/no-explicit-any
 * 3. 智能推導：TypeScript 能自動推導監聽器的參數類型
 * 4. 可維護性：事件類型定義集中在一個地方
 *
 * @example
 * const unsubscribe = manager.on('stateChange', (state) => {
 *   // state 自動推導為 ConnectionState 類型
 *   console.log(state.status)
 * })
 */
type ConnectionManagerEventMap = {
  /** 連接狀態變化：傳遞 ConnectionState */
  stateChange: ConnectionState;
  /** 連接錯誤：傳遞 Error */
  error: Error;
  /** 重連開始：無參數 */
  reconnecting: undefined;
  /** 連接成功：無參數 */
  connected: undefined;
  /** 連接斷開：無參數 */
  disconnected: undefined;
};

/**
 * WebSocket 連接管理器
 *
 * 🎯 核心職責：
 * 1. 參照計數：追蹤活躍訂閱者數量
 * 2. 延遲斷線：避免 StrictMode 導致的頻繁重連
 * 3. 訂閱管理：統一的訂閱介面
 * 4. 訊息處理：整合訊息佇列和路由
 * 5. 生命週期：管理所有組件的生命週期
 *
 * 💡 設計模式：
 * - Singleton Pattern：全域唯一實例
 * - Facade Pattern：簡化複雜子系統
 * - Mediator Pattern：協調各個組件
 *
 * 📚 使用範例：
 * ```typescript
 * // 在 React Hook 中使用
 * function useWebSocket() {
 *   const manager = useMemo(() => ConnectionManager.getInstance(), [])
 *
 *   useEffect(() => {
 *     manager.acquire()  // 增加參照計數
 *     return () => manager.release()  // 減少參照計數
 *   }, [manager])
 * }
 * ```
 */
export class ConnectionManager {
  /** 單例實例 */
  private static instance: ConnectionManager | null = null;

  /** 參照計數（活躍訂閱者數量） */
  private refCount = 0;

  /** 延遲斷線定時器 */
  private disconnectTimer: number | null = null;

  /** 連接池 */
  private connectionPool: ConnectionPool;

  /** 訂閱管理器 */
  private subscriptionManager: SubscriptionManager;

  /** 訊息佇列 */
  private messageQueue: MessageQueue;

  /** 訊息路由器 */
  private messageRouter: MessageRouter;

  /** 配置 */
  private config: Required<ConnectionManagerConfig>;

  /** 是否已初始化 */
  private initialized = false;

  /** 事件監聽器存儲 */
  private eventListeners: Map<
    ConnectionManagerEventType,
    Set<ConnectionManagerEventListener>
  > = new Map();

  /**
   * 私有建構函數（單例模式）
   *
   * 💡 為什麼私有？
   * 防止外部直接 new ConnectionManager()
   * 必須通過 getInstance() 獲取實例
   */
  private constructor(config: ConnectionManagerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      disconnectDelay:
        config.disconnectDelay ?? REFERENCE_COUNTING.DISCONNECT_DELAY,
      enableMessageQueue: config.enableMessageQueue ?? true,
    };

    // 初始化組件
    this.connectionPool = new ConnectionPool({ debug: this.config.debug });
    this.messageQueue = new MessageQueue();
    this.messageRouter = new MessageRouter(this.messageQueue);
    this.subscriptionManager = new SubscriptionManager(this.connectionPool);

    // 設定訊息路由
    this.setupMessageRouting();

    this.log("ConnectionManager initialized");
  }

  /**
   * 獲取單例實例
   *
   * 🎯 單例模式實作
   *
   * @param config - 配置（僅第一次呼叫時有效）
   * @returns ConnectionManager 實例
   *
   * @example
   * const manager = ConnectionManager.getInstance()
   */
  static getInstance(config?: ConnectionManagerConfig): ConnectionManager {
    if (!this.instance) {
      this.instance = new ConnectionManager(config);
    }
    return this.instance;
  }

  /**
   * 重置單例（僅用於測試）
   *
   * ⚠️ 警告：生產環境不要呼叫此方法
   */
  static resetInstance(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }

  // ============================================================================
  // 參照計數管理（核心功能）
  // ============================================================================

  /**
   * 增加參照計數
   *
   * 🎯 這是解決 StrictMode 問題的核心方法
   *
   * 📚 執行流程：
   * 1. refCount++
   * 2. 如果有排程的斷線，取消它
   * 3. 如果是第一個訂閱者（refCount === 1），建立連接
   *
   * 💡 StrictMode 場景：
   * ```
   * 第一次掛載：acquire() → refCount 0→1 → 建立連接
   * StrictMode 卸載：release() → refCount 1→0 → 排程 500ms 後斷線
   * StrictMode 重掛載：acquire() → refCount 0→1 → 取消斷線 ✅
   * ```
   *
   * @example
   * useEffect(() => {
   *   manager.acquire()  // 元件掛載時呼叫
   *   return () => manager.release()
   * }, [])
   */
  acquire(): void {
    this.refCount++;

    this.log(`acquire() → refCount: ${this.refCount}`);

    // 如果有排程的斷線，取消它
    // 這是處理 StrictMode 快速重掛載的關鍵！
    if (this.disconnectTimer) {
      this.log("Cancelling scheduled disconnect (StrictMode remount detected)");
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    // 第一個訂閱者，建立連接
    if (this.refCount === 1) {
      this.log("First subscriber, establishing connection...");
      this.connect();
    }
  }

  /**
   * 減少參照計數
   *
   * 🎯 元件卸載時呼叫
   *
   * 📚 執行流程：
   * 1. refCount--
   * 2. 如果沒有訂閱者了（refCount <= 0），排程延遲斷線
   * 3. 延遲時間內如果有新的 acquire()，會取消斷線
   *
   * 💡 為什麼延遲斷線？
   * - StrictMode 會在極短時間內（幾毫秒）重新掛載
   * - 立即斷線會導致連接中斷
   * - 延遲 500ms 給予足夠的緩衝時間
   *
   * @example
   * useEffect(() => {
   *   manager.acquire()
   *   return () => manager.release()  // 元件卸載時呼叫
   * }, [])
   */
  release(): void {
    this.refCount--;

    this.log(`release() → refCount: ${this.refCount}`);

    // 最後一個訂閱者離開，排程延遲斷線
    if (this.refCount <= 0) {
      this.refCount = 0; // 防止負數

      this.log(
        `No more subscribers, scheduling disconnect in ${this.config.disconnectDelay}ms`,
      );

      this.disconnectTimer = setTimeout(() => {
        this.log("Executing scheduled disconnect");
        this.disconnect();
      }, this.config.disconnectDelay);
    }
  }

  /**
   * 獲取當前參照計數
   *
   * @returns 參照計數
   */
  getRefCount(): number {
    return this.refCount;
  }

  // ============================================================================
  // 連接管理
  // ============================================================================

  /**
   * 建立連接
   *
   * 🎯 內部方法，由 acquire() 呼叫
   *
   * 📚 執行流程：
   * 1. 獲取連接
   * 2. 設定訊息監聽
   * 3. 建立連接
   * 4. 標記為已初始化
   */
  private async connect(): Promise<void> {
    if (this.initialized) {
      this.log("Already initialized, skipping connect");
      return;
    }

    this.log("Connecting to WebSocket...");

    try {
      // 獲取連接
      const connection = this.connectionPool.getPublicConnection();

      // 設定訊息監聽
      connection.on("message", (event) => {
        this.handleMessage(event.data as string);
      });

      // 建立連接
      await connection.connect();

      this.initialized = true;
      this.log("✅ Connection established");

      // 觸發連接成功事件
      this.emit("connected");
      this.emit("stateChange", this.getConnectionState());
    } catch (error) {
      this.log("❌ Connection failed:", error);
      this.initialized = false;

      // 觸發錯誤事件
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * 斷開連接
   *
   * 🎯 內部方法，由延遲斷線定時器呼叫
   */
  private disconnect(): void {
    if (!this.initialized) {
      this.log("Not initialized, skipping disconnect");
      return;
    }

    this.log("Disconnecting from WebSocket...");

    // 關閉所有連接
    this.connectionPool.closeAll();

    // 清空訊息佇列
    this.messageQueue.clear();

    this.initialized = false;
    this.disconnectTimer = null;

    this.log("✅ Disconnected");

    // 觸發斷線事件
    this.emit("disconnected");
    this.emit("stateChange", this.getConnectionState());
  }

  // ============================================================================
  // 訊息處理
  // ============================================================================

  /**
   * 設定訊息路由
   *
   * 🎯 整合訊息佇列和訂閱管理器
   *
   * 📚 訊息流向：
   * WebSocket → MessageRouter → MessageQueue → Handler → SubscriptionManager → Callbacks
   */
  private setupMessageRouting(): void {
    // 註冊價格更新處理器
    this.messageQueue.registerHandler<PriceUpdate>("price", (message) => {
      this.subscriptionManager.notifyPriceUpdate(message.symbol, message.data);
    });

    // 註冊 K線更新處理器
    this.messageQueue.registerHandler<KLine>("kline", (message) => {
      // 從 MessageRouter 處理後的訊息中直接獲取 interval
      // MessageRouter.processKLineMessage 已經添加了 interval 欄位
      const interval = (message as unknown as { interval: TimeFrame }).interval;

      if (interval) {
        this.subscriptionManager.notifyKlineUpdate(
          message.symbol,
          interval,
          message.data,
        );
      } else {
        this.log("Warning: K-line message missing interval field", message);
      }
    });
  }

  /**
   * 處理收到的訊息
   *
   * 🎯 訊息入口點
   *
   * @param data - 原始訊息資料
   */
  private handleMessage(data: string): void {
    try {
      // 交給訊息路由器處理
      this.messageRouter.route(data);
    } catch (error) {
      this.log("Error handling message:", error);
    }
  }

  // ============================================================================
  // 訂閱管理（公開 API）
  // ============================================================================

  /**
   * 訂閱價格更新
   *
   * 🎯 公開 API：元件使用此方法訂閱價格
   *
   * @param symbol - 幣種符號
   * @param callback - 價格更新回調
   * @returns 取消訂閱函數
   *
   * @example
   * const unsubscribe = manager.subscribePrice('BTCUSDT', (update) => {
   *   console.log('Price:', update.price)
   * })
   *
   * // 取消訂閱
   * unsubscribe()
   */
  subscribePrice(
    symbol: string,
    callback: (update: PriceUpdate) => void,
  ): UnsubscribeFunction {
    return this.subscriptionManager.subscribePrice(symbol, callback);
  }

  /**
   * 訂閱 K線更新
   *
   * @param symbol - 幣種符號
   * @param interval - 時間間隔
   * @param callback - K線更新回調
   * @returns 取消訂閱函數
   *
   * @example
   * const unsubscribe = manager.subscribeKline('BTCUSDT', '1h', (kline) => {
   *   console.log('K-line:', kline)
   * })
   */
  subscribeKline(
    symbol: string,
    interval: TimeFrame,
    callback: (kline: KLine) => void,
  ): UnsubscribeFunction {
    return this.subscriptionManager.subscribeKline(symbol, interval, callback);
  }

  // ============================================================================
  // 狀態查詢
  // ============================================================================

  /**
   * 判斷是否已連接
   *
   * @returns 是否已連接
   */
  isConnected(): boolean {
    const connection = this.connectionPool.getPublicConnection();
    return connection.isConnected();
  }

  /**
   * 獲取連接狀態
   */
  getConnectionState() {
    const connection = this.connectionPool.getPublicConnection();
    return connection.getState();
  }

  /**
   * 獲取訂閱管理器狀態
   */
  getSubscriptionState() {
    return this.subscriptionManager.getState();
  }

  /**
   * 獲取訊息佇列統計
   */
  getQueueStats() {
    return this.messageQueue.getStats();
  }

  /**
   * 獲取連接池統計
   */
  getPoolStats() {
    return this.connectionPool.getStats();
  }

  /**
   * 獲取健康監控器
   */
  getHealthMonitor() {
    const connection = this.connectionPool.getPublicConnection();
    return connection.getHealthMonitor();
  }

  /**
   * 執行健康檢查
   */
  performHealthCheck() {
    return this.connectionPool.performHealthCheck();
  }

  /**
   * 獲取公開連接的詳細健康檢查結果
   *
   * 🎯 返回公開連接（用戶實際使用的連接）的健康狀態
   * 包含詳細的診斷信息：延遲、訊息率、品質評分等
   *
   * @returns 公開連接的健康檢查結果
   *
   * @example
   * const health = manager.getPublicConnectionHealth()
   * if (health.isHealthy) {
   *   console.log('Connection quality:', health.qualityScore)
   * } else {
   *   console.warn('Connection has issues:', health.status)
   * }
   */
  getPublicConnectionHealth(): HealthCheckResult {
    const connection = this.connectionPool.getPublicConnection();
    return connection.getHealthMonitor().performHealthCheck();
  }

  // ============================================================================
  // 事件系統（EventEmitter 模式）
  // ============================================================================

  /**
   * 監聽事件
   *
   * 💡 使用泛型提供類型安全的事件監聽
   *
   * @param event - 事件名稱
   * @param listener - 事件監聽器（參數類型根據事件自動推導）
   * @returns 取消監聽的函數
   *
   * @example
   * // state 自動推導為 ConnectionState 類型
   * const unsubscribe = manager.on('stateChange', (state) => {
   *   console.log('Connection state:', state.status)
   * })
   */
  on<E extends ConnectionManagerEventType>(
    event: E,
    listener: (data: ConnectionManagerEventMap[E]) => void,
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const typedListener = listener as ConnectionManagerEventListener;
    this.eventListeners.get(event)!.add(typedListener);

    // 返回取消監聽函數
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(typedListener);
      }
    };
  }

  /**
   * 移除事件監聽器
   *
   * @param event - 事件名稱
   * @param listener - 事件監聽器
   */
  off<E extends ConnectionManagerEventType>(
    event: E,
    listener: (data: ConnectionManagerEventMap[E]) => void,
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener as ConnectionManagerEventListener);
    }
  }

  /**
   * 觸發事件
   *
   * 💡 使用泛型確保事件數據類型正確
   *
   * @param event - 事件名稱
   * @param data - 事件數據（類型根據事件自動推導）
   */
  private emit<E extends ConnectionManagerEventType>(
    event: E,
    data?: ConnectionManagerEventMap[E],
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(
            `[ConnectionManager] Error in event listener for "${event}":`,
            error,
          );
        }
      });
    }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 日誌輸出
   *
   * @param message - 日誌訊息
   * @param data - 額外資料
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      const prefix = "[ConnectionManager]";
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  /**
   * 銷毀管理器
   *
   * 🎯 清理所有資源
   *
   * ⚠️ 注意：銷毀後需要重新建立實例
   */
  destroy(): void {
    this.log("Destroying ConnectionManager");

    // 清除斷線定時器
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    // 斷開連接
    if (this.initialized) {
      this.disconnect();
    }

    // 清理訂閱
    this.subscriptionManager.clearAll();

    // 清理訊息佇列
    this.messageQueue.destroy();

    // 重置參照計數
    this.refCount = 0;

    this.log("✅ Destroyed");
  }
}

/**
 * 建立連接管理器實例（便利函數）
 *
 * 💡 推薦使用 getInstance() 而非此函數
 * 此函數主要用於測試場景
 *
 * @param config - 配置
 * @returns ConnectionManager 實例
 */
export function createConnectionManager(
  config?: ConnectionManagerConfig,
): ConnectionManager {
  return ConnectionManager.getInstance(config);
}

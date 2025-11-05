/**
 * WebSocket 訂閱管理器
 *
 * 📚 學習重點：
 * 1. 訂閱-發布模式（Pub-Sub Pattern）
 * 2. 訂閱去重（Deduplication）
 * 3. 訂閱恢復（Subscription Recovery）
 * 4. Callback 管理
 *
 * 🎯 為什麼需要訂閱管理器？
 *
 * 問題場景：
 * 假設有 3 個 React 元件都訂閱 BTCUSDT 的價格：
 * - Component A: 顯示價格
 * - Component B: 計算漲跌幅
 * - Component C: 繪製圖表
 *
 * 錯誤做法：
 * ❌ 每個元件都發送一次訂閱請求
 * 結果：
 * - 發送 3 次相同的訂閱請求（浪費頻寬）
 * - 收到 3 倍的資料（浪費 CPU 和記憶體）
 * - 達到訂閱限制更快
 *
 * 正確做法：
 * ✅ 訂閱管理器統一管理
 * - 檢測到相同訂閱，只發送一次請求
 * - 收到資料後，通知所有 3 個 callback
 * - 當所有元件都卸載，才取消訂閱
 *
 * 💡 交易所級別優化：
 * - Binance 官網使用類似機制
 * - 減少伺服器負載
 * - 提升用戶體驗
 * - 節省頻寬和 CPU
 *
 * 🎯 重連後的訂閱恢復：
 * 問題：WebSocket 重連後，所有訂閱會丟失
 * 解決：SubscriptionManager 記錄所有訂閱，重連後自動恢復
 */

import { SUBSCRIPTION_LIMITS } from "../constants";
import type {
  SubscriptionItem,
  SubscriptionCallback,
  SubscriptionManagerState,
  UnsubscribeFunction,
  TimeFrame,
  SubscriptionRequest,
  SubscriptionStats,
} from "../types";
import { SubscriptionError, WebSocketErrorCode } from "../errors";
import { ConnectionPool } from "../core/ConnectionPool";

/**
 * 訂閱管理器
 *
 * 🎯 核心功能：
 * 1. 訂閱去重：同一個 symbol 只訂閱一次
 * 2. Callback 管理：一個訂閱可以有多個 callback
 * 3. 自動取消：當沒有 callback 時自動取消訂閱
 * 4. 訂閱恢復：重連後自動恢復所有訂閱
 * 5. 訂閱限制：檢查訂閱數量是否超過限制
 *
 * 💡 設計模式：
 * - Mediator Pattern：居中協調訂閱與連接
 * - Observer Pattern：管理多個觀察者（callbacks）
 * - Registry Pattern：註冊和追蹤訂閱
 */
export class SubscriptionManager {
  /** 價格訂閱（symbol → SubscriptionItem） */
  private priceSubscriptions = new Map<string, SubscriptionItem<unknown>>();

  /** K線訂閱（symbol_interval → SubscriptionItem） */
  private klineSubscriptions = new Map<string, SubscriptionItem<unknown>>();

  /** 活躍的 stream names（用於檢查重複和恢復訂閱） */
  private activeStreams = new Set<string>();

  /** 連接池 */
  private connectionPool: ConnectionPool;

  /** 訂閱限制 */
  private readonly subscriptionLimit = SUBSCRIPTION_LIMITS.MAX_PER_CONNECTION;

  /** 訂閱請求計數器（用於生成唯一 ID） */
  private requestIdCounter = 0;

  /** 待處理的訂閱請求（用於追蹤請求狀態） */
  private pendingRequests = new Map<string, SubscriptionRequest>();

  constructor(connectionPool: ConnectionPool) {
    this.connectionPool = connectionPool;

    // 監聽連接建立事件，自動恢復訂閱
    this.setupConnectionListener();

    console.log("[SubscriptionManager] Initialized");
  }

  // ============================================================================
  // 訂閱監聽設定
  // ============================================================================

  /**
   * 設定連接監聽器
   *
   * 🎯 監聽連接建立事件，自動恢復訂閱
   *
   * 📚 學習重點：
   * WebSocket 重連後，之前的訂閱會丟失
   * 需要重新發送所有訂閱請求
   */
  private setupConnectionListener(): void {
    const connection = this.connectionPool.getPublicConnection();

    // 監聽連接建立事件
    connection.on("open", () => {
      console.log(
        "[SubscriptionManager] Connection opened, restoring subscriptions...",
      );
      this.restoreAllSubscriptions();
    });
  }

  // ============================================================================
  // 價格訂閱
  // ============================================================================

  /**
   * 訂閱價格更新
   *
   * 🎯 核心訂閱方法（價格）
   *
   * 📚 訂閱流程：
   * 1. 檢查訂閱限制
   * 2. 檢查是否已訂閱（去重）
   * 3. 如果是新訂閱，發送訂閱請求
   * 4. 註冊 callback
   * 5. 返回取消訂閱函數
   *
   * 💡 設計亮點：
   * - 多個元件訂閱同一個 symbol，只發送一次請求
   * - 每個元件都有獨立的 callback
   * - 當所有元件都卸載，自動取消訂閱
   *
   * @param symbol - 幣種符號（例如：BTCUSDT）
   * @param callback - 價格更新回調函數
   * @returns 取消訂閱函數
   * @throws {SubscriptionError} 訂閱失敗
   *
   * @example
   * // 元件 A 訂閱
   * const unsubA = manager.subscribePrice('BTCUSDT', (update) => {
   *   console.log('Component A:', update.price)
   * })
   *
   * // 元件 B 訂閱（不會發送新的訂閱請求）
   * const unsubB = manager.subscribePrice('BTCUSDT', (update) => {
   *   console.log('Component B:', update.price)
   * })
   *
   * // 元件 A 卸載
   * unsubA() // 不會取消訂閱（因為 B 還在使用）
   *
   * // 元件 B 卸載
   * unsubB() // 取消訂閱（沒有人使用了）
   */
  subscribePrice<T>(
    symbol: string,
    callback: SubscriptionCallback<T>,
  ): UnsubscribeFunction {
    // 1. 檢查訂閱限制
    this.checkSubscriptionLimit();

    // 2. 建立 stream name
    const streamName = this.createPriceStreamName(symbol);

    // 3. 獲取或建立訂閱項目
    let subscription = this.priceSubscriptions.get(symbol) as
      | SubscriptionItem<T>
      | undefined;

    if (!subscription) {
      // 新訂閱，建立訂閱項目
      console.log(
        `[SubscriptionManager] Creating new price subscription: ${symbol}`,
      );

      subscription = {
        symbol,
        type: "ticker",
        streamName,
        callbacks: new Set(),
        status: "pending",
        subscribedAt: Date.now(),
        dataCount: 0,
      };

      this.priceSubscriptions.set(symbol, subscription);

      // 發送訂閱請求
      this.sendSubscribeRequest([streamName]);

      // 標記為活躍
      this.activeStreams.add(streamName);
    } else {
      console.log(
        `[SubscriptionManager] Reusing existing price subscription: ${symbol}`,
      );
    }

    // 4. 註冊 callback
    subscription.callbacks.add(callback as SubscriptionCallback<unknown>);

    // 5. 返回取消訂閱函數
    return () => {
      this.unsubscribePrice(symbol, callback);
    };
  }

  /**
   * 取消價格訂閱
   *
   * 🎯 移除 callback，當沒有 callback 時取消訂閱
   *
   * @param symbol - 幣種符號
   * @param callback - 要移除的 callback
   */
  private unsubscribePrice<T>(
    symbol: string,
    callback: SubscriptionCallback<T>,
  ): void {
    const subscription = this.priceSubscriptions.get(symbol);

    if (!subscription) {
      console.warn(`[SubscriptionManager] Subscription not found: ${symbol}`);
      return;
    }

    // 移除 callback
    subscription.callbacks.delete(callback as SubscriptionCallback<unknown>);

    console.log(
      `[SubscriptionManager] Removed callback for ${symbol}, remaining: ${subscription.callbacks.size}`,
    );

    // 如果沒有 callback 了，取消訂閱
    if (subscription.callbacks.size === 0) {
      console.log(
        `[SubscriptionManager] No more callbacks, unsubscribing: ${symbol}`,
      );

      // 發送取消訂閱請求
      this.sendUnsubscribeRequest([subscription.streamName]);

      // 移除訂閱項目
      this.priceSubscriptions.delete(symbol);
      this.activeStreams.delete(subscription.streamName);
    }
  }

  // ============================================================================
  // K線訂閱
  // ============================================================================

  /**
   * 訂閱 K線更新
   *
   * 🎯 K線訂閱方法
   *
   * 💡 與價格訂閱的區別：
   * - 需要指定時間間隔（interval）
   * - stream name 格式不同：{symbol}@kline_{interval}
   * - 同一個 symbol 可以訂閱多個時間間隔
   *
   * @param symbol - 幣種符號
   * @param interval - 時間間隔
   * @param callback - K線更新回調函數
   * @returns 取消訂閱函數
   *
   * @example
   * // 訂閱 BTC 的 1 小時 K線
   * const unsub1h = manager.subscribeKline('BTCUSDT', '1h', (kline) => {
   *   console.log('1h K-line:', kline)
   * })
   *
   * // 訂閱 BTC 的 1 天 K線（不會衝突）
   * const unsub1d = manager.subscribeKline('BTCUSDT', '1d', (kline) => {
   *   console.log('1d K-line:', kline)
   * })
   */
  subscribeKline<T>(
    symbol: string,
    interval: TimeFrame,
    callback: SubscriptionCallback<T>,
  ): UnsubscribeFunction {
    // 檢查訂閱限制
    this.checkSubscriptionLimit();

    // 建立訂閱鍵值（symbol + interval）
    const key = this.createKlineKey(symbol, interval);

    // 建立 stream name
    const streamName = this.createKlineStreamName(symbol, interval);

    // 獲取或建立訂閱項目
    let subscription = this.klineSubscriptions.get(key) as
      | SubscriptionItem<T>
      | undefined;

    if (!subscription) {
      console.log(
        `[SubscriptionManager] Creating new kline subscription: ${key}`,
      );

      subscription = {
        symbol,
        type: "kline",
        interval,
        streamName,
        callbacks: new Set(),
        status: "pending",
        subscribedAt: Date.now(),
        dataCount: 0,
      };

      this.klineSubscriptions.set(key, subscription);

      // 發送訂閱請求
      this.sendSubscribeRequest([streamName]);

      // 標記為活躍
      this.activeStreams.add(streamName);
    } else {
      console.log(
        `[SubscriptionManager] Reusing existing kline subscription: ${key}`,
      );
    }

    // 註冊 callback
    subscription.callbacks.add(callback as SubscriptionCallback<unknown>);

    // 返回取消訂閱函數
    return () => {
      this.unsubscribeKline(symbol, interval, callback);
    };
  }

  /**
   * 取消 K線訂閱
   *
   * @param symbol - 幣種符號
   * @param interval - 時間間隔
   * @param callback - 要移除的 callback
   */
  private unsubscribeKline<T>(
    symbol: string,
    interval: TimeFrame,
    callback: SubscriptionCallback<T>,
  ): void {
    const key = this.createKlineKey(symbol, interval);
    const subscription = this.klineSubscriptions.get(key);

    if (!subscription) {
      console.warn(`[SubscriptionManager] Subscription not found: ${key}`);
      return;
    }

    // 移除 callback
    subscription.callbacks.delete(callback as SubscriptionCallback<unknown>);

    console.log(
      `[SubscriptionManager] Removed callback for ${key}, remaining: ${subscription.callbacks.size}`,
    );

    // 如果沒有 callback 了，取消訂閱
    if (subscription.callbacks.size === 0) {
      console.log(
        `[SubscriptionManager] No more callbacks, unsubscribing: ${key}`,
      );

      // 發送取消訂閱請求
      this.sendUnsubscribeRequest([subscription.streamName]);

      // 移除訂閱項目
      this.klineSubscriptions.delete(key);
      this.activeStreams.delete(subscription.streamName);
    }
  }

  // ============================================================================
  // 訂閱請求發送
  // ============================================================================

  /**
   * 發送訂閱請求
   *
   * 🎯 向 Binance WebSocket 發送 SUBSCRIBE 請求
   *
   * 📚 Binance 訂閱格式：
   * {
   *   "method": "SUBSCRIBE",
   *   "params": ["btcusdt@24hrMiniTicker", "ethusdt@kline_1h"],
   *   "id": 1
   * }
   *
   * @param streamNames - 要訂閱的 stream names
   */
  private sendSubscribeRequest(streamNames: string[]): void {
    try {
      const connection = this.connectionPool.getPublicConnection();

      // 檢查連接狀態
      if (!connection.isConnected()) {
        console.warn(
          "[SubscriptionManager] Connection not ready, subscription will be restored on connect",
        );
        return;
      }

      // 建立訂閱請求
      const requestId = this.generateRequestId();
      const request: SubscriptionRequest = {
        id: requestId,
        method: "SUBSCRIBE",
        params: streamNames,
        timestamp: Date.now(),
      };

      // 記錄待處理請求
      this.pendingRequests.set(requestId, request);

      // 發送請求
      connection.send(JSON.stringify(request));

      console.log(`[SubscriptionManager] Sent SUBSCRIBE request:`, {
        id: requestId,
        streams: streamNames,
      });

      // 標記訂閱為活躍（樂觀更新）
      streamNames.forEach((streamName) => {
        this.updateSubscriptionStatus(streamName, "active");
      });
    } catch (error) {
      console.error(
        "[SubscriptionManager] Failed to send subscribe request:",
        error,
      );

      throw new SubscriptionError(
        "Failed to send subscribe request",
        WebSocketErrorCode.SUBSCRIPTION_FAILED,
        {
          streamName: streamNames.join(", "),
          cause: error as Error,
        },
      );
    }
  }

  /**
   * 發送取消訂閱請求
   *
   * @param streamNames - 要取消的 stream names
   */
  private sendUnsubscribeRequest(streamNames: string[]): void {
    try {
      const connection = this.connectionPool.getPublicConnection();

      if (!connection.isConnected()) {
        console.warn(
          "[SubscriptionManager] Connection not ready, skipping unsubscribe",
        );
        return;
      }

      const requestId = this.generateRequestId();
      const request: SubscriptionRequest = {
        id: requestId,
        method: "UNSUBSCRIBE",
        params: streamNames,
        timestamp: Date.now(),
      };

      connection.send(JSON.stringify(request));

      console.log(`[SubscriptionManager] Sent UNSUBSCRIBE request:`, {
        id: requestId,
        streams: streamNames,
      });
    } catch (error) {
      console.error(
        "[SubscriptionManager] Failed to send unsubscribe request:",
        error,
      );
    }
  }

  // ============================================================================
  // 訂閱恢復
  // ============================================================================

  /**
   * 恢復所有訂閱
   *
   * 🎯 重連後自動恢復所有訂閱
   *
   * 📚 為什麼需要恢復訂閱？
   * WebSocket 重連後，伺服器端的訂閱狀態會清空
   * 需要重新發送所有訂閱請求
   *
   * 💡 實作重點：
   * - 批次發送（一次請求訂閱所有 streams）
   * - 避免重複訂閱
   * - 錯誤處理
   */
  private restoreAllSubscriptions(): void {
    if (this.activeStreams.size === 0) {
      console.log("[SubscriptionManager] No subscriptions to restore");
      return;
    }

    console.log(
      `[SubscriptionManager] Restoring ${this.activeStreams.size} subscriptions...`,
    );

    // 收集所有活躍的 stream names
    const streamNames = Array.from(this.activeStreams);

    // 批次發送訂閱請求（一次最多 100 個）
    const batchSize = 100;
    for (let i = 0; i < streamNames.length; i += batchSize) {
      const batch = streamNames.slice(i, i + batchSize);
      this.sendSubscribeRequest(batch);
    }

    console.log("[SubscriptionManager] Subscriptions restored");
  }

  // ============================================================================
  // 訂閱通知（用於 MessageRouter）
  // ============================================================================

  /**
   * 通知價格更新
   *
   * 🎯 由 MessageRouter 呼叫，將資料分發給所有 callbacks
   *
   * @param symbol - 幣種符號
   * @param data - 價格資料
   */
  notifyPriceUpdate<T>(symbol: string, data: T): void {
    const subscription = this.priceSubscriptions.get(symbol);

    if (!subscription) {
      return;
    }

    // 更新統計
    subscription.dataCount++;
    subscription.lastDataAt = Date.now();

    // 通知所有 callbacks
    subscription.callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `[SubscriptionManager] Error in price callback for ${symbol}:`,
          error,
        );
      }
    });
  }

  /**
   * 通知 K線更新
   *
   * @param symbol - 幣種符號
   * @param interval - 時間間隔
   * @param data - K線資料
   */
  notifyKlineUpdate<T>(symbol: string, interval: TimeFrame, data: T): void {
    const key = this.createKlineKey(symbol, interval);
    const subscription = this.klineSubscriptions.get(key);

    if (!subscription) {
      return;
    }

    // 更新統計
    subscription.dataCount++;
    subscription.lastDataAt = Date.now();

    // 通知所有 callbacks
    subscription.callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `[SubscriptionManager] Error in kline callback for ${key}:`,
          error,
        );
      }
    });
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 建立價格 stream name
   *
   * 📚 Binance 格式：{symbol}@24hrMiniTicker
   * 範例：BTCUSDT@24hrMiniTicker
   */
  private createPriceStreamName(symbol: string): string {
    return `${symbol.toLowerCase()}@24hrMiniTicker`;
  }

  /**
   * 建立 K線 stream name
   *
   * 📚 Binance 格式：{symbol}@kline_{interval}
   * 範例：BTCUSDT@kline_1h
   *
   * ⚠️ 注意：是 "kline" 不是 "klines"（單數）
   */
  private createKlineStreamName(symbol: string, interval: TimeFrame): string {
    return `${symbol.toLowerCase()}@kline_${interval}`;
  }

  /**
   * 建立 K線訂閱鍵值
   *
   * @param symbol - 幣種符號
   * @param interval - 時間間隔
   * @returns 訂閱鍵值
   */
  private createKlineKey(symbol: string, interval: TimeFrame): string {
    return `${symbol}_${interval}`;
  }

  /**
   * 生成請求 ID
   *
   * @returns 唯一請求 ID
   */
  private generateRequestId(): string {
    return `req_${++this.requestIdCounter}_${Date.now()}`;
  }

  /**
   * 更新訂閱狀態
   *
   * @param streamName - Stream name
   * @param status - 新狀態
   */
  private updateSubscriptionStatus(
    streamName: string,
    status: "pending" | "active" | "failed",
  ): void {
    // 更新價格訂閱狀態
    this.priceSubscriptions.forEach((sub) => {
      if (sub.streamName === streamName) {
        sub.status = status;
      }
    });

    // 更新 K線訂閱狀態
    this.klineSubscriptions.forEach((sub) => {
      if (sub.streamName === streamName) {
        sub.status = status;
      }
    });
  }

  /**
   * 檢查訂閱限制
   *
   * @throws {SubscriptionError} 超過訂閱限制
   */
  private checkSubscriptionLimit(): void {
    const totalSubscriptions =
      this.priceSubscriptions.size + this.klineSubscriptions.size;

    if (totalSubscriptions >= this.subscriptionLimit) {
      throw new SubscriptionError(
        `Subscription limit reached (${totalSubscriptions}/${this.subscriptionLimit})`,
        WebSocketErrorCode.SUBSCRIPTION_LIMIT_REACHED,
        { retryable: false },
      );
    }
  }

  // ============================================================================
  // 公開 API
  // ============================================================================

  /**
   * 獲取管理器狀態
   *
   * @returns 管理器狀態
   */
  getState(): SubscriptionManagerState {
    const totalCallbacks =
      Array.from(this.priceSubscriptions.values()).reduce(
        (sum, sub) => sum + sub.callbacks.size,
        0,
      ) +
      Array.from(this.klineSubscriptions.values()).reduce(
        (sum, sub) => sum + sub.callbacks.size,
        0,
      );

    const activeCount = this.activeStreams.size;
    const pendingCount =
      Array.from(this.priceSubscriptions.values()).filter(
        (s) => s.status === "pending",
      ).length +
      Array.from(this.klineSubscriptions.values()).filter(
        (s) => s.status === "pending",
      ).length;
    const failedCount =
      Array.from(this.priceSubscriptions.values()).filter(
        (s) => s.status === "failed",
      ).length +
      Array.from(this.klineSubscriptions.values()).filter(
        (s) => s.status === "failed",
      ).length;

    return {
      activeSubscriptions: activeCount,
      pendingSubscriptions: pendingCount,
      failedSubscriptions: failedCount,
      totalCallbacks,
      subscriptionLimit: this.subscriptionLimit,
      isLimitReached: activeCount >= this.subscriptionLimit,
    };
  }

  /**
   * 獲取所有訂閱統計
   *
   * @returns 訂閱統計陣列
   */
  getAllStats(): SubscriptionStats[] {
    const stats: SubscriptionStats[] = [];

    // 價格訂閱統計
    this.priceSubscriptions.forEach((sub) => {
      stats.push(this.createSubscriptionStats(sub));
    });

    // K線訂閱統計
    this.klineSubscriptions.forEach((sub) => {
      stats.push(this.createSubscriptionStats(sub));
    });

    return stats;
  }

  /**
   * 建立訂閱統計
   */
  private createSubscriptionStats(
    sub: SubscriptionItem<unknown>,
  ): SubscriptionStats {
    const now = Date.now();
    const uptime = now - sub.subscribedAt;
    const lastMessageAt = sub.lastDataAt || sub.subscribedAt;

    return {
      streamName: sub.streamName,
      subscribedAt: sub.subscribedAt,
      uptime,
      messagesReceived: sub.dataCount,
      messageRate: uptime > 0 ? (sub.dataCount / uptime) * 1000 : 0,
      averageInterval: sub.dataCount > 1 ? uptime / sub.dataCount : 0,
      lastMessageAt,
      activeCallbacks: sub.callbacks.size,
      errorCount: 0,
    };
  }

  /**
   * 清除所有訂閱
   *
   * ⚠️ 慎用：會取消所有訂閱
   */
  clearAll(): void {
    console.log("[SubscriptionManager] Clearing all subscriptions");

    // 取消所有訂閱
    const streamNames = Array.from(this.activeStreams);
    if (streamNames.length > 0) {
      this.sendUnsubscribeRequest(streamNames);
    }

    // 清空所有資料結構
    this.priceSubscriptions.clear();
    this.klineSubscriptions.clear();
    this.activeStreams.clear();
    this.pendingRequests.clear();
  }
}

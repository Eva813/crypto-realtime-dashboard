/**
 * WebSocket 訊息佇列
 *
 * 📚 學習重點：
 * 1. 訊息佇列（Message Queue）設計模式
 * 2. 批次處理（Batch Processing）技術
 * 3. requestAnimationFrame 的應用
 * 4. 效能優化策略
 *
 * 🎯 為什麼需要訊息佇列？
 *
 * 問題場景：
 * Binance 在市場波動時，可能每秒推送 100+ 筆價格更新
 * - BTC/USDT: 每秒 10+ 筆
 * - ETH/USDT: 每秒 8+ 筆
 * - 10 個幣種 = 每秒 100+ 筆
 *
 * 錯誤做法：
 * ❌ 每收到一筆訊息就立即更新 React 狀態
 * 結果：
 * - 每秒觸發 100+ 次重渲染
 * - UI 卡頓、掉幀
 * - CPU 使用率飆高
 * - 電池快速消耗
 *
 * 正確做法：
 * ✅ 使用訊息佇列 + 批次處理
 * 流程：
 * 1. 訊息加入佇列（不立即處理）
 * 2. 在 requestAnimationFrame 回調中批次處理
 * 3. 合併同一個 symbol 的多筆更新（只保留最新）
 * 4. 一次性更新 React 狀態
 *
 * 結果：
 * - 每秒只觸發 60 次重渲染（與螢幕刷新率同步）
 * - UI 流暢、不卡頓
 * - CPU 使用率正常
 *
 * 💡 交易所級別優化：
 * - Binance Web 版本使用類似策略
 * - OKX 使用 Web Workers + 批次更新
 * - Coinbase Pro 使用節流（Throttle）+ 批次處理
 */

import { MESSAGE_QUEUE_CONFIG } from "../constants";
import type {
  MessageQueueItem,
  MessageQueueConfig,
  ProcessedMessage,
  MessagePriority,
  MessageStats,
  MessageBatch,
  MessageProcessResult,
} from "../types";

/**
 * 訊息佇列類別
 *
 * 🎯 核心功能：
 * 1. 訊息入列：將收到的訊息加入佇列
 * 2. 批次處理：使用 requestAnimationFrame 批次處理訊息
 * 3. 訊息合併：同一個 symbol 只保留最新資料
 * 4. 優先級處理：高優先級訊息優先處理
 * 5. 過期處理：丟棄過期訊息
 *
 * 💡 設計模式：Producer-Consumer Pattern
 * - Producer: WebSocket onmessage（生產訊息）
 * - Queue: MessageQueue（緩衝區）
 * - Consumer: requestAnimationFrame callback（消費訊息）
 */
export class MessageQueue {
  /** 訊息佇列 */
  private queue: MessageQueueItem[] = [];

  /** 是否正在處理 */
  private isProcessing = false;

  /** requestAnimationFrame ID */
  private rafId: number | null = null;

  /** 訊息處理器 */
  private handlers = new Map<string, (message: ProcessedMessage) => void>();

  /** 訊息統計 */
  private stats: MessageStats = {
    totalReceived: 0,
    totalProcessed: 0,
    totalDropped: 0,
    totalErrors: 0,
    averageProcessingTime: 0,
    maxProcessingTime: 0,
    currentQueueSize: 0,
    receiveRate: 0,
    processRate: 0,
    lastUpdated: Date.now(),
  };

  /** 處理時間樣本（用於計算平均值） */
  private processingTimeSamples: number[] = [];

  /** 配置 */
  private config: MessageQueueConfig;

  /** 訊息 ID 計數器 */
  private messageIdCounter = 0;

  constructor(config?: Partial<MessageQueueConfig>) {
    // 正確映射常量到配置屬性（駝峰命名）
    this.config = {
      batchSize: config?.batchSize ?? MESSAGE_QUEUE_CONFIG.BATCH_SIZE,
      processInterval:
        config?.processInterval ?? MESSAGE_QUEUE_CONFIG.PROCESS_INTERVAL,
      maxQueueSize: config?.maxQueueSize ?? MESSAGE_QUEUE_CONFIG.MAX_QUEUE_SIZE,
      enableMerge: config?.enableMerge ?? MESSAGE_QUEUE_CONFIG.ENABLE_MERGE,
      enablePriority:
        config?.enablePriority ?? MESSAGE_QUEUE_CONFIG.ENABLE_PRIORITY,
      messageExpiry:
        config?.messageExpiry ?? MESSAGE_QUEUE_CONFIG.MESSAGE_EXPIRY,
    };

    // console.log('[MessageQueue] Initialized with config:', this.config)
  }

  // ============================================================================
  // 訊息入列
  // ============================================================================

  /**
   * 加入訊息到佇列
   *
   * 🎯 入列邏輯：
   * 1. 檢查佇列是否已滿
   * 2. 檢查訊息是否過期
   * 3. 建立佇列項目
   * 4. 加入佇列
   * 5. 排程處理
   *
   * @param message - 處理後的訊息
   * @param priority - 優先級（預設 NORMAL）
   *
   * @example
   * const message: ProcessedMessage<PriceUpdate> = {
   *   type: 'price',
   *   symbol: 'BTCUSDT',
   *   data: { price: 50000, ... },
   *   timestamp: Date.now(),
   *   ...
   * }
   * queue.enqueue(message)
   */
  enqueue<T>(
    message: ProcessedMessage<T>,
    priority: MessagePriority = "NORMAL",
  ): void {
    // 統計
    this.stats.totalReceived++;

    // 檢查佇列是否已滿
    if (this.queue.length >= this.config.maxQueueSize) {
      console.warn(
        `[MessageQueue] ⚠️ Queue full (${this.queue.length}/${this.config.maxQueueSize}), dropping oldest message`,
      );
      this.stats.totalDropped++;

      // 移除最舊的訊息（FIFO）
      this.queue.shift();
    }

    // 檢查訊息是否過期
    const age = Date.now() - message.timestamp;
    if (age > this.config.messageExpiry) {
      console.warn(
        `[MessageQueue] ⚠️ Message expired (age: ${age}ms), dropping`,
      );
      this.stats.totalDropped++;
      return;
    }

    // 建立佇列項目
    const item: MessageQueueItem<T> = {
      id: this.generateMessageId(),
      message,
      priority,
      enqueuedAt: Date.now(),
      retries: 0,
    };

    // 加入佇列
    if (this.config.enablePriority && priority === "HIGH") {
      // 高優先級訊息插入到佇列前面
      this.queue.unshift(item);
    } else {
      // 一般訊息加到佇列尾部
      this.queue.push(item);
    }

    // 更新統計
    this.stats.currentQueueSize = this.queue.length;

    // 排程處理
    this.scheduleProcessing();
  }

  /**
   * 產生訊息 ID
   *
   * 💡 簡單的遞增 ID
   * 生產環境可考慮使用 UUID
   */
  private generateMessageId(): string {
    return `msg_${++this.messageIdCounter}`;
  }

  // ============================================================================
  // 批次處理
  // ============================================================================

  /**
   * 排程訊息處理
   *
   * 📚 requestAnimationFrame 工作原理：
   * - 瀏覽器每幀（約 16ms）執行一次
   * - 在重繪之前執行回調
   * - 自動與螢幕刷新率同步（通常 60 FPS）
   * - 標籤頁不可見時自動暫停（節省資源）
   *
   * 🎯 為什麼使用 rAF 而非 setTimeout？
   *
   * setTimeout 問題：
   * - 不與螢幕刷新率同步，可能錯過幀
   * - 標籤頁不可見時仍然執行（浪費 CPU）
   * - 可能累積延遲
   *
   * rAF 優勢：
   * - 與螢幕刷新率完美同步（60 FPS = 16.67ms）
   * - 標籤頁不可見時自動暫停
   * - 避免不必要的重繪
   * - 更好的電池續航
   *
   * 💡 交易所場景：
   * - 價格更新頻率 > 60 Hz 是沒有意義的（螢幕刷新率限制）
   * - 使用 rAF 可以完美匹配視覺更新需求
   */
  private scheduleProcessing(): void {
    // 如果已經在處理或已排程，直接返回
    if (this.isProcessing || this.rafId !== null) {
      return;
    }

    // 佇列為空，不需要處理
    if (this.queue.length === 0) {
      return;
    }

    // 達到批次大小，立即處理
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
      return;
    }

    // 排程在下一個動畫幀處理
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  /**
   * 處理訊息（批次）
   *
   * 🎯 批次處理流程：
   * 1. 從佇列取出一批訊息
   * 2. 如果啟用合併，合併同類訊息
   * 3. 逐一處理訊息
   * 4. 更新統計資訊
   * 5. 如果還有訊息，繼續排程
   *
   * 📚 學習重點：
   * - 批次處理減少函數呼叫開銷
   * - 訊息合併減少不必要的更新
   * - 統計追蹤便於效能優化
   */
  private flush(): void {
    if (this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    // 取出一批訊息
    const batchSize = Math.min(this.config.batchSize, this.queue.length);
    const batch = this.queue.splice(0, batchSize);

    // console.log(`[MessageQueue] Processing batch of ${batch.length} messages`)

    // 訊息合併（如果啟用）
    const messagesToProcess = this.config.enableMerge
      ? this.mergeBatch(batch)
      : batch;

    // 建立批次物件
    const batchObj: MessageBatch = {
      id: `batch_${Date.now()}`,
      messages: messagesToProcess.map((item) => item.message),
      size: messagesToProcess.length,
      createdAt: startTime,
    };

    // 處理每一筆訊息
    const results: MessageProcessResult[] = [];
    for (const item of messagesToProcess) {
      const result = this.processMessage(item);
      results.push(result);
    }

    // 更新批次處理時間
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    batchObj.processedAt = endTime;
    batchObj.processingTime = processingTime;

    // 更新統計
    this.updateStats(results, processingTime);

    // 更新佇列大小
    this.stats.currentQueueSize = this.queue.length;

    this.isProcessing = false;

    // 如果還有訊息，繼續排程
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }

    // console.log(
    //   `[MessageQueue] Batch processed in ${processingTime.toFixed(2)}ms, ${this.queue.length} messages remaining`
    // )
  }

  /**
   * 合併批次訊息
   *
   * 🎯 合併策略：
   * 對於同一個 symbol 的多筆價格更新，只保留最新的一筆
   *
   * 📚 範例：
   * 輸入批次（50 筆）：
   * - BTCUSDT: 10 筆更新
   * - ETHUSDT: 15 筆更新
   * - BNBUSDT: 25 筆更新
   *
   * 合併後（3 筆）：
   * - BTCUSDT: 1 筆（最新）
   * - ETHUSDT: 1 筆（最新）
   * - BNBUSDT: 1 筆（最新）
   *
   * 💡 效能提升：
   * - 減少 React 狀態更新次數：50 → 3
   * - 減少重渲染次數：50 → 3
   * - 提升約 94% 的效能！
   *
   * @param batch - 原始批次
   * @returns 合併後的批次
   */
  private mergeBatch<T>(batch: MessageQueueItem<T>[]): MessageQueueItem<T>[] {
    // 使用 Map 儲存每個 symbol 的最新訊息
    // key: `${type}_${symbol}`, value: 最新的訊息項目
    const mergedMap = new Map<string, MessageQueueItem<T>>();

    for (const item of batch) {
      const key = `${item.message.type}_${item.message.symbol}`;

      // 如果已有該 symbol 的訊息，比較時間戳
      const existing = mergedMap.get(key);
      if (existing) {
        // 保留較新的訊息
        if (item.message.timestamp > existing.message.timestamp) {
          mergedMap.set(key, item);
        }
      } else {
        mergedMap.set(key, item);
      }
    }

    const merged = Array.from(mergedMap.values());

    if (merged.length < batch.length) {
      console.log(
        `[MessageQueue] Merged ${batch.length} messages into ${merged.length} (saved ${batch.length - merged.length} updates)`,
      );
    }

    return merged;
  }

  /**
   * 處理單一訊息
   *
   * 🎯 處理流程：
   * 1. 根據訊息類型找到對應的處理器
   * 2. 執行處理器
   * 3. 記錄處理結果
   * 4. 錯誤處理與重試
   *
   * @param item - 佇列項目
   * @returns 處理結果
   */
  private processMessage<T>(item: MessageQueueItem<T>): MessageProcessResult {
    const startTime = performance.now();
    const result: MessageProcessResult = {
      messageId: item.id,
      success: false,
      processingTime: 0,
      processedAt: Date.now(),
      retries: item.retries,
    };

    try {
      // 根據訊息類型找到處理器
      const handler = this.handlers.get(item.message.type);

      if (!handler) {
        throw new Error(
          `No handler registered for message type: ${item.message.type}`,
        );
      }

      // 執行處理器
      handler(item.message);

      // 處理成功
      result.success = true;
      this.stats.totalProcessed++;
    } catch (error) {
      // 處理失敗
      console.error(
        `[MessageQueue] Error processing message ${item.id}:`,
        error,
      );

      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      this.stats.totalErrors++;

      // TODO: 可以加入重試邏輯
    }

    result.processingTime = performance.now() - startTime;
    return result;
  }

  // ============================================================================
  // 處理器管理
  // ============================================================================

  /**
   * 註冊訊息處理器
   *
   * 🎯 設計模式：Strategy Pattern
   * 不同的訊息類型使用不同的處理策略
   *
   * @param type - 訊息類型
   * @param handler - 處理函數
   *
   * @example
   * queue.registerHandler('price', (message) => {
   *   const priceData = message.data as PriceUpdate
   *   useMarketStore.getState().updatePrice(message.symbol, priceData)
   * })
   *
   * queue.registerHandler('kline', (message) => {
   *   const klineData = message.data as KLine
   *   useMarketStore.getState().updateKline(message.symbol, klineData)
   * })
   */
  registerHandler<T>(
    type: string,
    handler: (message: ProcessedMessage<T>) => void,
  ): void {
    console.log(`[MessageQueue] Registering handler for type: ${type}`);
    this.handlers.set(type, handler as (message: ProcessedMessage) => void);
  }

  /**
   * 取消註冊處理器
   *
   * @param type - 訊息類型
   */
  unregisterHandler(type: string): void {
    console.log(`[MessageQueue] Unregistering handler for type: ${type}`);
    this.handlers.delete(type);
  }

  // ============================================================================
  // 統計與監控
  // ============================================================================

  /**
   * 更新統計資訊
   *
   * @param results - 處理結果陣列
   * @param batchProcessingTime - 批次處理時間
   */
  private updateStats(
    results: MessageProcessResult[],
    batchProcessingTime: number,
  ): void {
    // 記錄處理時間樣本
    this.processingTimeSamples.push(batchProcessingTime);

    // 保留最近 100 個樣本
    if (this.processingTimeSamples.length > 100) {
      this.processingTimeSamples.shift();
    }

    // 計算平均處理時間
    const avgTime =
      this.processingTimeSamples.reduce((sum, t) => sum + t, 0) /
      this.processingTimeSamples.length;

    // 更新最大處理時間
    if (batchProcessingTime > this.stats.maxProcessingTime) {
      this.stats.maxProcessingTime = batchProcessingTime;
    }

    // 更新統計
    this.stats.averageProcessingTime = avgTime;
    this.stats.lastUpdated = Date.now();

    // 計算處理速率（簡化版本）
    this.stats.processRate = results.length / (batchProcessingTime / 1000);
  }

  /**
   * 獲取統計資訊
   *
   * @returns 訊息統計
   */
  getStats(): MessageStats {
    return { ...this.stats };
  }

  /**
   * 重置統計
   */
  resetStats(): void {
    console.log("[MessageQueue] Resetting stats");

    this.stats = {
      totalReceived: 0,
      totalProcessed: 0,
      totalDropped: 0,
      totalErrors: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      currentQueueSize: this.queue.length,
      receiveRate: 0,
      processRate: 0,
      lastUpdated: Date.now(),
    };

    this.processingTimeSamples = [];
  }

  // ============================================================================
  // 佇列管理
  // ============================================================================

  /**
   * 清空佇列
   *
   * ⚠️ 注意：會丟棄所有未處理的訊息
   */
  clear(): void {
    console.log(
      `[MessageQueue] Clearing queue (${this.queue.length} messages dropped)`,
    );

    this.stats.totalDropped += this.queue.length;
    this.queue = [];
    this.stats.currentQueueSize = 0;

    // 取消待處理的 rAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 獲取佇列大小
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 判斷佇列是否為空
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 判斷佇列是否已滿
   */
  isFull(): boolean {
    return this.queue.length >= this.config.maxQueueSize;
  }

  /**
   * 強制立即處理所有訊息
   *
   * ⚠️ 僅用於測試或特殊情況
   * 正常情況下應該讓 rAF 自動排程
   */
  flushAll(): void {
    console.log("[MessageQueue] Force flushing all messages");

    while (this.queue.length > 0) {
      this.flush();
    }
  }

  /**
   * 銷毀佇列
   *
   * 🎯 清理資源，避免記憶體洩漏
   */
  destroy(): void {
    console.log("[MessageQueue] Destroying queue");

    this.clear();
    this.handlers.clear();
    this.isProcessing = false;
  }
}

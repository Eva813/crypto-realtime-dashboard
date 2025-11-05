/**
 * WebSocket 健康監控器
 *
 * 📚 學習重點：
 * 1. 靜默斷線（Silent Disconnection）的檢測
 * 2. 心跳檢測機制（Heartbeat Detection）
 * 3. 效能監控與統計
 *
 * 🎯 為什麼需要心跳檢測？
 *
 * 問題：WebSocket「靜默斷線」
 * 場景：
 * - 用戶手機從 WiFi 切換到 4G
 * - 中間路由器斷電
 * - 防火牆規則變更
 *
 * 現象：
 * - TCP 連接仍然存在（作業系統層級）
 * - WebSocket.readyState === OPEN（瀏覽器認為連接正常）
 * - 但實際上已經無法傳輸資料
 * - onclose 事件不會觸發！❌
 *
 * 結果：
 * - 用戶看到的價格不再更新
 * - 但 UI 顯示「已連接」
 * - 用戶可能基於過時資料做出錯誤決策！💥
 *
 * 解決方案：
 * ✅ 定期檢查是否收到訊息
 * - 如果超過閾值（例如 10 秒）沒收到任何訊息
 * - 主動關閉連接並重新建立
 *
 * 💡 交易所級別考量：
 * Binance 熱門交易對（BTC/USDT）通常每秒都有更新
 * 如果 10 秒都沒收到訊息，幾乎可以確定連接有問題
 */

import {
  HEARTBEAT_CONFIG,
  PERFORMANCE_CONFIG,
  QUALITY_THRESHOLDS,
} from "../constants";
import type { ConnectionMetrics } from "../types";

/**
 * 健康狀態
 *
 * 🎯 連接品質分級：
 * - EXCELLENT: 延遲低、訊息穩定、無錯誤
 * - GOOD: 延遲中等、訊息正常
 * - POOR: 延遲高或訊息不穩定
 * - CRITICAL: 長時間無訊息或頻繁錯誤
 */
export type HealthStatus = "EXCELLENT" | "GOOD" | "POOR" | "CRITICAL";

/**
 * 健康檢查結果
 */
export interface HealthCheckResult {
  /** 健康狀態 */
  status: HealthStatus;

  /** 是否健康（status 為 EXCELLENT 或 GOOD） */
  isHealthy: boolean;

  /** 最後一次收到訊息的時間（毫秒時間戳） */
  lastMessageAt: number;

  /** 距離上次訊息的時間（毫秒） */
  timeSinceLastMessage: number;

  /** 是否超過心跳超時閾值 */
  isTimeout: boolean;

  /** 連接品質評分（0-100） */
  qualityScore: number;

  /** 效能指標 */
  metrics: ConnectionMetrics;

  /** 檢查時間 */
  checkedAt: number;
}

/**
 * 延遲樣本
 *
 * 💡 使用循環緩衝區（Circular Buffer）儲存最近的延遲樣本
 * 避免無限增長的陣列消耗記憶體
 */
interface LatencySample {
  /** 延遲值（毫秒） */
  value: number;

  /** 採樣時間 */
  timestamp: number;
}

/**
 * WebSocket 健康監控器
 *
 * 🎯 職責：
 * 1. 心跳檢測：定期檢查是否收到訊息
 * 2. 效能監控：追蹤延遲、訊息速率等指標
 * 3. 品質評估：計算連接品質評分
 * 4. 異常檢測：識別連接問題並觸發重連
 *
 * 💡 設計模式：Observer Pattern
 * 透過回調函數通知外部連接狀態變化
 */
export class HealthMonitor {
  // ============================================================================
  // 心跳檢測相關
  // ============================================================================

  /** 最後一次收到訊息的時間戳 */
  private lastMessageTime = Date.now();

  /** 心跳檢測定時器 */
  private heartbeatTimer: number | null = null;

  /** 心跳超時回調 */
  private onTimeout?: () => void;

  // ============================================================================
  // 效能監控相關
  // ============================================================================

  /** 訊息計數器（用於計算速率） */
  private messageCount = 0;

  /** 上次統計重置時間 */
  private statsResetTime = Date.now();

  /** 延遲樣本緩衝區（循環緩衝區） */
  private latencySamples: LatencySample[] = [];

  /** 當前延遲樣本索引 */
  private latencySampleIndex = 0;

  /** 最大延遲 */
  private maxLatency = 0;

  /** 最小延遲 */
  private minLatency = Infinity;

  /** 錯誤計數 */
  private errorCount = 0;

  /** 總訊息數（累計） */
  private totalMessages = 0;

  /** 效能指標更新定時器 */
  private metricsTimer: number | null = null;

  /** 效能指標更新回調 */
  private onMetricsUpdate?: (metrics: ConnectionMetrics) => void;

  // ============================================================================
  // 配置
  // ============================================================================

  private readonly config = {
    heartbeatInterval: HEARTBEAT_CONFIG.INTERVAL,
    heartbeatTimeout: HEARTBEAT_CONFIG.TIMEOUT,
    metricsUpdateInterval: PERFORMANCE_CONFIG.METRICS_UPDATE_INTERVAL,
    latencySamplesSize: PERFORMANCE_CONFIG.LATENCY_SAMPLES,
    enabled: HEARTBEAT_CONFIG.ENABLED,
  };

  /**
   * 啟動監控
   *
   * 🎯 啟動兩個定時器：
   * 1. 心跳檢測定時器：每 5 秒檢查一次
   * 2. 效能指標更新定時器：每 1 秒更新一次
   *
   * 💡 為什麼分開兩個定時器？
   * - 心跳檢測：關注「是否還活著」，需要較高頻率
   * - 效能指標：關注「表現如何」，可以較低頻率
   * - 解耦關注點，便於獨立調整
   */
  start(): void {
    if (!this.config.enabled) {
      console.log("[HealthMonitor] Monitoring disabled");
      return;
    }

    console.log("[HealthMonitor] Starting health monitoring");

    // 啟動心跳檢測
    this.startHeartbeat();

    // 啟動效能監控
    this.startMetricsMonitoring();
  }

  /**
   * 停止監控
   *
   * 💡 清理資源：
   * - 清除所有定時器
   * - 避免記憶體洩漏
   */
  stop(): void {
    console.log("[HealthMonitor] Stopping health monitoring");

    this.stopHeartbeat();
    this.stopMetricsMonitoring();
  }

  // ============================================================================
  // 心跳檢測
  // ============================================================================

  /**
   * 啟動心跳檢測
   *
   * 📚 工作原理：
   * 1. 每 5 秒執行一次檢查
   * 2. 計算距離上次收到訊息的時間
   * 3. 如果超過 10 秒，觸發超時回調
   *
   * 💡 setInterval vs setTimeout：
   * - setInterval：固定間隔執行，可能累積延遲
   * - setTimeout（遞迴）：每次執行完再排程下一次，更精確
   * - 這裡使用 setInterval 因為精確度要求不高
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳檢測
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 執行心跳檢查
   *
   * 🎯 檢查邏輯：
   * 1. 計算距離上次訊息的時間
   * 2. 判斷是否超過超時閾值
   * 3. 如果超時，觸發回調
   *
   * 💡 交易所場景：
   * - BTC/USDT 等熱門交易對，每秒都有更新
   * - 如果 10 秒沒收到訊息，幾乎確定是連接問題
   * - 立即觸發重連，避免用戶看到過時資料
   */
  private checkHeartbeat(): void {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;

    console.log(
      `[HealthMonitor] Heartbeat check: ${timeSinceLastMessage}ms since last message`,
    );

    // 超過心跳超時閾值
    if (timeSinceLastMessage > this.config.heartbeatTimeout) {
      console.warn(
        `[HealthMonitor] ⚠️ Heartbeat timeout! No message for ${timeSinceLastMessage}ms`,
      );

      // 觸發超時回調
      if (this.onTimeout) {
        this.onTimeout();
      }
    }
  }

  /**
   * 記錄收到訊息
   *
   * 🎯 每次收到 WebSocket 訊息時呼叫
   *
   * @param latency - 訊息延遲（可選）
   *
   * 💡 延遲計算：
   * latency = receivedAt - eventTime
   * - receivedAt: 本地收到訊息的時間
   * - eventTime: Binance 回傳的事件時間（E 欄位）
   */
  recordMessage(latency?: number): void {
    const now = Date.now();

    // 更新最後訊息時間（心跳檢測使用）
    this.lastMessageTime = now;

    // 增加訊息計數（速率計算使用）
    this.messageCount++;
    this.totalMessages++;

    // 記錄延遲樣本
    if (latency !== undefined) {
      this.recordLatency(latency);
    }
  }

  /**
   * 記錄延遲樣本
   *
   * 📚 循環緩衝區（Circular Buffer）：
   * - 固定大小的陣列（例如 100 個樣本）
   * - 新樣本覆蓋最舊的樣本
   * - 避免陣列無限增長
   *
   * 🎯 為什麼使用循環緩衝區？
   * - 記憶體使用固定：100 個樣本 × 16 bytes ≈ 1.6 KB
   * - 效能穩定：不需要 shift() 或 splice() 操作
   * - 保留最近的樣本：計算平均延遲更有意義
   *
   * @example
   * // 樣本陣列大小 = 3，當前索引 = 0
   * [sample1, sample2, sample3]
   *  ^
   *
   * // 加入新樣本
   * [newSample, sample2, sample3]
   *             ^
   */
  private recordLatency(latency: number): void {
    const sample: LatencySample = {
      value: latency,
      timestamp: Date.now(),
    };

    // 循環緩衝區：覆蓋最舊的樣本
    if (this.latencySamples.length < this.config.latencySamplesSize) {
      // 陣列未滿，直接加入
      this.latencySamples.push(sample);
    } else {
      // 陣列已滿，覆蓋舊樣本
      this.latencySamples[this.latencySampleIndex] = sample;
    }

    // 更新索引（循環）
    this.latencySampleIndex =
      (this.latencySampleIndex + 1) % this.config.latencySamplesSize;

    // 更新最大/最小延遲
    if (latency > this.maxLatency) {
      this.maxLatency = latency;
    }
    if (latency < this.minLatency) {
      this.minLatency = latency;
    }
  }

  /**
   * 記錄錯誤
   *
   * 🎯 用途：
   * - 追蹤錯誤率
   * - 計算連接品質評分
   */
  recordError(): void {
    this.errorCount++;
  }

  // ============================================================================
  // 效能監控
  // ============================================================================

  /**
   * 啟動效能指標監控
   *
   * 📊 每 1 秒計算一次效能指標：
   * - 平均延遲
   * - 訊息速率
   * - 連接品質評分
   */
  private startMetricsMonitoring(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsUpdateInterval);
  }

  /**
   * 停止效能指標監控
   */
  private stopMetricsMonitoring(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  /**
   * 更新效能指標
   *
   * 📊 計算各項指標並通知外部
   */
  private updateMetrics(): void {
    const metrics = this.getMetrics();

    // 觸發回調
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(metrics);
    }

    // 重置計數器（準備下一個統計週期）
    this.resetCounters();
  }

  /**
   * 重置計數器
   *
   * 💡 每次更新效能指標後呼叫
   * 重置速率相關的計數器，但保留累計統計
   */
  private resetCounters(): void {
    this.messageCount = 0;
    this.statsResetTime = Date.now();
  }

  // ============================================================================
  // 品質評估
  // ============================================================================

  /**
   * 計算連接品質評分
   *
   * 📊 評分演算法（0-100 分）：
   *
   * 1. 延遲評分（40%）：
   *    - < 100ms: 滿分 40
   *    - 100-500ms: 線性遞減 40-20
   *    - > 500ms: 20 分
   *
   * 2. 訊息速率評分（30%）：
   *    - > 1 訊息/秒: 滿分 30
   *    - 0.1-1 訊息/秒: 線性遞減 30-15
   *    - < 0.1 訊息/秒: 0 分（可能斷線）
   *
   * 3. 錯誤率評分（30%）：
   *    - 錯誤率 < 1%: 滿分 30
   *    - 錯誤率 1%-5%: 線性遞減 30-15
   *    - 錯誤率 > 5%: 0 分
   *
   * 💡 權重設計考量：
   * - 延遲最重要（40%）：交易決策需要即時資料
   * - 訊息速率次之（30%）：確保資料持續更新
   * - 錯誤率（30%）：太多錯誤表示連接不穩定
   *
   * @returns 品質評分（0-100）
   */
  private calculateQualityScore(): number {
    const avgLatency = this.getAverageLatency();
    const messageRate = this.getMessageRate();
    const errorRate = this.getErrorRate();

    // 1. 延遲評分（0-40 分）
    let latencyScore = 0;
    if (avgLatency < QUALITY_THRESHOLDS.EXCELLENT_LATENCY) {
      latencyScore = 40;
    } else if (avgLatency < QUALITY_THRESHOLDS.GOOD_LATENCY) {
      // 線性插值
      const range =
        QUALITY_THRESHOLDS.GOOD_LATENCY - QUALITY_THRESHOLDS.EXCELLENT_LATENCY;
      const position = avgLatency - QUALITY_THRESHOLDS.EXCELLENT_LATENCY;
      latencyScore = 40 - (position / range) * 20;
    } else {
      latencyScore = 20;
    }

    // 2. 訊息速率評分（0-30 分）
    let rateScore = 0;
    if (messageRate >= 1) {
      rateScore = 30;
    } else if (messageRate >= QUALITY_THRESHOLDS.MIN_MESSAGE_RATE) {
      // 線性插值
      const range = 1 - QUALITY_THRESHOLDS.MIN_MESSAGE_RATE;
      const position = messageRate - QUALITY_THRESHOLDS.MIN_MESSAGE_RATE;
      rateScore = 15 + (position / range) * 15;
    } else {
      rateScore = 0; // 幾乎無訊息，可能斷線
    }

    // 3. 錯誤率評分（0-30 分）
    let errorScore = 0;
    if (errorRate < 1) {
      errorScore = 30;
    } else if (errorRate < QUALITY_THRESHOLDS.MAX_ERROR_RATE) {
      // 線性插值
      const range = QUALITY_THRESHOLDS.MAX_ERROR_RATE - 1;
      const position = errorRate - 1;
      errorScore = 30 - (position / range) * 15;
    } else {
      errorScore = 0;
    }

    return Math.round(latencyScore + rateScore + errorScore);
  }

  /**
   * 判斷健康狀態
   *
   * 🎯 分級標準：
   * - EXCELLENT (90-100): 延遲低、訊息穩定、無錯誤
   * - GOOD (70-89): 正常運作
   * - POOR (50-69): 有問題但仍可用
   * - CRITICAL (<50): 嚴重問題，建議重連
   */
  private getHealthStatus(qualityScore: number): HealthStatus {
    if (qualityScore >= 90) return "EXCELLENT";
    if (qualityScore >= 70) return "GOOD";
    if (qualityScore >= 50) return "POOR";
    return "CRITICAL";
  }

  // ============================================================================
  // 公開 API
  // ============================================================================

  /**
   * 執行健康檢查
   *
   * @returns 健康檢查結果
   */
  performHealthCheck(): HealthCheckResult {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    const metrics = this.getMetrics();
    const qualityScore = metrics.qualityScore;
    const status = this.getHealthStatus(qualityScore);

    return {
      status,
      isHealthy: status === "EXCELLENT" || status === "GOOD",
      lastMessageAt: this.lastMessageTime,
      timeSinceLastMessage,
      isTimeout: timeSinceLastMessage > this.config.heartbeatTimeout,
      qualityScore,
      metrics,
      checkedAt: now,
    };
  }

  /**
   * 獲取效能指標
   *
   * @returns 連接效能指標
   */
  getMetrics(): ConnectionMetrics {
    return {
      averageLatency: this.getAverageLatency(),
      maxLatency: this.maxLatency,
      minLatency: this.minLatency === Infinity ? 0 : this.minLatency,
      messageRate: this.getMessageRate(),
      totalMessages: this.totalMessages,
      qualityScore: this.calculateQualityScore(),
      lastUpdated: Date.now(),
    };
  }

  /**
   * 計算平均延遲
   *
   * 📚 演算法：簡單平均
   * avg = sum(samples) / count(samples)
   *
   * 💡 可優化方向（未來）：
   * - 加權平均：較新的樣本權重更高
   * - 中位數：避免極端值影響
   * - 移動平均：平滑曲線
   */
  private getAverageLatency(): number {
    if (this.latencySamples.length === 0) {
      return 0;
    }

    const sum = this.latencySamples.reduce(
      (acc, sample) => acc + sample.value,
      0,
    );
    return Math.round(sum / this.latencySamples.length);
  }

  /**
   * 計算訊息速率（訊息/秒）
   *
   * 📚 演算法：
   * rate = messageCount / timePeriod
   *
   * 💡 注意：
   * - 時間週期以秒為單位
   * - 每次更新指標後重置計數器
   */
  private getMessageRate(): number {
    const now = Date.now();
    const timePeriod = (now - this.statsResetTime) / 1000; // 轉換為秒

    if (timePeriod === 0) {
      return 0;
    }

    return this.messageCount / timePeriod;
  }

  /**
   * 計算錯誤率（百分比）
   *
   * 📚 演算法：
   * errorRate = (errorCount / totalMessages) * 100
   */
  private getErrorRate(): number {
    if (this.totalMessages === 0) {
      return 0;
    }

    return (this.errorCount / this.totalMessages) * 100;
  }

  /**
   * 註冊心跳超時回調
   *
   * @param callback - 超時時觸發的回調函數
   *
   * @example
   * monitor.onHeartbeatTimeout(() => {
   *   console.log('Connection timeout, reconnecting...')
   *   connection.reconnect()
   * })
   */
  onHeartbeatTimeout(callback: () => void): void {
    this.onTimeout = callback;
  }

  /**
   * 註冊效能指標更新回調
   *
   * @param callback - 指標更新時觸發的回調函數
   *
   * @example
   * monitor.onPerformanceUpdate((metrics) => {
   *   console.log('Latency:', metrics.averageLatency)
   *   console.log('Message rate:', metrics.messageRate)
   * })
   */
  onPerformanceUpdate(callback: (metrics: ConnectionMetrics) => void): void {
    this.onMetricsUpdate = callback;
  }

  /**
   * 重置所有統計
   *
   * 🎯 使用時機：
   * - 重新連接後
   * - 手動清除統計
   */
  reset(): void {
    console.log("[HealthMonitor] Resetting all stats");

    this.lastMessageTime = Date.now();
    this.messageCount = 0;
    this.totalMessages = 0;
    this.errorCount = 0;
    this.maxLatency = 0;
    this.minLatency = Infinity;
    this.latencySamples = [];
    this.latencySampleIndex = 0;
    this.statsResetTime = Date.now();
  }
}

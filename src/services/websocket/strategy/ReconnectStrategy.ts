/**
 * WebSocket 重連策略
 *
 * 📚 學習重點：
 * 1. 指數退避演算法（Exponential Backoff Algorithm）
 * 2. 抖動（Jitter）技術
 * 3. 策略模式（Strategy Pattern）的應用
 *
 * 🎯 為什麼需要重連策略？
 *
 * 問題場景：
 * - 使用者網路暫時中斷
 * - 伺服器維護或重啟
 * - 防火牆暫時阻擋
 *
 * 錯誤做法：
 * ❌ 固定間隔重連（例如：每 1 秒重連一次）
 * 問題：
 * 1. 「雷擊效應」：大量客戶端同時斷線、同時重連 → 伺服器過載
 * 2. 浪費資源：網路長時間中斷時，頻繁無效重連浪費電池和流量
 * 3. 可能被視為 DDoS 攻擊
 *
 * 正確做法：
 * ✅ 指數退避 + 抖動
 * - 第 1 次：等待 1 秒
 * - 第 2 次：等待 2 秒
 * - 第 3 次：等待 4 秒
 * - 第 4 次：等待 8 秒
 * - 第 5 次：等待 16 秒
 * - 之後：最多等待 30 秒
 *
 * 加上抖動（+/- 10%）避免同步重連
 *
 * 💡 交易所最佳實踐：
 * - Binance 建議：最多重連 5 次
 * - Coinbase Pro：使用指數退避，最長 30 秒
 * - Kraken：使用指數退避 + 抖動
 */

import { RECONNECT_STRATEGY } from "../constants";

/**
 * 重連策略介面
 *
 * 🎯 設計模式：Strategy Pattern
 * 定義統一介面，可以有不同的實作（指數退避、固定間隔、自適應等）
 *
 * 💡 為什麼使用介面？
 * - 解耦：使用者不需要知道具體實作
 * - 可測試：容易建立 mock 實作
 * - 可擴展：未來可以加入其他策略
 */
export interface ReconnectStrategy {
  /**
   * 獲取下一次重連的延遲時間（毫秒）
   *
   * @param attempt - 當前是第幾次嘗試（從 0 開始）
   * @returns 延遲時間（毫秒）
   */
  getDelay(attempt: number): number;

  /**
   * 重置策略狀態
   * 連接成功後應該呼叫此方法
   */
  reset(): void;

  /**
   * 是否應該繼續重連
   *
   * @param attempt - 當前嘗試次數
   * @returns true 表示應該繼續重連
   */
  shouldRetry(attempt: number): boolean;
}

/**
 * 指數退避重連策略
 *
 * 📚 演算法說明：
 * delay = min(initialDelay * (multiplier ^ attempt), maxDelay)
 *
 * 範例（initialDelay=1000, multiplier=2, maxDelay=30000）：
 * - attempt 0: 1000ms  (1s)
 * - attempt 1: 2000ms  (2s)
 * - attempt 2: 4000ms  (4s)
 * - attempt 3: 8000ms  (8s)
 * - attempt 4: 16000ms (16s)
 * - attempt 5: 30000ms (30s, 達到上限)
 *
 * 🎯 設計優勢：
 * 1. 快速恢復：短暫中斷時（1-2秒）能快速重連
 * 2. 避免過載：長時間中斷時，不會頻繁重連
 * 3. 資源友善：減少不必要的網路請求
 */
export class ExponentialBackoffStrategy implements ReconnectStrategy {
  private currentAttempt = 0;
  private readonly config: {
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
    maxAttempts: number;
    enableJitter: boolean;
    jitterFactor: number;
  };

  constructor(
    config?: Partial<{
      initialDelay: number;
      maxDelay: number;
      multiplier: number;
      maxAttempts: number;
      enableJitter: boolean;
      jitterFactor: number;
    }>,
  ) {
    this.config = {
      initialDelay: config?.initialDelay ?? RECONNECT_STRATEGY.INITIAL_DELAY,
      maxDelay: config?.maxDelay ?? RECONNECT_STRATEGY.MAX_DELAY,
      multiplier: config?.multiplier ?? RECONNECT_STRATEGY.MULTIPLIER,
      maxAttempts: config?.maxAttempts ?? RECONNECT_STRATEGY.MAX_ATTEMPTS,
      enableJitter: config?.enableJitter ?? RECONNECT_STRATEGY.ENABLE_JITTER,
      jitterFactor: config?.jitterFactor ?? RECONNECT_STRATEGY.JITTER_FACTOR,
    };
  }

  /**
   * 計算重連延遲
   *
   * 💡 實作細節：
   * 1. 計算基礎延遲：initialDelay * (multiplier ^ attempt)
   * 2. 限制最大值：Math.min(baseDelay, maxDelay)
   * 3. 加入抖動：delay * (1 ± jitterFactor)
   *
   * 🎯 抖動（Jitter）的重要性：
   * 假設 1000 個客戶端同時斷線：
   * - 沒有抖動：1000 個客戶端在同一時間重連 → 伺服器瞬間收到 1000 個請求
   * - 有抖動：重連時間分散在 ±10% 的範圍內 → 伺服器壓力平滑
   *
   * @example
   * const strategy = new ExponentialBackoffStrategy()
   * strategy.getDelay(0)  // ~1000ms (900-1100ms with jitter)
   * strategy.getDelay(1)  // ~2000ms (1800-2200ms with jitter)
   * strategy.getDelay(2)  // ~4000ms (3600-4400ms with jitter)
   */
  getDelay(attempt: number): number {
    // 1. 計算基礎延遲（指數增長）
    const baseDelay =
      this.config.initialDelay * Math.pow(this.config.multiplier, attempt);

    // 2. 限制最大延遲
    const cappedDelay = Math.min(baseDelay, this.config.maxDelay);

    // 3. 加入抖動（如果啟用）
    if (this.config.enableJitter) {
      return this.applyJitter(cappedDelay);
    }

    return cappedDelay;
  }

  /**
   * 加入抖動
   *
   * 📚 演算法：
   * jitter = delay * (1 + random(-jitterFactor, +jitterFactor))
   *
   * 範例（delay=1000, jitterFactor=0.1）：
   * - 最小值：1000 * (1 - 0.1) = 900ms
   * - 最大值：1000 * (1 + 0.1) = 1100ms
   * - 隨機範圍：900-1100ms
   *
   * 💡 Math.random() 技巧：
   * - Math.random() 產生 [0, 1) 的隨機數
   * - Math.random() * 2 - 1 產生 [-1, 1) 的隨機數
   * - (Math.random() * 2 - 1) * jitterFactor 產生 [-jitterFactor, +jitterFactor) 的隨機數
   */
  private applyJitter(delay: number): number {
    const jitter = (Math.random() * 2 - 1) * this.config.jitterFactor;
    const jitteredDelay = delay * (1 + jitter);

    // 確保延遲不會是負數（雖然理論上不會發生）
    return Math.max(0, Math.round(jitteredDelay));
  }

  /**
   * 判斷是否應該繼續重連
   *
   * 💡 設計考量：
   * - 限制最大重連次數（避免無限重連）
   * - 超過限制後，需要用戶手動操作（刷新頁面）
   * - 保護用戶的電池和流量
   *
   * 🎯 交易所場景：
   * 如果連續失敗 5 次，很可能是：
   * 1. 用戶網路完全斷線
   * 2. 伺服器維護中
   * 3. API 端點變更
   * 這時應該停止重連，並顯示錯誤訊息給用戶
   */
  shouldRetry(attempt: number): boolean {
    return attempt < this.config.maxAttempts;
  }

  /**
   * 重置策略
   *
   * 🎯 使用時機：
   * - 連接成功後
   * - 用戶手動重連時
   *
   * 💡 為什麼需要重置？
   * 重置後，下次斷線時從第一次重連開始
   * 不會因為之前的失敗而延長等待時間
   */
  reset(): void {
    this.currentAttempt = 0;
  }

  /**
   * 獲取當前嘗試次數
   */
  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  /**
   * 增加嘗試次數
   *
   * 💡 內部使用：
   * ConnectionManager 每次重連失敗後會呼叫此方法
   */
  incrementAttempt(): void {
    this.currentAttempt++;
  }

  /**
   * 獲取剩餘重連次數
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.config.maxAttempts - this.currentAttempt);
  }

  /**
   * 預覽所有重連延遲（用於除錯和測試）
   *
   * @returns 所有重連嘗試的延遲時間陣列
   *
   * @example
   * const strategy = new ExponentialBackoffStrategy()
   * console.log(strategy.previewDelays())
   * // 輸出：[1000, 2000, 4000, 8000, 16000] (不含抖動)
   */
  previewDelays(): number[] {
    const delays: number[] = [];
    for (let i = 0; i < this.config.maxAttempts; i++) {
      // 暫時禁用抖動以顯示基礎延遲
      const baseDelay =
        this.config.initialDelay * Math.pow(this.config.multiplier, i);
      delays.push(Math.min(baseDelay, this.config.maxDelay));
    }
    return delays;
  }
}

/**
 * 固定間隔重連策略
 *
 * 📚 學習用途：
 * 這是一個簡單的策略實作範例
 * 實際生產環境建議使用 ExponentialBackoffStrategy
 *
 * ⚠️ 不建議在生產環境使用：
 * - 可能導致「雷擊效應」
 * - 浪費資源
 * - 可能被視為惡意請求
 *
 * 💡 適用場景：
 * - 開發測試
 * - 內部網路（不會有大量客戶端）
 */
export class FixedIntervalStrategy implements ReconnectStrategy {
  private readonly delay: number;
  private readonly maxAttempts: number;

  constructor(delay?: number, maxAttempts?: number) {
    this.delay = delay ?? 3000;
    this.maxAttempts = maxAttempts ?? 5;
  }

  getDelay(): number {
    return this.delay;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  reset(): void {
    // Fixed interval 不需要狀態
  }
}

/**
 * 自適應重連策略（進階）
 *
 * 📚 學習重點：
 * 根據網路狀況動態調整重連策略
 *
 * 🎯 設計思路：
 * - 如果重連快速成功：減少延遲（網路狀況良好）
 * - 如果重連持續失敗：增加延遲（網路狀況差）
 *
 * 💡 未來擴展：
 * - 整合 Network Information API
 * - 根據 connection.effectiveType 調整策略
 * - 根據歷史成功率調整參數
 */
export class AdaptiveStrategy implements ReconnectStrategy {
  private baseStrategy: ExponentialBackoffStrategy;
  private successCount = 0;
  private failureCount = 0;

  constructor() {
    this.baseStrategy = new ExponentialBackoffStrategy();
  }

  getDelay(attempt: number): number {
    let delay = this.baseStrategy.getDelay(attempt);

    // 根據成功率調整延遲
    const successRate = this.getSuccessRate();
    if (successRate > 0.8) {
      delay *= 0.5; // 成功率高，減少延遲
    } else if (successRate < 0.2) {
      delay *= 1.5; // 成功率低，增加延遲
    }

    return delay;
  }

  shouldRetry(attempt: number): boolean {
    return this.baseStrategy.shouldRetry(attempt);
  }

  reset(): void {
    this.baseStrategy.reset();
  }

  recordSuccess(): void {
    this.successCount++;
  }

  recordFailure(): void {
    this.failureCount++;
  }

  private getSuccessRate(): number {
    const total = this.successCount + this.failureCount;
    return total === 0 ? 0.5 : this.successCount / total;
  }
}

/**
 * 建立預設重連策略
 *
 * 💡 工廠函數：
 * 提供便利的方式建立策略實例
 *
 * @example
 * const strategy = createDefaultStrategy()
 */
export function createDefaultStrategy(): ReconnectStrategy {
  return new ExponentialBackoffStrategy();
}

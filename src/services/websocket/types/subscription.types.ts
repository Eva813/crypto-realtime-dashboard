/**
 * WebSocket 訂閱相關類型定義
 *
 * 📚 學習重點：
 * 1. 訂閱-發布模式（Pub-Sub Pattern）的 TypeScript 實現
 * 2. Callback 類型的設計與管理
 * 3. 泛型在資料流中的應用
 *
 * 🎯 設計目標：
 * - 類型安全的訂閱機制
 * - 支援多種資料類型（價格、K線等）
 * - 訂閱去重與生命週期管理
 */

import type { PriceUpdate, KLine } from "../../../utils/validation";

/**
 * 訂閱主題類型
 *
 * 💡 Binance WebSocket Stream 命名規則：
 * - 價格更新：{symbol}@24hrMiniTicker  例如：BTCUSDT@24hrMiniTicker
 * - K線更新：{symbol}@kline_{interval}  例如：BTCUSDT@kline_1h
 * - 深度更新：{symbol}@depth            例如：BTCUSDT@depth
 *
 * 📚 學習重點：
 * 理解不同交易所的 WebSocket API 設計
 * Binance 使用 stream name 來區分不同的資料流
 */
export type StreamType = "ticker" | "kline" | "depth" | "trade";

/**
 * 時間間隔（K線專用）
 *
 * 💡 交易所常用時間間隔：
 * - 1m, 5m, 15m, 30m: 短線交易
 * - 1h, 4h: 日內交易
 * - 1d, 1w: 趨勢分析
 */
export type TimeFrame = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

/**
 * 訂閱請求
 *
 * 🎯 設計模式：Command Pattern
 * 將訂閱操作封裝成物件，便於管理和追蹤
 *
 * @example
 * const request: SubscriptionRequest = {
 *   id: 'sub_001',
 *   method: 'SUBSCRIBE',
 *   params: ['BTCUSDT@24hrMiniTicker'],
 *   timestamp: Date.now()
 * }
 */
export interface SubscriptionRequest {
  /** 請求 ID（用於追蹤請求-響應） */
  id: string;

  /** 訂閱方法：SUBSCRIBE（訂閱）或 UNSUBSCRIBE（取消訂閱） */
  method: "SUBSCRIBE" | "UNSUBSCRIBE";

  /** 訂閱的 stream names */
  params: string[];

  /** 請求時間戳 */
  timestamp: number;
}

/**
 * 訂閱響應
 *
 * 📚 學習重點：
 * Binance WebSocket 會回傳訂閱結果
 * 需要檢查 result 和 error 來確認訂閱是否成功
 *
 * @example
 * // 成功響應
 * { id: 'sub_001', result: null, error: null }
 *
 * // 失敗響應
 * { id: 'sub_001', result: null, error: { code: -1, msg: 'Invalid symbol' } }
 */
export interface SubscriptionResponse {
  /** 對應的請求 ID */
  id: string;

  /** 訂閱結果（通常為 null） */
  result: unknown;

  /** 錯誤訊息（如果訂閱失敗） */
  error?: {
    code: number;
    msg: string;
  };
}

/**
 * 訂閱 Callback 類型
 *
 * 💡 泛型設計：
 * 不同資料類型使用不同的 callback
 * - PriceUpdate: 價格更新
 * - KLine: K線更新
 * - any: 通用資料（用於擴展）
 */
export type SubscriptionCallback<T = unknown> = (data: T) => void;

/**
 * 訂閱項目
 *
 * 🎯 核心設計：
 * 每個訂閱項目包含：
 * 1. 唯一標識（symbol + type）
 * 2. 多個 callback（支援多個元件訂閱同一個 stream）
 * 3. 訂閱狀態追蹤
 *
 * 📚 設計模式：Observer Pattern
 * 一個主題（symbol）可以有多個觀察者（callbacks）
 */
export interface SubscriptionItem<T = unknown> {
  /** 訂閱的幣種符號 */
  symbol: string;

  /** Stream 類型 */
  type: StreamType;

  /** 時間間隔（僅 K線需要） */
  interval?: TimeFrame;

  /** Stream name（Binance 格式） */
  streamName: string;

  /** 所有訂閱此 stream 的 callbacks */
  callbacks: Set<SubscriptionCallback<T>>;

  /** 訂閱狀態 */
  status: "pending" | "active" | "failed";

  /** 訂閱時間 */
  subscribedAt: number;

  /** 最後一次收到資料的時間 */
  lastDataAt?: number;

  /** 接收資料計數 */
  dataCount: number;
}

/**
 * 訂閱管理器狀態
 *
 * 📊 統計資訊：
 * 用於監控和除錯訂閱系統的健康狀況
 */
export interface SubscriptionManagerState {
  /** 活躍訂閱數量 */
  activeSubscriptions: number;

  /** 待處理訂閱數量 */
  pendingSubscriptions: number;

  /** 失敗訂閱數量 */
  failedSubscriptions: number;

  /** 總 callback 數量 */
  totalCallbacks: number;

  /** 訂閱限制（Binance 建議每個連接不超過 1024 個訂閱） */
  subscriptionLimit: number;

  /** 是否達到訂閱限制 */
  isLimitReached: boolean;
}

/**
 * 價格訂閱參數
 *
 * 🎯 專用訂閱類型：
 * 為不同資料類型提供專用的訂閱介面
 * 提升類型安全性和使用體驗
 */
export interface PriceSubscriptionParams {
  /** 幣種符號（例如：BTCUSDT） */
  symbol: string;

  /** 價格更新 callback */
  callback: SubscriptionCallback<PriceUpdate>;
}

/**
 * K線訂閱參數
 *
 * 💡 學習重點：
 * K線訂閱需要額外指定時間間隔
 * 同一個 symbol 可以訂閱多個時間間隔
 */
export interface KLineSubscriptionParams {
  /** 幣種符號 */
  symbol: string;

  /** 時間間隔 */
  interval: TimeFrame;

  /** K線更新 callback */
  callback: SubscriptionCallback<KLine>;
}

/**
 * 取消訂閱函數類型
 *
 * 📚 React Hooks 模式：
 * useEffect 的清理函數（cleanup function）
 *
 * @example
 * useEffect(() => {
 *   const unsubscribe = manager.subscribe('BTCUSDT', callback)
 *   return unsubscribe  // 元件卸載時自動取消訂閱
 * }, [])
 */
export type UnsubscribeFunction = () => void;

/**
 * 訂閱錯誤類型
 *
 * 🎯 錯誤分類：
 * 不同的錯誤類型需要不同的處理策略
 */
export type SubscriptionErrorType =
  | "INVALID_SYMBOL" // 無效的幣種符號
  | "SUBSCRIPTION_FAILED" // 訂閱失敗
  | "LIMIT_REACHED" // 達到訂閱限制
  | "DUPLICATE_SUBSCRIPTION" // 重複訂閱（不一定是錯誤，可能只是警告）
  | "CONNECTION_LOST" // 連接中斷
  | "TIMEOUT"; // 訂閱超時

/**
 * 訂閱錯誤
 *
 * 💡 自定義錯誤類別：
 * 擴展標準 Error，加入更多上下文資訊
 * 便於錯誤追蹤和處理
 */
export interface SubscriptionError extends Error {
  /** 錯誤類型 */
  type: SubscriptionErrorType;

  /** 相關的 symbol */
  symbol?: string;

  /** 相關的 stream name */
  streamName?: string;

  /** 錯誤發生時間 */
  timestamp: number;

  /** 是否可重試 */
  retryable: boolean;
}

/**
 * 訂閱統計資料
 *
 * 📊 效能監控：
 * 追蹤每個訂閱的效能指標
 * 用於優化和問題診斷
 */
export interface SubscriptionStats {
  /** 訂閱的 stream name */
  streamName: string;

  /** 訂閱時間 */
  subscribedAt: number;

  /** 運行時長（毫秒） */
  uptime: number;

  /** 接收訊息總數 */
  messagesReceived: number;

  /** 訊息接收速率（訊息/秒） */
  messageRate: number;

  /** 平均訊息間隔（毫秒） */
  averageInterval: number;

  /** 最後一次收到訊息的時間 */
  lastMessageAt: number;

  /** 活躍 callback 數量 */
  activeCallbacks: number;

  /** 錯誤計數 */
  errorCount: number;
}

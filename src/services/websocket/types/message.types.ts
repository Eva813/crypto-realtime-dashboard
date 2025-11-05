/**
 * WebSocket 訊息相關類型定義
 *
 * 📚 學習重點：
 * 1. 訊息佇列設計（Message Queue）
 * 2. 批次處理（Batch Processing）
 * 3. 訊息路由（Message Routing）
 *
 * 🎯 設計目標：
 * - 高效處理高頻訊息（交易所每秒可能推送 100+ 筆更新）
 * - 避免阻塞 UI 渲染（使用 requestAnimationFrame）
 * - 訊息去重與合併（同一個 symbol 只保留最新資料）
 */

import type { PriceUpdate, KLine } from "../../../utils/validation";

/**
 * 原始訊息類型（Binance WebSocket 回傳的原始資料）
 *
 * 💡 學習重點：
 * Binance 的訊息結構設計
 * - e: event type（事件類型）
 * - E: event time（事件時間戳）
 * - s: symbol（幣種符號）
 *
 * 📚 不同事件類型的資料結構：
 * - 24hrMiniTicker: 24小時價格統計
 * - kline: K線資料
 * - trade: 成交資料
 */
export interface RawBinanceMessage {
  /** 事件類型 */
  e: string;

  /** 事件時間（毫秒時間戳） */
  E: number;

  /** 幣種符號 */
  s: string;

  /** 其他欄位（根據事件類型不同） */
  [key: string]: unknown;
}

/**
 * 處理後的訊息
 *
 * 🎯 設計模式：Adapter Pattern
 * 將不同來源的原始資料轉換成統一格式
 * 便於後續處理和路由
 *
 * 💡 泛型應用：
 * T 可以是 PriceUpdate、KLine 或其他資料類型
 */
export interface ProcessedMessage<T = unknown> {
  /** 訊息類型 */
  type: MessageType;

  /** 幣種符號 */
  symbol: string;

  /** 處理後的資料 */
  data: T;

  /** 原始時間戳（Binance 回傳的） */
  timestamp: number;

  /** 接收時間戳（本地時間） */
  receivedAt: number;

  /** 處理時間戳 */
  processedAt: number;

  /** 延遲（接收時間 - 原始時間） */
  latency: number;
}

/**
 * 訊息類型
 *
 * 📚 對應 Binance 的不同事件類型
 * 但使用更語義化的命名
 */
export type MessageType =
  | "price" // 價格更新（對應 24hrMiniTicker）
  | "kline" // K線更新（對應 kline）
  | "trade" // 成交資料（對應 trade）
  | "depth" // 深度資料（對應 depth）
  | "unknown"; // 未知類型

/**
 * 訊息佇列項目
 *
 * 🎯 佇列設計：
 * 為什麼需要訊息佇列？
 * 1. 高頻更新：市場波動時，每秒可能收到 100+ 筆價格更新
 * 2. 渲染優化：直接更新 React 狀態會導致頻繁重渲染，阻塞 UI
 * 3. 批次處理：將多筆更新合併成一次狀態更新，提升效能
 *
 * 💡 優先級設計：
 * - HIGH: 重要訊息，立即處理（例如：訂單成交）
 * - NORMAL: 一般訊息，批次處理（例如：價格更新）
 * - LOW: 低優先級訊息，可延遲處理
 */
export interface MessageQueueItem<T = unknown> {
  /** 唯一 ID */
  id: string;

  /** 處理後的訊息 */
  message: ProcessedMessage<T>;

  /** 優先級 */
  priority: MessagePriority;

  /** 加入佇列的時間 */
  enqueuedAt: number;

  /** 重試次數（如果處理失敗） */
  retries: number;
}

/**
 * 訊息優先級
 *
 * 💡 交易所場景：
 * 不是所有訊息都同等重要
 * 訂單成交通知 > 價格更新 > 統計資料
 */
export type MessagePriority = "HIGH" | "NORMAL" | "LOW";

/**
 * 訊息佇列配置
 *
 * ⚙️ 效能調校參數：
 * 這些參數會直接影響系統效能
 * 需要根據實際場景調整
 */
export interface MessageQueueConfig {
  /** 批次大小（每次處理多少筆訊息） */
  batchSize: number;

  /** 處理間隔（毫秒），預設使用 requestAnimationFrame（約 16ms） */
  processInterval?: number;

  /** 佇列最大長度（防止記憶體溢位） */
  maxQueueSize: number;

  /** 是否啟用訊息合併（同一 symbol 只保留最新資料） */
  enableMerge: boolean;

  /** 是否啟用優先級處理 */
  enablePriority: boolean;

  /** 訊息過期時間（毫秒），超過此時間的訊息將被丟棄 */
  messageExpiry: number;
}

/**
 * 訊息批次
 *
 * 🎯 批次處理：
 * 將多筆訊息合併成一個批次
 * 一次性更新狀態，減少重渲染次數
 *
 * @example
 * // 收到 100 筆價格更新
 * // 合併後只保留每個 symbol 的最新價格
 * // 一次性更新 store，只觸發 1 次重渲染
 */
export interface MessageBatch {
  /** 批次 ID */
  id: string;

  /** 批次中的訊息 */
  messages: ProcessedMessage[];

  /** 批次大小 */
  size: number;

  /** 批次建立時間 */
  createdAt: number;

  /** 批次處理時間 */
  processedAt?: number;

  /** 處理耗時（毫秒） */
  processingTime?: number;
}

/**
 * 訊息路由規則
 *
 * 🎯 設計模式：Strategy Pattern
 * 根據訊息類型決定如何處理
 *
 * 💡 擴展性：
 * 新增資料類型時，只需加入新的路由規則
 * 無需修改核心邏輯
 */
export interface MessageRoute {
  /** 訊息類型 */
  type: MessageType;

  /** 處理函數 */
  handler: MessageHandler;

  /** 是否啟用批次處理 */
  enableBatch: boolean;

  /** 是否啟用去重 */
  enableDedup: boolean;
}

/**
 * 訊息處理函數
 *
 * 💡 函數式程式設計：
 * 將處理邏輯封裝成函數
 * 便於測試和組合
 */
export type MessageHandler<T = unknown> = (
  message: ProcessedMessage<T>,
) => void;

/**
 * 訊息過濾器
 *
 * 🎯 用途：
 * 1. 過濾無效訊息
 * 2. 驗證資料格式
 * 3. 實現白名單/黑名單
 *
 * @example
 * const symbolFilter: MessageFilter = (msg) => {
 *   return msg.symbol.endsWith('USDT')  // 只處理 USDT 交易對
 * }
 */
export type MessageFilter = (message: ProcessedMessage) => boolean;

/**
 * 訊息統計
 *
 * 📊 效能監控：
 * 追蹤訊息處理的效能指標
 * 用於優化和問題診斷
 */
export interface MessageStats {
  /** 接收訊息總數 */
  totalReceived: number;

  /** 處理訊息總數 */
  totalProcessed: number;

  /** 丟棄訊息總數（過期或佇列滿） */
  totalDropped: number;

  /** 錯誤訊息總數 */
  totalErrors: number;

  /** 平均處理時間（毫秒） */
  averageProcessingTime: number;

  /** 最大處理時間（毫秒） */
  maxProcessingTime: number;

  /** 當前佇列長度 */
  currentQueueSize: number;

  /** 訊息接收速率（訊息/秒） */
  receiveRate: number;

  /** 訊息處理速率（訊息/秒） */
  processRate: number;

  /** 最後更新時間 */
  lastUpdated: number;
}

/**
 * 訊息處理結果
 *
 * 🎯 結果追蹤：
 * 記錄每個訊息的處理結果
 * 便於除錯和審計
 */
export interface MessageProcessResult {
  /** 訊息 ID */
  messageId: string;

  /** 是否處理成功 */
  success: boolean;

  /** 錯誤訊息（如果失敗） */
  error?: string;

  /** 處理耗時（毫秒） */
  processingTime: number;

  /** 處理時間 */
  processedAt: number;

  /** 重試次數 */
  retries: number;
}

/**
 * 價格更新訊息（專用類型）
 *
 * 💡 類型細化：
 * 為不同訊息類型提供專用介面
 * 提升類型安全性
 */
export type PriceMessage = ProcessedMessage<PriceUpdate>;

/**
 * K線更新訊息（專用類型）
 */
export type KLineMessage = ProcessedMessage<KLine>;

/**
 * 訊息驗證器
 *
 * 🎯 資料驗證：
 * 確保接收的資料符合預期格式
 * 避免無效資料污染系統
 *
 * 💡 整合 Zod：
 * 使用專案現有的 validation utilities
 */
export type MessageValidator<T = unknown> = (
  data: unknown,
) => { valid: true; data: T } | { valid: false; error: string };

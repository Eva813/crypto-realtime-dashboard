/**
 * WebSocket 自定義錯誤類別
 *
 * 📚 學習重點：
 * 1. 自定義錯誤類別的正確寫法
 * 2. 錯誤分類與處理策略
 * 3. Error Handling 最佳實踐
 *
 * 🎯 為什麼需要自定義錯誤？
 * - 提供更多上下文資訊（時間戳、錯誤碼、可重試性等）
 * - 便於錯誤分類和處理
 * - 改善除錯體驗
 * - 支援錯誤追蹤服務（如 Sentry）
 *
 * 💡 設計模式：
 * 所有錯誤繼承自 WebSocketError 基礎類別
 * 提供統一的介面和行為
 */

import type { ConnectionType } from "./types";

/**
 * WebSocket 錯誤碼
 *
 * 📚 HTTP 風格的錯誤碼設計：
 * - 1xxx: 連接相關錯誤
 * - 2xxx: 訂閱相關錯誤
 * - 3xxx: 訊息相關錯誤
 * - 4xxx: 配置相關錯誤
 * - 5xxx: 內部錯誤
 */
export const WebSocketErrorCode = {
  // 連接錯誤 (1xxx)
  CONNECTION_FAILED: 1001,
  CONNECTION_TIMEOUT: 1002,
  CONNECTION_CLOSED: 1003,
  CONNECTION_LOST: 1004,

  // 訂閱錯誤 (2xxx)
  SUBSCRIPTION_FAILED: 2001,
  SUBSCRIPTION_TIMEOUT: 2002,
  SUBSCRIPTION_LIMIT_REACHED: 2003,
  INVALID_SYMBOL: 2004,
  DUPLICATE_SUBSCRIPTION: 2005,

  // 訊息錯誤 (3xxx)
  MESSAGE_PARSE_ERROR: 3001,
  MESSAGE_VALIDATION_ERROR: 3002,
  MESSAGE_QUEUE_FULL: 3003,

  // 配置錯誤 (4xxx)
  INVALID_CONFIG: 4001,
  INVALID_URL: 4002,

  // 內部錯誤 (5xxx)
  INTERNAL_ERROR: 5001,
  UNKNOWN_ERROR: 5999,
} as const;

export type WebSocketErrorCode =
  (typeof WebSocketErrorCode)[keyof typeof WebSocketErrorCode];

/**
 * WebSocket 錯誤基礎類別
 *
 * 📚 學習重點：
 * 繼承 Error 類別的正確寫法（處理 prototype chain）
 *
 * 💡 重要細節：
 * 1. 必須呼叫 super(message)
 * 2. 必須設定 this.name
 * 3. 必須修復 prototype（Object.setPrototypeOf）
 * 4. 必須捕獲 stack trace（Error.captureStackTrace）
 *
 * 🎯 為什麼這些步驟很重要？
 * - TypeScript 編譯後可能破壞 prototype chain
 * - instanceof 檢查才能正確運作
 * - stack trace 才能正確顯示
 */
export class WebSocketError extends Error {
  /** 錯誤碼 */
  public readonly code: WebSocketErrorCode;

  /** 錯誤發生時間 */
  public readonly timestamp: number;

  /** 是否可重試 */
  public readonly retryable: boolean;

  /** 連接類型（如果相關） */
  public readonly connectionType?: ConnectionType;

  /** 額外的上下文資訊 */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: WebSocketErrorCode = WebSocketErrorCode.UNKNOWN_ERROR,
    options: {
      retryable?: boolean;
      connectionType?: ConnectionType;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message);

    // 設定錯誤名稱（顯示在 stack trace 中）
    this.name = "WebSocketError";

    // 設定錯誤屬性
    this.code = code;
    this.timestamp = Date.now();
    this.retryable = options.retryable ?? this.isRetryableByDefault(code);
    this.connectionType = options.connectionType;
    this.context = options.context;

    // 保留原始錯誤（Error Cause Chaining）
    if (options.cause) {
      this.cause = options.cause;
    }

    // 修復 prototype chain（TypeScript 繼承 Error 的已知問題）
    Object.setPrototypeOf(this, WebSocketError.prototype);
  }

  /**
   * 根據錯誤碼判斷是否可重試
   *
   * 💡 重試策略：
   * - 網路錯誤：可重試（暫時性問題）
   * - 配置錯誤：不可重試（需要修改程式碼）
   * - 訂閱限制：不可重試（需要減少訂閱）
   */
  private isRetryableByDefault(code: WebSocketErrorCode): boolean {
    const retryableCodes = [
      WebSocketErrorCode.CONNECTION_FAILED,
      WebSocketErrorCode.CONNECTION_TIMEOUT,
      WebSocketErrorCode.CONNECTION_LOST,
      WebSocketErrorCode.SUBSCRIPTION_TIMEOUT,
    ];
    return retryableCodes.includes(code);
  }

  /**
   * 轉換成 JSON 格式（用於日誌記錄或錯誤追蹤服務）
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      retryable: this.retryable,
      connectionType: this.connectionType,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * 產生使用者友善的錯誤訊息
   *
   * 💡 最佳實踐：
   * - 技術錯誤訊息（this.message）：給開發者看
   * - 友善錯誤訊息（getUserMessage）：給使用者看
   */
  getUserMessage(): string {
    switch (this.code) {
      case WebSocketErrorCode.CONNECTION_FAILED:
        return "無法連接到伺服器，請檢查網路連接";
      case WebSocketErrorCode.CONNECTION_TIMEOUT:
        return "連接超時，請稍後再試";
      case WebSocketErrorCode.SUBSCRIPTION_LIMIT_REACHED:
        return "已達訂閱上限，請減少關注的幣種";
      case WebSocketErrorCode.INVALID_SYMBOL:
        return "無效的幣種符號";
      default:
        return "發生未知錯誤，請重新整理頁面";
    }
  }
}

/**
 * 連接錯誤
 *
 * 🎯 使用場景：
 * - 無法建立 WebSocket 連接
 * - 連接突然中斷
 * - 連接超時
 */
export class ConnectionError extends WebSocketError {
  constructor(
    message: string,
    code: WebSocketErrorCode = WebSocketErrorCode.CONNECTION_FAILED,
    options?: {
      retryable?: boolean;
      connectionType?: ConnectionType;
      context?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, code, options);
    this.name = "ConnectionError";
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * 訂閱錯誤
 *
 * 🎯 使用場景：
 * - 訂閱失敗
 * - 無效的 symbol
 * - 達到訂閱限制
 */
export class SubscriptionError extends WebSocketError {
  /** 相關的 symbol */
  public readonly symbol?: string;

  /** 相關的 stream name */
  public readonly streamName?: string;

  constructor(
    message: string,
    code: WebSocketErrorCode = WebSocketErrorCode.SUBSCRIPTION_FAILED,
    options?: {
      symbol?: string;
      streamName?: string;
      retryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, code, {
      retryable: options?.retryable,
      context: options?.context,
      cause: options?.cause,
    });

    this.name = "SubscriptionError";
    this.symbol = options?.symbol;
    this.streamName = options?.streamName;

    Object.setPrototypeOf(this, SubscriptionError.prototype);
  }
}

/**
 * 訊息處理錯誤
 *
 * 🎯 使用場景：
 * - 無法解析訊息
 * - 訊息格式驗證失敗
 * - 訊息佇列已滿
 */
export class MessageError extends WebSocketError {
  /** 原始訊息資料 */
  public readonly rawMessage?: unknown;

  constructor(
    message: string,
    code: WebSocketErrorCode = WebSocketErrorCode.MESSAGE_PARSE_ERROR,
    options?: {
      rawMessage?: unknown;
      retryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, code, {
      retryable: options?.retryable,
      context: options?.context,
      cause: options?.cause,
    });

    this.name = "MessageError";
    this.rawMessage = options?.rawMessage;

    Object.setPrototypeOf(this, MessageError.prototype);
  }
}

/**
 * 配置錯誤
 *
 * 🎯 使用場景：
 * - 無效的配置參數
 * - 缺少必要配置
 *
 * 💡 特性：
 * 配置錯誤通常不可重試（需要修改程式碼）
 */
export class ConfigError extends WebSocketError {
  constructor(
    message: string,
    code: WebSocketErrorCode = WebSocketErrorCode.INVALID_CONFIG,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, code, {
      retryable: false, // 配置錯誤不可重試
      context: options?.context,
      cause: options?.cause,
    });

    this.name = "ConfigError";
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * 錯誤工廠函數
 *
 * 🎯 使用場景：
 * 根據錯誤碼快速建立對應的錯誤實例
 *
 * 💡 設計模式：Factory Pattern
 * 將錯誤建立邏輯集中管理
 *
 * @example
 * const error = createWebSocketError(
 *   WebSocketErrorCode.CONNECTION_FAILED,
 *   'Failed to connect to wss://stream.binance.com',
 *   { connectionType: 'public' }
 * )
 */
export function createWebSocketError(
  code: WebSocketErrorCode,
  message: string,
  options?: {
    symbol?: string;
    streamName?: string;
    connectionType?: ConnectionType;
    rawMessage?: unknown;
    context?: Record<string, unknown>;
    cause?: Error;
  },
): WebSocketError {
  // 根據錯誤碼判斷錯誤類型
  if (code >= 1000 && code < 2000) {
    return new ConnectionError(message, code, options);
  }

  if (code >= 2000 && code < 3000) {
    return new SubscriptionError(message, code, options);
  }

  if (code >= 3000 && code < 4000) {
    return new MessageError(message, code, options);
  }

  if (code >= 4000 && code < 5000) {
    return new ConfigError(message, code, options);
  }

  return new WebSocketError(message, code, options);
}

/**
 * 錯誤處理輔助函數
 *
 * 📚 學習重點：
 * 如何優雅地處理未知類型的錯誤
 *
 * @example
 * try {
 *   // ... WebSocket 操作
 * } catch (error) {
 *   const wsError = normalizeError(error)
 *   console.error(wsError.toJSON())
 * }
 */
export function normalizeError(error: unknown): WebSocketError {
  // 已經是 WebSocketError
  if (error instanceof WebSocketError) {
    return error;
  }

  // 標準 Error
  if (error instanceof Error) {
    return new WebSocketError(error.message, WebSocketErrorCode.UNKNOWN_ERROR, {
      cause: error,
    });
  }

  // 字串錯誤
  if (typeof error === "string") {
    return new WebSocketError(error, WebSocketErrorCode.UNKNOWN_ERROR);
  }

  // 其他未知類型
  return new WebSocketError(
    "An unknown error occurred",
    WebSocketErrorCode.UNKNOWN_ERROR,
    {
      context: { originalError: error },
    },
  );
}

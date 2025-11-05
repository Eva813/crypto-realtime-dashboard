/**
 * WebSocket 類型定義統一導出
 *
 * 📚 學習重點：
 * 1. 模組化設計：將類型定義分類組織
 * 2. 統一導出：提供單一入口點
 * 3. 命名空間：使用 namespace 組織相關類型
 *
 * 💡 最佳實踐：
 * - 使用 export type 而非 export（確保只導出類型）
 * - 按類別分組導出（connection, subscription, message）
 * - 提供便利的 re-export
 */

// ============================================================================
// Connection Types（連接相關類型）
// ============================================================================
export type {
  ConnectionStatus,
  ConnectionType,
  WebSocketConfig,
  ConnectionState,
  WebSocketEventType,
  WebSocketEventHandler,
  ConnectionEvent,
  ConnectionMetrics,
  ConnectionOptions,
} from "./connection.types";

// ============================================================================
// Subscription Types（訂閱相關類型）
// ============================================================================
export type {
  StreamType,
  TimeFrame,
  SubscriptionRequest,
  SubscriptionResponse,
  SubscriptionCallback,
  SubscriptionItem,
  SubscriptionManagerState,
  PriceSubscriptionParams,
  KLineSubscriptionParams,
  UnsubscribeFunction,
  SubscriptionErrorType,
  SubscriptionError,
  SubscriptionStats,
} from "./subscription.types";

// ============================================================================
// Message Types（訊息相關類型）
// ============================================================================
export type {
  RawBinanceMessage,
  ProcessedMessage,
  MessageType,
  MessageQueueItem,
  MessagePriority,
  MessageQueueConfig,
  MessageBatch,
  MessageRoute,
  MessageHandler,
  MessageFilter,
  MessageStats,
  MessageProcessResult,
  PriceMessage,
  KLineMessage,
  MessageValidator,
} from "./message.types";

// ============================================================================
// Namespace Exports（命名空間導出）
// ============================================================================

/**
 * 連接相關類型命名空間
 *
 * 💡 使用方式：
 * import { Connection } from './types'
 * const status: Connection.Status = 'connected'
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Connection {
  export type Status = import("./connection.types").ConnectionStatus;
  export type Type = import("./connection.types").ConnectionType;
  export type Config = import("./connection.types").WebSocketConfig;
  export type State = import("./connection.types").ConnectionState;
  export type EventType = import("./connection.types").WebSocketEventType;
  export type Event = import("./connection.types").ConnectionEvent;
  export type Metrics = import("./connection.types").ConnectionMetrics;
  export type Options = import("./connection.types").ConnectionOptions;
}

/**
 * 訂閱相關類型命名空間
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Subscription {
  export type Type = import("./subscription.types").StreamType;
  export type Interval = import("./subscription.types").TimeFrame;
  export type Request = import("./subscription.types").SubscriptionRequest;
  export type Response = import("./subscription.types").SubscriptionResponse;
  export type Callback<T = unknown> =
    import("./subscription.types").SubscriptionCallback<T>;
  export type Item<T = unknown> =
    import("./subscription.types").SubscriptionItem<T>;
  export type ManagerState =
    import("./subscription.types").SubscriptionManagerState;
  export type ErrorType = import("./subscription.types").SubscriptionErrorType;
  export type Error = import("./subscription.types").SubscriptionError;
  export type Stats = import("./subscription.types").SubscriptionStats;
  export type Unsubscribe = import("./subscription.types").UnsubscribeFunction;
}

/**
 * 訊息相關類型命名空間
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Message {
  export type Raw = import("./message.types").RawBinanceMessage;
  export type Processed<T = unknown> =
    import("./message.types").ProcessedMessage<T>;
  export type Type = import("./message.types").MessageType;
  export type QueueItem<T = unknown> =
    import("./message.types").MessageQueueItem<T>;
  export type Priority = import("./message.types").MessagePriority;
  export type QueueConfig = import("./message.types").MessageQueueConfig;
  export type Batch = import("./message.types").MessageBatch;
  export type Route = import("./message.types").MessageRoute;
  export type Handler<T = unknown> =
    import("./message.types").MessageHandler<T>;
  export type Filter = import("./message.types").MessageFilter;
  export type Stats = import("./message.types").MessageStats;
  export type ProcessResult = import("./message.types").MessageProcessResult;
  export type Validator<T = unknown> =
    import("./message.types").MessageValidator<T>;
}

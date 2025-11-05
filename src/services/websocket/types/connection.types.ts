/**
 * WebSocket 連接相關類型定義
 *
 * 📚 學習重點：
 * 1. TypeScript 類型系統：使用 type 和 interface 的時機
 * 2. 狀態機設計：連接狀態的流轉
 * 3. 類型安全：透過類型系統避免運行時錯誤
 *
 * 🎯 設計原則：
 * - 使用字面量類型（literal types）確保狀態值的正確性
 * - 使用 readonly 保護重要配置不被修改
 * - 使用泛型提升程式碼複用性
 */

/**
 * WebSocket 連接狀態
 *
 * 狀態流轉：
 * disconnected → connecting → connected → reconnecting → connected
 *            ↓                      ↓            ↓
 *          error                  error        error
 *
 * 💡 設計技巧：使用字面量聯合類型（union type）而非 enum
 * 優點：更好的類型推斷、更小的打包體積、更靈活的使用方式
 */
export type ConnectionStatus =
  | "disconnected" // 未連接
  | "connecting" // 連接中
  | "connected" // 已連接
  | "reconnecting" // 重連中
  | "error"; // 錯誤狀態

/**
 * 連接類型
 *
 * 💡 擴展性設計：
 * - 當前只使用 'public'（公開市場流）
 * - 預留 'user' 類型用於未來的私有用戶流（User Data Stream）
 * - 使用模板字面量類型支援動態用戶連接
 */
export type ConnectionType = "public" | `user_${string}`;

/**
 * WebSocket 連接配置
 *
 * 📚 學習重點：
 * - readonly 修飾符：確保配置不被意外修改
 * - 可選屬性：使用 ? 提供靈活性
 * - 合理的預設值設計
 */
export interface WebSocketConfig {
  /** WebSocket 伺服器 URL */
  readonly url: string;

  /** 連接類型（public: 公開市場流, user_*: 私有用戶流） */
  readonly type: ConnectionType;

  /** 連接超時時間（毫秒），預設 10000ms */
  readonly connectionTimeout?: number;

  /** 心跳檢測間隔（毫秒），預設 5000ms */
  readonly heartbeatInterval?: number;

  /** 心跳超時閾值（毫秒），預設 10000ms */
  readonly heartbeatTimeout?: number;

  /** 是否自動重連，預設 true */
  readonly autoReconnect?: boolean;

  /** 最大重連次數，預設 5 次 */
  readonly maxReconnectAttempts?: number;

  /** 是否啟用詳細日誌，預設 false */
  readonly debug?: boolean;
}

/**
 * 連接狀態詳細資訊
 *
 * 💡 設計模式：Rich Domain Model
 * 不僅包含狀態，還包含與狀態相關的元數據
 */
export interface ConnectionState {
  /** 當前連接狀態 */
  status: ConnectionStatus;

  /** 錯誤訊息（如果有） */
  error?: string;

  /** 錯誤發生時間戳 */
  errorTimestamp?: number;

  /** 連接建立時間戳 */
  connectedAt?: number;

  /** 最後一次收到訊息的時間戳 */
  lastMessageAt?: number;

  /** 當前重連次數 */
  reconnectAttempts: number;

  /** 是否正在重連 */
  isReconnecting: boolean;
}

/**
 * WebSocket 事件類型
 *
 * 📚 學習重點：
 * - 事件驅動架構（Event-Driven Architecture）
 * - Observer 模式的 TypeScript 實現
 */
export type WebSocketEventType =
  | "open" // 連接建立
  | "close" // 連接關閉
  | "error" // 發生錯誤
  | "message" // 收到訊息
  | "reconnect"; // 重連開始

/**
 * WebSocket 事件處理器
 *
 * 💡 泛型應用：
 * 不同事件類型對應不同的資料結構
 */
export type WebSocketEventHandler<T = unknown> = (data: T) => void;

/**
 * 連接事件
 *
 * 🎯 設計模式：Command Pattern
 * 將事件資訊封裝成物件，便於傳遞和處理
 */
export interface ConnectionEvent {
  /** 事件類型 */
  type: WebSocketEventType;

  /** 時間戳 */
  timestamp: number;

  /** 連接類型 */
  connectionType: ConnectionType;

  /** 事件資料（可選） */
  data?: unknown;

  /** 錯誤訊息（如果是錯誤事件） */
  error?: string;
}

/**
 * 連接指標（效能監控用）
 *
 * 📊 交易所級別監控：
 * - 延遲（Latency）：衡量資料新鮮度
 * - 訊息速率（Message Rate）：監控資料流量
 * - 連接品質（Connection Quality）：綜合評估
 *
 * 💡 最佳實踐：
 * 在交易所系統中，連接品質直接影響交易決策
 * 需要持續監控並在品質下降時發出警告
 */
export interface ConnectionMetrics {
  /** 平均延遲（毫秒） */
  averageLatency: number;

  /** 最大延遲（毫秒） */
  maxLatency: number;

  /** 最小延遲（毫秒） */
  minLatency: number;

  /** 訊息接收速率（訊息數/秒） */
  messageRate: number;

  /** 總接收訊息數 */
  totalMessages: number;

  /** 連接品質評分（0-100） */
  qualityScore: number;

  /** 最後更新時間 */
  lastUpdated: number;
}

/**
 * 連接選項（內部使用）
 *
 * ⚙️ 進階配置：
 * 這些選項通常不對外暴露，用於內部精細控制
 */
export interface ConnectionOptions extends WebSocketConfig {
  /** 參照計數初始值 */
  initialRefCount?: number;

  /** 延遲斷線時間（毫秒），用於處理 StrictMode */
  disconnectDelay?: number;

  /** 是否啟用訊息佇列 */
  enableMessageQueue?: boolean;

  /** 訊息佇列批次大小 */
  queueBatchSize?: number;
}

/**
 * WebSocket 連接封裝
 *
 * 📚 學習重點：
 * 1. 原生 WebSocket API 的封裝
 * 2. Promise 化的非同步操作
 * 3. 事件驅動架構（Event-Driven Architecture）
 * 4. 連接生命週期管理
 *
 * 🎯 為什麼需要封裝 WebSocket？
 *
 * 原生 WebSocket API 的問題：
 * 1. 回調地獄：onopen, onclose, onerror, onmessage
 * 2. 沒有 Promise：無法使用 async/await
 * 3. 錯誤處理複雜：需要在多個回調中處理
 * 4. 狀態管理困難：readyState 不夠語義化
 * 5. 沒有重連機制：需要手動實作
 *
 * 封裝後的優勢：
 * ✅ Promise 化：支援 async/await
 * ✅ 事件系統：統一的事件處理
 * ✅ 狀態追蹤：詳細的連接狀態
 * ✅ 錯誤處理：統一的錯誤處理機制
 * ✅ 生命週期：清晰的連接生命週期
 *
 * 💡 設計模式：
 * - Facade Pattern：簡化 WebSocket API
 * - Observer Pattern：事件訂閱機制
 * - State Pattern：連接狀態管理
 */

import { CONNECTION_TIMEOUT } from "../constants";
import type {
  WebSocketConfig,
  ConnectionState,
  ConnectionStatus,
  WebSocketEventType,
  ConnectionEvent,
} from "../types";
import { ConnectionError, WebSocketErrorCode } from "../errors";
import { HealthMonitor } from "./HealthMonitor";
import { ExponentialBackoffStrategy } from "../strategy/ReconnectStrategy";
import type { ReconnectStrategy } from "../strategy/ReconnectStrategy";

/**
 * 事件監聽器類型
 */
type EventListener = (event: ConnectionEvent) => void;

/**
 * WebSocket 連接類別
 *
 * 🎯 職責：
 * 1. 管理 WebSocket 連接生命週期
 * 2. 提供事件訂閱機制
 * 3. 處理連接錯誤
 * 4. 整合健康監控
 * 5. 整合重連策略
 *
 * 💡 使用範例：
 * ```typescript
 * const connection = new WebSocketConnection({
 *   url: 'wss://stream.binance.com:9443/ws',
 *   type: 'public'
 * })
 *
 * connection.on('open', () => console.log('Connected'))
 * connection.on('message', (event) => console.log('Message:', event.data))
 * connection.on('error', (event) => console.error('Error:', event.error))
 *
 * await connection.connect()
 * ```
 */
export class WebSocketConnection {
  /** 原生 WebSocket 實例 */
  private ws: WebSocket | null = null;

  /** 連接配置 */
  private readonly config: Required<WebSocketConfig>;

  /** 連接狀態 */
  private state: ConnectionState;

  /** 事件監聽器 */
  private listeners = new Map<WebSocketEventType, Set<EventListener>>();

  /** 健康監控器 */
  private healthMonitor: HealthMonitor;

  /** 重連策略 */
  private reconnectStrategy: ReconnectStrategy;

  /** 連接超時定時器 */
  private connectionTimeout: number | null = null;

  /** 是否手動關閉（不觸發重連） */
  private isManualClose = false;

  /** 連接 Promise（用於 async/await） */
  private connectPromise: Promise<void> | null = null;

  /** 連接 Promise 的 resolve 函數 */
  private connectResolve: (() => void) | null = null;

  /** 連接 Promise 的 reject 函數 */
  private connectReject: ((error: Error) => void) | null = null;

  constructor(config: WebSocketConfig) {
    // 合併配置（填入預設值）
    this.config = {
      url: config.url,
      type: config.type,
      connectionTimeout: config.connectionTimeout ?? CONNECTION_TIMEOUT,
      heartbeatInterval: config.heartbeatInterval ?? 5000,
      heartbeatTimeout: config.heartbeatTimeout ?? 10000,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      debug: config.debug ?? false,
    };

    // 初始化狀態
    this.state = {
      status: "disconnected",
      reconnectAttempts: 0,
      isReconnecting: false,
    };

    // 初始化健康監控器
    this.healthMonitor = new HealthMonitor();

    // 初始化重連策略
    this.reconnectStrategy = new ExponentialBackoffStrategy();

    // 設定心跳超時回調
    this.healthMonitor.onHeartbeatTimeout(() => {
      this.handleHeartbeatTimeout();
    });

    this.log("WebSocketConnection initialized", { config: this.config });
  }

  // ============================================================================
  // 連接管理
  // ============================================================================

  /**
   * 建立連接
   *
   * 🎯 Promise 化的連接方法
   * 支援 async/await 語法
   *
   * 📚 連接流程：
   * 1. 檢查當前狀態
   * 2. 建立 WebSocket 實例
   * 3. 設定事件處理器
   * 4. 啟動連接超時計時器
   * 5. 等待連接建立（onopen）或失敗（onerror）
   *
   * @returns Promise，連接成功時 resolve
   * @throws {ConnectionError} 連接失敗時 reject
   *
   * @example
   * try {
   *   await connection.connect()
   *   console.log('Connected successfully')
   * } catch (error) {
   *   console.error('Connection failed:', error)
   * }
   */
  async connect(): Promise<void> {
    // 如果已經在連接中，返回現有的 Promise
    if (this.connectPromise) {
      return this.connectPromise;
    }

    // 如果已經連接，直接返回
    if (this.state.status === "connected") {
      this.log("Already connected");
      return Promise.resolve();
    }

    this.log("Starting connection to", this.config.url);

    // 建立 Promise
    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        // 更新狀態
        this.updateState({ status: "connecting" });

        // 建立 WebSocket 實例
        this.ws = new WebSocket(this.config.url);

        // 設定事件處理器
        this.setupEventHandlers();

        // 啟動連接超時計時器
        this.startConnectionTimeout();
      } catch (error) {
        this.handleConnectionError(error);
        reject(error);
      }
    });

    return this.connectPromise;
  }

  /**
   * 設定 WebSocket 事件處理器
   *
   * 📚 原生 WebSocket 事件：
   * - onopen: 連接建立
   * - onmessage: 收到訊息
   * - onerror: 發生錯誤
   * - onclose: 連接關閉
   *
   * 💡 設計重點：
   * - 統一的事件處理流程
   * - 詳細的日誌記錄
   * - 狀態同步更新
   * - 錯誤資訊保留
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    /**
     * 連接建立事件
     *
     * 🎯 觸發時機：WebSocket 握手成功
     *
     * 處理流程：
     * 1. 清除連接超時計時器
     * 2. 更新連接狀態
     * 3. 重置重連策略
     * 4. 啟動健康監控
     * 5. 觸發 open 事件
     * 6. resolve 連接 Promise
     */
    this.ws.onopen = () => {
      this.log("✅ Connection established");

      // 清除超時計時器
      this.clearConnectionTimeout();

      // 更新狀態
      this.updateState({
        status: "connected",
        connectedAt: Date.now(),
        error: undefined,
        errorTimestamp: undefined,
        reconnectAttempts: 0,
        isReconnecting: false,
      });

      // 重置重連策略
      this.reconnectStrategy.reset();

      // 啟動健康監控
      this.healthMonitor.start();

      // 觸發事件
      this.emitEvent({
        type: "open",
        timestamp: Date.now(),
        connectionType: this.config.type,
      });

      // resolve Promise
      if (this.connectResolve) {
        this.connectResolve();
        this.connectPromise = null;
        this.connectResolve = null;
        this.connectReject = null;
      }
    };

    /**
     * 收到訊息事件
     *
     * 🎯 觸發時機：收到 WebSocket 訊息
     *
     * 處理流程：
     * 1. 記錄到健康監控器
     * 2. 觸發 message 事件
     * 3. 將資料傳遞給外部處理器
     */
    this.ws.onmessage = (event: MessageEvent) => {
      // 記錄收到訊息（用於心跳檢測）
      this.healthMonitor.recordMessage();

      // 更新最後訊息時間
      this.updateState({
        lastMessageAt: Date.now(),
      });

      // 觸發事件（將原始資料傳遞出去）
      this.emitEvent({
        type: "message",
        timestamp: Date.now(),
        connectionType: this.config.type,
        data: event.data,
      });
    };

    /**
     * 錯誤事件
     *
     * 🎯 觸發時機：
     * - 連接失敗
     * - 網路錯誤
     * - 協議錯誤
     *
     * ⚠️ 注意：WebSocket API 不提供詳細錯誤資訊
     * 只能知道「發生錯誤」，但不知道具體是什麼錯誤
     * 詳細資訊通常在 onclose 事件中
     */
    this.ws.onerror = () => {
      this.log("❌ WebSocket error occurred", {
        readyState: this.ws?.readyState,
        timestamp: Date.now(),
      });

      // 更新狀態
      this.updateState({
        error: "WebSocket error occurred",
        errorTimestamp: Date.now(),
      });

      // 記錄錯誤
      this.healthMonitor.recordError();

      // 觸發事件
      this.emitEvent({
        type: "error",
        timestamp: Date.now(),
        connectionType: this.config.type,
        error: "WebSocket error occurred",
      });
    };

    /**
     * 連接關閉事件
     *
     * 🎯 觸發時機：
     * - 正常關閉（呼叫 close()）
     * - 異常斷線（網路問題、伺服器關閉等）
     *
     * 📚 CloseEvent 屬性：
     * - code: 關閉碼（1000-4999）
     * - reason: 關閉原因（字串）
     * - wasClean: 是否乾淨關閉
     *
     * 💡 常見關閉碼：
     * - 1000: 正常關閉
     * - 1001: 端點離開
     * - 1006: 異常關閉（網路問題，最常見）
     * - 1008: 違反策略
     * - 1011: 伺服器錯誤
     */
    this.ws.onclose = (event: CloseEvent) => {
      this.log("Connection closed", {
        code: event.code,
        reason: event.reason || "No reason provided",
        wasClean: event.wasClean,
      });

      // 清除超時計時器
      this.clearConnectionTimeout();

      // 停止健康監控
      this.healthMonitor.stop();

      // 更新狀態
      this.updateState({
        status: "disconnected",
        error: event.reason || `Connection closed (code: ${event.code})`,
        errorTimestamp: Date.now(),
      });

      // 觸發事件
      this.emitEvent({
        type: "close",
        timestamp: Date.now(),
        connectionType: this.config.type,
        data: {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        },
      });

      // reject Promise（如果還在連接中）
      if (this.connectReject) {
        this.connectReject(
          new ConnectionError(
            `Connection closed: ${event.reason || "Unknown reason"}`,
            WebSocketErrorCode.CONNECTION_CLOSED,
          ),
        );
        this.connectPromise = null;
        this.connectResolve = null;
        this.connectReject = null;
      }

      // 清空 WebSocket 實例
      this.ws = null;

      // 處理重連（如果不是手動關閉）
      if (!this.isManualClose && this.config.autoReconnect) {
        this.scheduleReconnect();
      }

      // 重置手動關閉標記
      this.isManualClose = false;
    };
  }

  /**
   * 啟動連接超時計時器
   *
   * 🎯 防止連接一直卡在 CONNECTING 狀態
   *
   * 超時後：
   * 1. 關閉 WebSocket
   * 2. 觸發錯誤
   * 3. reject Promise
   */
  private startConnectionTimeout(): void {
    this.connectionTimeout = setTimeout(() => {
      if (this.state.status === "connecting") {
        this.log("⏰ Connection timeout");

        const error = new ConnectionError(
          "Connection timeout",
          WebSocketErrorCode.CONNECTION_TIMEOUT,
        );

        // 關閉 WebSocket
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }

        // reject Promise
        if (this.connectReject) {
          this.connectReject(error);
          this.connectPromise = null;
          this.connectResolve = null;
          this.connectReject = null;
        }

        // 更新狀態
        this.updateState({
          status: "disconnected",
          error: "Connection timeout",
          errorTimestamp: Date.now(),
        });
      }
    }, this.config.connectionTimeout);
  }

  /**
   * 清除連接超時計時器
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * 處理心跳超時
   *
   * 🎯 靜默斷線檢測：
   * 如果超過閾值沒收到訊息，主動重連
   */
  private handleHeartbeatTimeout(): void {
    this.log("⚠️ Heartbeat timeout detected, reconnecting...");

    // 記錄錯誤
    this.healthMonitor.recordError();

    // 關閉現有連接（觸發重連）
    this.disconnect();
  }

  /**
   * 關閉連接
   *
   * @param code - 關閉碼（預設 1000）
   * @param reason - 關閉原因
   */
  disconnect(code = 1000, reason = "Normal closure"): void {
    this.log("Disconnecting...", { code, reason });

    // 標記為手動關閉（不觸發重連）
    this.isManualClose = true;

    // 清除超時計時器
    this.clearConnectionTimeout();

    // 停止健康監控
    this.healthMonitor.stop();

    // 關閉 WebSocket
    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    // 更新狀態
    this.updateState({
      status: "disconnected",
    });
  }

  // ============================================================================
  // 重連管理
  // ============================================================================

  /**
   * 排程重連
   *
   * 🎯 使用重連策略決定延遲時間
   */
  private scheduleReconnect(): void {
    const attempt = this.state.reconnectAttempts;

    // 檢查是否超過最大重連次數
    if (!this.reconnectStrategy.shouldRetry(attempt)) {
      this.log("❌ Max reconnect attempts reached, giving up");

      this.updateState({
        status: "disconnected",
        error: "Max reconnect attempts reached",
        errorTimestamp: Date.now(),
        isReconnecting: false,
      });

      return;
    }

    // 獲取延遲時間
    const delay = this.reconnectStrategy.getDelay(attempt);

    this.log(`⏰ Reconnecting in ${delay}ms (attempt ${attempt + 1})`);

    // 更新狀態
    this.updateState({
      status: "reconnecting",
      isReconnecting: true,
      reconnectAttempts: attempt + 1,
    });

    // 排程重連
    setTimeout(() => {
      this.log("🔄 Attempting reconnect...");

      // 觸發重連事件
      this.emitEvent({
        type: "reconnect",
        timestamp: Date.now(),
        connectionType: this.config.type,
        data: {
          attempt: attempt + 1,
          delay,
        },
      });

      // 重新連接
      this.connect().catch((error) => {
        this.log("❌ Reconnect failed:", error);
        // 失敗會觸發 onclose，進而再次排程重連
      });
    }, delay);
  }

  // ============================================================================
  // 訊息發送
  // ============================================================================

  /**
   * 發送訊息
   *
   * @param data - 要發送的資料
   * @throws {ConnectionError} 連接未建立
   *
   * @example
   * connection.send(JSON.stringify({
   *   method: 'SUBSCRIBE',
   *   params: ['btcusdt@ticker']
   * }))
   */
  send(data: string | ArrayBuffer | Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new ConnectionError(
        "Cannot send message: connection not open",
        WebSocketErrorCode.CONNECTION_LOST,
      );
    }

    this.ws.send(data);
  }

  // ============================================================================
  // 事件系統
  // ============================================================================

  /**
   * 註冊事件監聽器
   *
   * @param event - 事件類型
   * @param listener - 監聽器函數
   * @returns 取消監聽函數
   *
   * @example
   * const unsubscribe = connection.on('message', (event) => {
   *   console.log('Received:', event.data)
   * })
   *
   * // 取消監聽
   * unsubscribe()
   */
  on(event: WebSocketEventType, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);

    // 返回取消監聽函數
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * 取消事件監聽器
   *
   * @param event - 事件類型
   * @param listener - 監聽器函數
   */
  off(event: WebSocketEventType, listener: EventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 觸發事件
   *
   * @param event - 連接事件
   */
  private emitEvent(event: ConnectionEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          this.log("Error in event listener:", error);
        }
      });
    }
  }

  // ============================================================================
  // 狀態管理
  // ============================================================================

  /**
   * 更新連接狀態
   *
   * @param updates - 狀態更新
   */
  private updateState(updates: Partial<ConnectionState>): void {
    this.state = {
      ...this.state,
      ...updates,
    };
  }

  /**
   * 獲取連接狀態
   *
   * @returns 當前連接狀態（副本）
   */
  getState(): Readonly<ConnectionState> {
    return { ...this.state };
  }

  /**
   * 獲取連接狀態（簡化版）
   */
  getStatus(): ConnectionStatus {
    return this.state.status;
  }

  /**
   * 判斷是否已連接
   */
  isConnected(): boolean {
    return this.state.status === "connected";
  }

  /**
   * 獲取健康監控器
   */
  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  // ============================================================================
  // 錯誤處理
  // ============================================================================

  /**
   * 處理連接錯誤
   *
   * @param error - 錯誤物件
   */
  private handleConnectionError(error: unknown): void {
    this.log("Connection error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    this.updateState({
      status: "disconnected",
      error: errorMessage,
      errorTimestamp: Date.now(),
    });

    this.healthMonitor.recordError();
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 日誌輸出
   *
   * 💡 只在 debug 模式下輸出
   *
   * @param message - 日誌訊息
   * @param data - 額外資料
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      const prefix = `[WebSocketConnection:${this.config.type}]`;
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  /**
   * 銷毀連接
   *
   * 🎯 清理所有資源
   */
  destroy(): void {
    this.log("Destroying connection");

    // 關閉連接
    this.disconnect();

    // 清空事件監聽器
    this.listeners.clear();

    // 停止健康監控
    this.healthMonitor.stop();

    // 清除超時計時器
    this.clearConnectionTimeout();
  }
}

/**
 * WebSocket 連接池
 *
 * 📚 學習重點：
 * 1. 連接池模式（Connection Pool Pattern）
 * 2. 資源複用與管理
 * 3. 多連接協調
 * 4. 擴展性設計
 *
 * 🎯 為什麼需要連接池？
 *
 * 單一連接的限制：
 * 1. Binance 限制每個連接最多 1024 個訂閱
 * 2. 公開市場流和私有用戶流需要不同的連接
 * 3. 單點故障：一個連接斷線影響所有訂閱
 *
 * 連接池的優勢：
 * ✅ 支援大量訂閱（超過 1024 個）
 * ✅ 分離不同類型的資料流
 * ✅ 提升可靠性（故障隔離）
 * ✅ 負載均衡
 *
 * 💡 交易所場景：
 * - 公開市場流：所有用戶共享（價格、K線、深度）
 * - 私有用戶流：每個用戶獨立（訂單、資產）
 * - 需要不同的連接管理策略
 *
 * 🎯 當前設計：
 * - 第一版：只使用公開市場流（一個連接）
 * - 預留擴展：支援私有用戶流（多個連接）
 * - 架構可擴展：輕鬆加入新連接類型
 */

import { BINANCE_WS_ENDPOINTS } from "../constants";
import type { ConnectionType, WebSocketConfig } from "../types";
import { WebSocketConnection } from "./WebSocketConnection";
import { ConfigError, WebSocketErrorCode } from "../errors";

/**
 * 連接池配置
 */
export interface ConnectionPoolConfig {
  /** 是否啟用除錯日誌 */
  debug?: boolean;

  /** 公開市場流配置（可選，使用預設值） */
  publicConfig?: Partial<WebSocketConfig>;

  /** 私有用戶流配置（未來使用） */
  userConfig?: Partial<WebSocketConfig>;
}

/**
 * 連接池統計
 */
export interface ConnectionPoolStats {
  /** 總連接數 */
  totalConnections: number;

  /** 活躍連接數 */
  activeConnections: number;

  /** 閒置連接數 */
  idleConnections: number;

  /** 公開市場流連接數 */
  publicConnections: number;

  /** 私有用戶流連接數 */
  userConnections: number;

  /** 最後更新時間 */
  lastUpdated: number;
}

/**
 * WebSocket 連接池
 *
 * 🎯 職責：
 * 1. 管理多個 WebSocket 連接
 * 2. 提供連接的取得與釋放
 * 3. 監控連接狀態
 * 4. 故障隔離
 *
 * 💡 設計模式：
 * - Object Pool Pattern：連接複用
 * - Factory Pattern：連接建立
 * - Singleton Pattern：每種類型一個連接（當前實作）
 *
 * 📚 學習重點：
 * 理解如何設計可擴展的連接管理系統
 * 平衡「當前需求」與「未來擴展」
 */
export class ConnectionPool {
  /** 連接池（儲存所有連接） */
  private connections = new Map<string, WebSocketConnection>();

  /** 配置 */
  private config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      publicConfig: config.publicConfig,
      userConfig: config.userConfig,
    };

    this.log("ConnectionPool initialized");
  }

  // ============================================================================
  // 公開市場流連接（當前使用）
  // ============================================================================

  /**
   * 獲取公開市場流連接
   *
   * 🎯 當前實作：單例模式
   * - 第一次呼叫：建立連接
   * - 後續呼叫：返回現有連接
   *
   * 💡 為什麼使用單例？
   * - 公開市場資料是全域共享的
   * - 多個連接會浪費資源
   * - 一個連接足以處理當前專案的訂閱需求（< 100 個）
   *
   * 📚 未來擴展：
   * 如果訂閱數超過 1024，可以建立多個公開市場流連接
   * 使用負載均衡策略分配訂閱
   *
   * @returns 公開市場流連接
   *
   * @example
   * const connection = pool.getPublicConnection()
   * await connection.connect()
   * connection.on('message', (event) => {
   *   console.log('Market data:', event.data)
   * })
   */
  getPublicConnection(): WebSocketConnection {
    const connectionKey = "public";

    // 檢查是否已存在
    if (this.connections.has(connectionKey)) {
      this.log("Returning existing public connection");
      return this.connections.get(connectionKey)!;
    }

    this.log("Creating new public connection");

    // 建立新連接
    const config: WebSocketConfig = {
      url: BINANCE_WS_ENDPOINTS.PUBLIC_STREAM,
      type: "public",
      debug: this.config.debug,
      ...this.config.publicConfig,
    };

    const connection = new WebSocketConnection(config);

    // 儲存到連接池
    this.connections.set(connectionKey, connection);

    // 監聽連接事件（用於統計和除錯）
    this.setupConnectionMonitoring(connection, connectionKey);

    return connection;
  }

  // ============================================================================
  // 私有用戶流連接（預留擴展）
  // ============================================================================

  /**
   * 獲取私有用戶流連接
   *
   * 🔮 未來擴展功能（第二階段學習）
   *
   * 📚 使用場景：
   * - 用戶訂單更新
   * - 帳戶餘額變動
   * - 交易通知
   *
   * 💡 實作重點：
   * 1. 需要先通過 REST API 獲取 listenKey
   * 2. listenKey 有效期 60 分鐘，需要定期續期
   * 3. 連接 URL：wss://stream.binance.com:9443/ws/{listenKey}
   * 4. 每個用戶一個獨立連接
   *
   * 🎯 當前狀態：
   * 拋出錯誤，提示功能未實作
   * 保留介面，便於未來擴展
   *
   * @param listenKey - Binance 用戶資料流 listenKey
   * @returns 私有用戶流連接
   * @throws {ConfigError} 功能未實作
   *
   * @example
   * // 未來使用方式：
   * // 1. 通過 REST API 獲取 listenKey
   * const response = await fetch('https://api.binance.com/api/v3/userDataStream', {
   *   method: 'POST',
   *   headers: { 'X-MBX-APIKEY': apiKey }
   * })
   * const { listenKey } = await response.json()
   *
   * // 2. 建立私有用戶流連接
   * const userConnection = pool.getUserConnection(listenKey)
   * await userConnection.connect()
   *
   * // 3. 訂閱用戶事件
   * userConnection.on('message', (event) => {
   *   const data = JSON.parse(event.data)
   *   if (data.e === 'executionReport') {
   *     console.log('Order update:', data)
   *   }
   * })
   *
   * // 4. 定期續期 listenKey（每 30 分鐘）
   * setInterval(async () => {
   *   await fetch(`https://api.binance.com/api/v3/userDataStream?listenKey=${listenKey}`, {
   *     method: 'PUT',
   *     headers: { 'X-MBX-APIKEY': apiKey }
   *   })
   * }, 30 * 60 * 1000)
   */
  getUserConnection(listenKey: string): WebSocketConnection {
    throw new ConfigError(
      "User data stream not implemented yet. This feature is reserved for future expansion.",
      WebSocketErrorCode.INVALID_CONFIG,
      {
        context: {
          feature: "User Data Stream",
          listenKey,
          documentation:
            "See docs/user-data-stream.md for implementation guide",
        },
      },
    );

    /*
    // 未來實作參考：
    const connectionKey = `user_${listenKey}`

    if (this.connections.has(connectionKey)) {
      return this.connections.get(connectionKey)!
    }

    const config: WebSocketConfig = {
      url: `${BINANCE_WS_ENDPOINTS.USER_STREAM}/${listenKey}`,
      type: `user_${listenKey}`,
      debug: this.config.debug,
      ...this.config.userConfig,
    }

    const connection = new WebSocketConnection(config)
    this.connections.set(connectionKey, connection)
    this.setupConnectionMonitoring(connection, connectionKey)

    return connection
    */
  }

  // ============================================================================
  // 連接監控
  // ============================================================================

  /**
   * 設定連接監控
   *
   * 🎯 監控目的：
   * - 追蹤連接狀態變化
   * - 記錄連接事件
   * - 統計連接數量
   * - 除錯和診斷
   *
   * @param connection - 要監控的連接
   * @param key - 連接鍵值
   */
  private setupConnectionMonitoring(
    connection: WebSocketConnection,
    key: string,
  ): void {
    // 監聽連接建立
    connection.on("open", () => {
      this.log(`Connection opened: ${key}`);
    });

    // 監聽連接關閉
    connection.on("close", (event) => {
      this.log(`Connection closed: ${key}`, event.data);
    });

    // 監聽連接錯誤
    connection.on("error", (event) => {
      this.log(`Connection error: ${key}`, event.error);
    });

    // 監聽重連
    connection.on("reconnect", (event) => {
      this.log(`Connection reconnecting: ${key}`, event.data);
    });
  }

  // ============================================================================
  // 連接管理
  // ============================================================================

  /**
   * 獲取指定類型的連接
   *
   * 🎯 通用方法：根據連接類型返回對應的連接
   *
   * @param type - 連接類型
   * @returns WebSocket 連接
   * @throws {ConfigError} 不支援的連接類型
   *
   * @example
   * const connection = pool.getConnection('public')
   */
  getConnection(type: ConnectionType): WebSocketConnection {
    if (type === "public") {
      return this.getPublicConnection();
    }

    // 私有用戶流（格式：user_xxxxxx）
    if (type.startsWith("user_")) {
      const listenKey = type.substring(5); // 移除 'user_' 前綴
      return this.getUserConnection(listenKey);
    }

    throw new ConfigError(
      `Unsupported connection type: ${type}`,
      WebSocketErrorCode.INVALID_CONFIG,
    );
  }

  /**
   * 檢查連接是否存在
   *
   * @param type - 連接類型
   * @returns 是否存在
   */
  hasConnection(type: ConnectionType): boolean {
    if (type === "public") {
      return this.connections.has("public");
    }

    if (type.startsWith("user_")) {
      return this.connections.has(type);
    }

    return false;
  }

  /**
   * 關閉指定連接
   *
   * @param type - 連接類型
   */
  closeConnection(type: ConnectionType): void {
    const key = type === "public" ? "public" : type;

    const connection = this.connections.get(key);
    if (connection) {
      this.log(`Closing connection: ${key}`);
      connection.disconnect();
      this.connections.delete(key);
    }
  }

  /**
   * 關閉所有連接
   *
   * 🎯 清理所有資源
   * 應用關閉時呼叫
   */
  closeAll(): void {
    this.log(`Closing all connections (${this.connections.size} total)`);

    this.connections.forEach((connection, key) => {
      this.log(`Closing connection: ${key}`);
      connection.disconnect();
    });

    this.connections.clear();
  }

  // ============================================================================
  // 統計與監控
  // ============================================================================

  /**
   * 獲取連接池統計
   *
   * @returns 連接池統計資訊
   */
  getStats(): ConnectionPoolStats {
    let activeConnections = 0;
    let publicConnections = 0;
    let userConnections = 0;

    this.connections.forEach((connection, key) => {
      if (connection.isConnected()) {
        activeConnections++;
      }

      if (key === "public") {
        publicConnections++;
      } else if (key.startsWith("user_")) {
        userConnections++;
      }
    });

    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      publicConnections,
      userConnections,
      lastUpdated: Date.now(),
    };
  }

  /**
   * 獲取所有連接的狀態
   *
   * @returns 連接狀態映射
   *
   * @example
   * const states = pool.getAllConnectionStates()
   * console.log('Public connection:', states.get('public'))
   */
  getAllConnectionStates(): Map<
    string,
    ReturnType<WebSocketConnection["getState"]>
  > {
    const states = new Map();

    this.connections.forEach((connection, key) => {
      states.set(key, connection.getState());
    });

    return states;
  }

  /**
   * 獲取連接數量
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 獲取活躍連接數量
   */
  getActiveConnectionCount(): number {
    let count = 0;
    this.connections.forEach((connection) => {
      if (connection.isConnected()) {
        count++;
      }
    });
    return count;
  }

  // ============================================================================
  // 健康檢查
  // ============================================================================

  /**
   * 執行健康檢查
   *
   * 🎯 檢查所有連接的健康狀態
   *
   * @returns 健康檢查結果
   */
  performHealthCheck(): {
    healthy: boolean;
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
    details: Array<{
      key: string;
      status: string;
      isHealthy: boolean;
      qualityScore: number;
    }>;
  } {
    const details: Array<{
      key: string;
      status: string;
      isHealthy: boolean;
      qualityScore: number;
    }> = [];

    let healthyConnections = 0;

    this.connections.forEach((connection, key) => {
      const healthCheck = connection.getHealthMonitor().performHealthCheck();

      details.push({
        key,
        status: healthCheck.status,
        isHealthy: healthCheck.isHealthy,
        qualityScore: healthCheck.qualityScore,
      });

      if (healthCheck.isHealthy) {
        healthyConnections++;
      }
    });

    return {
      healthy:
        healthyConnections === this.connections.size &&
        this.connections.size > 0,
      totalConnections: this.connections.size,
      healthyConnections,
      unhealthyConnections: this.connections.size - healthyConnections,
      details,
    };
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 日誌輸出
   *
   * @param message - 日誌訊息
   * @param data - 額外資料
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      const prefix = "[ConnectionPool]";
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  /**
   * 銷毀連接池
   *
   * 🎯 清理所有資源
   */
  destroy(): void {
    this.log("Destroying connection pool");
    this.closeAll();
  }
}

/**
 * 建立預設連接池
 *
 * 💡 工廠函數：提供便利的建立方式
 *
 * @param config - 連接池配置
 * @returns 連接池實例
 *
 * @example
 * const pool = createConnectionPool({ debug: true })
 * const connection = pool.getPublicConnection()
 */
export function createConnectionPool(
  config?: ConnectionPoolConfig,
): ConnectionPool {
  return new ConnectionPool(config);
}

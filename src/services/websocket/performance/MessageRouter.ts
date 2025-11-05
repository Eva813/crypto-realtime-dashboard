/**
 * WebSocket 訊息路由器
 *
 * 📚 學習重點：
 * 1. 路由模式（Router Pattern）
 * 2. 訊息解析與驗證
 * 3. 錯誤隔離（Error Isolation）
 * 4. 適配器模式（Adapter Pattern）
 *
 * 🎯 為什麼需要訊息路由器？
 *
 * 問題：Binance WebSocket 回傳不同類型的訊息
 * - 價格更新：{ e: '24hrMiniTicker', s: 'BTCUSDT', c: '50000', ... }
 * - K線更新：{ e: 'kline', s: 'BTCUSDT', k: { t: ..., o: ..., ... } }
 * - 訂閱響應：{ id: 1, result: null }
 * - 錯誤訊息：{ id: 1, error: { code: -1, msg: 'Invalid symbol' } }
 *
 * 挑戰：
 * 1. 需要識別訊息類型
 * 2. 需要驗證訊息格式
 * 3. 需要轉換成統一格式
 * 4. 需要路由到對應的處理器
 * 5. 需要處理錯誤訊息
 *
 * 解決方案：
 * ✅ 訊息路由器統一處理所有訊息
 * - 解析原始訊息
 * - 驗證訊息格式
 * - 轉換成標準格式
 * - 路由到正確的處理器
 * - 隔離錯誤，避免影響其他訊息
 *
 * 💡 設計模式：Chain of Responsibility
 * 訊息經過一系列處理器，每個處理器負責特定類型的訊息
 */

import { validatePriceUpdate, validateKLine } from "../../../utils/validation";
import type { PriceUpdate, KLine } from "../../../utils/validation";
import type {
  RawBinanceMessage,
  ProcessedMessage,
  MessageType,
  MessageRoute,
  MessageHandler,
} from "../types";
import { MessageError, WebSocketErrorCode } from "../errors";
import { MessageQueue } from "./MessageQueue";

/**
 * 訊息路由器類別
 *
 * 🎯 職責：
 * 1. 解析原始訊息（JSON.parse）
 * 2. 識別訊息類型（根據 'e' 欄位）
 * 3. 驗證訊息格式（使用 Zod schema）
 * 4. 轉換成標準格式（ProcessedMessage）
 * 5. 路由到對應處理器（MessageQueue 或直接回調）
 *
 * 💡 設計模式：
 * - Router Pattern：根據類型路由訊息
 * - Adapter Pattern：將 Binance 格式轉換成內部格式
 * - Template Method：定義標準處理流程
 */
export class MessageRouter {
  /** 路由表：訊息類型 → 處理器 */
  private routes = new Map<MessageType, MessageRoute>();

  /** 錯誤處理器 */
  private errorHandler?: (error: MessageError) => void;

  /** 訊息佇列（可選） */
  private messageQueue?: MessageQueue;

  constructor(messageQueue?: MessageQueue) {
    this.messageQueue = messageQueue;
    this.initializeRoutes();
  }

  // ============================================================================
  // 路由初始化
  // ============================================================================

  /**
   * 初始化路由表
   *
   * 🎯 預設路由：
   * - price: 價格更新（24hrMiniTicker）
   * - kline: K線更新
   * - trade: 成交資料（未實作）
   * - depth: 深度資料（未實作）
   *
   * 💡 擴展方式：
   * 加入新路由時，只需在此處註冊即可
   */
  private initializeRoutes(): void {
    // 價格更新路由
    this.registerRoute({
      type: "price",
      handler: this.createQueueHandler("price"),
      enableBatch: true,
      enableDedup: true,
    });

    // K線更新路由
    this.registerRoute({
      type: "kline",
      handler: this.createQueueHandler("kline"),
      enableBatch: true,
      enableDedup: true,
    });

    console.log(
      "[MessageRouter] Routes initialized:",
      Array.from(this.routes.keys()),
    );
  }

  /**
   * 建立佇列處理器
   *
   * 🎯 工廠函數：建立將訊息加入佇列的處理器
   *
   * @param type - 訊息類型
   * @returns 處理器函數
   */
  private createQueueHandler(type: MessageType): MessageHandler {
    return (message: ProcessedMessage) => {
      if (!this.messageQueue) {
        console.warn(
          "[MessageRouter] No message queue available, dropping message",
        );
        return;
      }

      // 未來可以根據 type 進行不同的處理策略
      void type;

      // 將訊息加入佇列
      this.messageQueue.enqueue(message, "NORMAL");
    };
  }

  // ============================================================================
  // 訊息路由
  // ============================================================================

  /**
   * 路由原始訊息
   *
   * 🎯 這是訊息處理的入口點
   * WebSocket onmessage 收到資料後呼叫此方法
   *
   * 📚 處理流程：
   * 1. 解析 JSON
   * 2. 識別訊息類型
   * 3. 驗證與轉換
   * 4. 路由到處理器
   * 5. 錯誤處理
   *
   * @param rawData - WebSocket 回傳的原始字串
   *
   * @example
   * ws.onmessage = (event) => {
   *   router.route(event.data)
   * }
   */
  route(rawData: string): void {
    try {
      // 1. 解析 JSON
      const rawMessage = this.parseMessage(rawData);

      // 2. 識別訊息類型
      const messageType = this.identifyMessageType(rawMessage);

      // 3. 處理特殊訊息類型
      if (messageType === "unknown") {
        this.handleUnknownMessage(rawMessage);
        return;
      }

      // 4. 驗證與轉換
      const processedMessage = this.processMessage(rawMessage, messageType);

      // 5. 路由到處理器
      this.dispatch(processedMessage);
    } catch (error) {
      this.handleError(error, rawData);
    }
  }

  /**
   * 解析訊息
   *
   * 📚 JSON.parse 的錯誤處理
   *
   * 常見錯誤：
   * - Invalid JSON: 格式錯誤
   * - Unexpected token: 字串未正確轉義
   * - Unexpected end of JSON: 訊息不完整
   *
   * @param rawData - 原始字串
   * @returns 解析後的物件
   * @throws {MessageError} 解析失敗
   */
  private parseMessage(rawData: string): RawBinanceMessage {
    try {
      return JSON.parse(rawData) as RawBinanceMessage;
    } catch (error) {
      throw new MessageError(
        "Failed to parse message",
        WebSocketErrorCode.MESSAGE_PARSE_ERROR,
        {
          rawMessage: rawData.substring(0, 200), // 只記錄前 200 字元
          cause: error as Error,
        },
      );
    }
  }

  /**
   * 識別訊息類型
   *
   * 🎯 根據訊息結構判斷類型
   *
   * Binance 訊息類型識別：
   * - 有 'e' 欄位：市場資料訊息
   *   - e === '24hrMiniTicker': 價格更新
   *   - e === 'kline': K線更新
   *   - e === 'trade': 成交資料
   *   - e === 'depthUpdate': 深度更新
   * - 有 'id' 和 'result' 欄位：訂閱響應
   * - 其他：未知類型
   *
   * @param message - 原始訊息
   * @returns 訊息類型
   */
  private identifyMessageType(message: RawBinanceMessage): MessageType {
    // 市場資料訊息（有 'e' 欄位）
    if ("e" in message && typeof message.e === "string") {
      switch (message.e) {
        case "24hrMiniTicker":
          return "price";
        case "kline":
          return "kline";
        case "trade":
          return "trade";
        case "depthUpdate":
          return "depth";
        default:
          console.warn(`[MessageRouter] Unknown event type: ${message.e}`);
          return "unknown";
      }
    }

    // 訂閱響應訊息（有 'id' 和 'result' 欄位）
    if ("id" in message && ("result" in message || "error" in message)) {
      console.log("[MessageRouter] Subscription response:", message);
      // 訂閱響應不需要路由到處理器
      return "unknown";
    }

    return "unknown";
  }

  /**
   * 處理訊息（驗證與轉換）
   *
   * 🎯 將 Binance 格式轉換成內部標準格式
   *
   * 📚 Adapter Pattern：
   * 外部格式（Binance） → 適配器（MessageRouter） → 內部格式（ProcessedMessage）
   *
   * @param rawMessage - 原始訊息
   * @param type - 訊息類型
   * @returns 處理後的訊息
   * @throws {MessageError} 驗證失敗
   */
  private processMessage(
    rawMessage: RawBinanceMessage,
    type: MessageType,
  ): ProcessedMessage {
    const receivedAt = Date.now();
    const originalTimestamp = (rawMessage.E as number) || receivedAt;
    const latency = receivedAt - originalTimestamp;

    // 根據類型進行不同的處理
    switch (type) {
      case "price":
        return this.processPriceMessage(rawMessage, receivedAt, latency);

      case "kline":
        return this.processKLineMessage(rawMessage, receivedAt, latency);

      default:
        throw new MessageError(
          `Unsupported message type: ${type}`,
          WebSocketErrorCode.MESSAGE_VALIDATION_ERROR,
        );
    }
  }

  /**
   * 處理價格訊息
   *
   * 📚 Binance 24hrMiniTicker 格式：
   * {
   *   e: '24hrMiniTicker',  // 事件類型
   *   E: 1234567890,        // 事件時間
   *   s: 'BTCUSDT',         // 幣種符號
   *   c: '50000.00',        // 收盤價（最新價）
   *   o: '49000.00',        // 開盤價
   *   h: '51000.00',        // 最高價
   *   l: '48000.00',        // 最低價
   *   v: '1000.00',         // 成交量（base asset）
   *   q: '50000000.00',     // 成交額（quote asset）
   *   P: '2.04',            // 價格變化百分比
   * }
   *
   * 💡 使用 validatePriceUpdate（Zod schema）驗證格式
   *
   * @param rawMessage - 原始訊息
   * @param receivedAt - 接收時間
   * @param latency - 延遲
   * @returns 處理後的價格訊息
   */
  private processPriceMessage(
    rawMessage: RawBinanceMessage,
    receivedAt: number,
    latency: number,
  ): ProcessedMessage<PriceUpdate> {
    // 建構 PriceUpdate 物件
    const priceData = {
      symbol: rawMessage.s as string,
      price: parseFloat(rawMessage.c as string),
      timestamp: rawMessage.E as number,
      changePercent24h: parseFloat(rawMessage.P as string),
    };

    // 使用 Zod 驗證
    const validatedData = validatePriceUpdate(priceData);

    if (!validatedData) {
      throw new MessageError(
        "Price update validation failed",
        WebSocketErrorCode.MESSAGE_VALIDATION_ERROR,
        { rawMessage },
      );
    }

    return {
      type: "price",
      symbol: validatedData.symbol,
      data: validatedData,
      timestamp: rawMessage.E as number,
      receivedAt,
      processedAt: Date.now(),
      latency,
    };
  }

  /**
   * 處理 K線訊息
   *
   * 📚 Binance kline 格式：
   * {
   *   e: 'kline',          // 事件類型
   *   E: 1234567890,       // 事件時間
   *   s: 'BTCUSDT',        // 幣種符號
   *   k: {                 // K線資料
   *     t: 1234567800000,  // 開盤時間
   *     T: 1234567860000,  // 收盤時間
   *     s: 'BTCUSDT',      // 幣種符號
   *     i: '1m',           // K線間隔
   *     f: 100,            // 第一筆成交 ID
   *     L: 200,            // 最後一筆成交 ID
   *     o: '49000.00',     // 開盤價
   *     c: '50000.00',     // 收盤價
   *     h: '51000.00',     // 最高價
   *     l: '48000.00',     // 最低價
   *     v: '1000.00',      // 成交量
   *     n: 100,            // 成交筆數
   *     x: false,          // 是否完結
   *     q: '50000000.00',  // 成交額
   *     V: '500.00',       // 主動買入成交量
   *     Q: '25000000.00',  // 主動買入成交額
   *   }
   * }
   *
   * @param rawMessage - 原始訊息
   * @param receivedAt - 接收時間
   * @param latency - 延遲
   * @returns 處理後的 K線訊息
   */
  private processKLineMessage(
    rawMessage: RawBinanceMessage,
    receivedAt: number,
    latency: number,
  ): ProcessedMessage<KLine> {
    const k = rawMessage.k as Record<string, unknown>;

    // 建構 KLine 物件
    const klineData = {
      time: Math.floor((k.t as number) / 1000), // 轉換為秒
      open: parseFloat(k.o as string),
      high: parseFloat(k.h as string),
      low: parseFloat(k.l as string),
      close: parseFloat(k.c as string),
      volume: parseFloat(k.v as string),
    };

    // 使用 Zod 驗證
    const validatedData = validateKLine(klineData);

    if (!validatedData) {
      throw new MessageError(
        "K-line validation failed",
        WebSocketErrorCode.MESSAGE_VALIDATION_ERROR,
        { rawMessage },
      );
    }

    // 提取 interval 資訊 (從 Binance k.i 欄位)
    const interval = k.i as string;

    return {
      type: "kline",
      symbol: rawMessage.s as string,
      data: validatedData,
      interval, // 添加 interval 欄位用於正確路由
      timestamp: rawMessage.E as number,
      receivedAt,
      processedAt: Date.now(),
      latency,
    };
  }

  /**
   * 分發訊息到處理器
   *
   * 🎯 根據訊息類型路由到對應的處理器
   *
   * @param message - 處理後的訊息
   */
  private dispatch(message: ProcessedMessage): void {
    const route = this.routes.get(message.type);

    if (!route) {
      console.warn(
        `[MessageRouter] No route for message type: ${message.type}`,
      );
      return;
    }

    try {
      route.handler(message);
    } catch (error) {
      console.error(
        `[MessageRouter] Error in handler for type ${message.type}:`,
        error,
      );

      if (this.errorHandler) {
        this.errorHandler(
          new MessageError(
            `Handler error for type ${message.type}`,
            WebSocketErrorCode.INTERNAL_ERROR,
            {
              rawMessage: message,
              cause: error as Error,
            },
          ),
        );
      }
    }
  }

  // ============================================================================
  // 錯誤處理
  // ============================================================================

  /**
   * 處理未知訊息
   *
   * 💡 記錄但不拋出錯誤
   * 避免一個未知訊息影響整個系統
   */
  private handleUnknownMessage(message: RawBinanceMessage): void {
    console.warn("[MessageRouter] Unknown message type:", message);
  }

  /**
   * 處理錯誤
   *
   * 🎯 錯誤隔離：
   * - 記錄錯誤
   * - 觸發錯誤處理器
   * - 不影響後續訊息處理
   *
   * @param error - 錯誤物件
   * @param rawData - 原始資料（用於除錯）
   */
  private handleError(error: unknown, rawData?: string): void {
    console.error("[MessageRouter] Error routing message:", error);

    if (this.errorHandler) {
      const messageError =
        error instanceof MessageError
          ? error
          : new MessageError(
              error instanceof Error ? error.message : "Unknown error",
              WebSocketErrorCode.INTERNAL_ERROR,
              {
                rawMessage: rawData?.substring(0, 200),
                cause: error as Error,
              },
            );

      this.errorHandler(messageError);
    }
  }

  // ============================================================================
  // 公開 API
  // ============================================================================

  /**
   * 註冊路由
   *
   * @param route - 路由配置
   */
  registerRoute(route: MessageRoute): void {
    console.log(`[MessageRouter] Registering route for type: ${route.type}`);
    this.routes.set(route.type, route);
  }

  /**
   * 取消註冊路由
   *
   * @param type - 訊息類型
   */
  unregisterRoute(type: MessageType): void {
    console.log(`[MessageRouter] Unregistering route for type: ${type}`);
    this.routes.delete(type);
  }

  /**
   * 註冊錯誤處理器
   *
   * @param handler - 錯誤處理函數
   *
   * @example
   * router.onError((error) => {
   *   console.error('Router error:', error.toJSON())
   *   // 上報到錯誤追蹤服務（如 Sentry）
   * })
   */
  onError(handler: (error: MessageError) => void): void {
    this.errorHandler = handler;
  }

  /**
   * 獲取路由統計
   *
   * @returns 路由表大小
   */
  getRouteCount(): number {
    return this.routes.size;
  }

  /**
   * 獲取所有註冊的路由類型
   */
  getRouteTypes(): MessageType[] {
    return Array.from(this.routes.keys());
  }
}

import {
  validatePriceUpdate,
  validateKLine,
  type PriceUpdate,
  type KLine,
} from "../../utils/validation";

/**
 * Mapper service (T014) - Converts Binance API messages to domain types
 * Handles data transformation and validation
 */
export class MapperService {
  /**
   * Convert Binance 24hrMiniTicker to PriceUpdate
   */
  static toBinancePriceUpdate(
    message: Record<string, unknown>,
  ): PriceUpdate | null {
    try {
      const update = {
        symbol: message.s as string,
        price: parseFloat(message.c as string),
        timestamp: message.E as number,
        changePercent24h: parseFloat(message.P as string),
      };

      // Validate against schema
      return validatePriceUpdate(update);
    } catch (error) {
      console.error("Price update validation failed:", error);
      return null;
    }
  }

  /**
   * Convert Binance kline data to KLine
   */
  static toBinanceKLine(message: Record<string, unknown>): KLine | null {
    try {
      const k = message.k as Record<string, unknown>;
      const kline = {
        time: Math.floor((k.t as number) / 1000), // Convert to seconds
        open: parseFloat(k.o as string),
        high: parseFloat(k.h as string),
        low: parseFloat(k.l as string),
        close: parseFloat(k.c as string),
        volume: parseFloat(k.v as string),
      };

      // Validate against schema
      return validateKLine(kline);
    } catch (error) {
      console.error("K-line validation failed:", error);
      return null;
    }
  }
}

/**
 * Enhanced BinanceWebSocketService (T013)
 * Manages WebSocket connection with proper error handling and validation
 */
export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelays = [1000, 2000, 4000];
  private subscribers: Map<string, (update: PriceUpdate) => void> = new Map();
  private klineSubscribers: Map<string, (kline: KLine) => void> = new Map();
  private connectionStatusCallbacks: Array<(isConnected: boolean) => void> = [];
  private subscriptionCount = 0;
  private maxSubscriptions = 100;
  private lastUpdateTime = Date.now();
  private subscriptionTopics: Set<string> = new Set();
  private isConnected = false;

  /**
   * Connect to Binance WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    try {
      const wsUrl = "wss://stream.binance.com:9443/ws";
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected successfully");
        this.reconnectAttempts = 0;
        this.isConnected = true;
        this.notifyConnectionStatus(true);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (event: Event) => {
        console.error("WebSocket error occurred:", {
          type: event.type,
          target: event.target,
          timestamp: new Date().toISOString(),
          readyState: this.ws?.readyState,
          readyStateText: this.getReadyStateText(this.ws?.readyState),
          reconnectAttempts: this.reconnectAttempts,
          url: wsUrl,
        });
        this.notifyConnectionStatus(false);
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log("WebSocket closed:", {
          code: event.code,
          reason: event.reason || "No reason provided",
          wasClean: event.wasClean,
          timestamp: new Date().toISOString(),
        });
        this.isConnected = false;
        this.notifyConnectionStatus(false);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.attemptReconnect();
    }
  }

  /**
   * Get human-readable WebSocket ready state
   */
  private getReadyStateText(readyState: number | undefined): string {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING (0)";
      case WebSocket.OPEN:
        return "OPEN (1)";
      case WebSocket.CLOSING:
        return "CLOSING (2)";
      case WebSocket.CLOSED:
        return "CLOSED (3)";
      default:
        return `UNKNOWN (${readyState})`;
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as Record<string, unknown>;

      // Handle price tick data (24hrMiniTicker)
      if (message.e === "24hrMiniTicker") {
        const priceUpdate = MapperService.toBinancePriceUpdate(message);
        if (priceUpdate) {
          const callback = this.subscribers.get(message.s as string);
          if (callback) {
            callback(priceUpdate);
          }
          this.lastUpdateTime = Date.now();
        }
      }

      // Handle K-line data
      if (message.e === "kline") {
        const kline = MapperService.toBinanceKLine(message);
        if (kline) {
          const k = message.k as Record<string, unknown>;
          const key = `${message.s as string}_${k.i as string}`;
          const callback = this.klineSubscribers.get(key);
          if (callback) {
            callback(kline);
          }
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  /**
   * Subscribe to price updates for a cryptocurrency
   */
  subscribe(
    symbol: string,
    callback: (update: PriceUpdate) => void,
  ): () => void {
    if (
      this.subscriptionCount >= this.maxSubscriptions &&
      !this.subscribers.has(symbol)
    ) {
      console.warn(`Subscription limit (${this.maxSubscriptions}) reached`);
      return () => {};
    }

    if (!this.subscribers.has(symbol)) {
      this.subscriptionCount++;
      this.sendSubscription(symbol);
    }

    this.subscribers.set(symbol, callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(symbol);
      this.subscriptionCount--;
      this.unsubscribe(symbol);
    };
  }

  /**
   * Subscribe to K-line updates
   */
  subscribeKLine(
    symbol: string,
    interval: "1h" | "4h" | "1d" | "1w",
    callback: (kline: KLine) => void,
  ): () => void {
    const key = `${symbol}_${interval}`;

    if (!this.klineSubscribers.has(key)) {
      this.sendKLineSubscription(symbol, interval);
    }

    this.klineSubscribers.set(key, callback);

    return () => {
      this.klineSubscribers.delete(key);
      this.unsubscribeKLine(symbol, interval);
    };
  }

  /**
   * Send subscription message to WebSocket
   */
  private sendSubscription(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const streamName = `${symbol.toLowerCase()}@24hrMiniTicker`;
      if (!this.subscriptionTopics.has(streamName)) {
        this.ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: [streamName],
            id: Date.now(),
          }),
        );
        this.subscriptionTopics.add(streamName);
      }
    }
  }

  /**
   * Send K-line subscription message
   *
   * 學習重點：
   * 1. Binance WebSocket API 的 K線訂閱格式為 <symbol>@kline_<interval>（注意是單數 "kline"）
   * 2. 常見錯誤：使用 "klines" 會導致訂閱失敗，無法收到任何數據
   * 3. interval 參數必須符合 Binance 支持的時間間隔（1h, 4h, 1d, 1w 等）
   */
  private sendKLineSubscription(
    symbol: string,
    interval: "1h" | "4h" | "1d" | "1w",
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // 注意：使用 @kline_ 而不是 @klines_（單數形式）
      // 範例：BTCUSDT@kline_1h
      const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
      if (!this.subscriptionTopics.has(streamName)) {
        this.ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: [streamName],
            id: Date.now(),
          }),
        );
        this.subscriptionTopics.add(streamName);
      }
    }
  }

  /**
   * Unsubscribe from price updates
   */
  private unsubscribe(symbol: string): void {
    if (
      this.ws?.readyState === WebSocket.OPEN &&
      this.subscriptionCount === 0
    ) {
      const streamName = `${symbol.toLowerCase()}@24hrMiniTicker`;
      if (this.subscriptionTopics.has(streamName)) {
        this.ws.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [streamName],
            id: Date.now(),
          }),
        );
        this.subscriptionTopics.delete(streamName);
      }
    }
  }

  /**
   * Unsubscribe from K-line updates
   *
   * 學習重點：
   * 取消訂閱時必須使用與訂閱時完全相同的 stream name
   */
  private unsubscribeKLine(
    symbol: string,
    interval: "1h" | "4h" | "1d" | "1w",
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // 保持與訂閱時相同的格式：@kline_（單數）
      const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
      if (this.subscriptionTopics.has(streamName)) {
        this.ws.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [streamName],
            id: Date.now(),
          }),
        );
        this.subscriptionTopics.delete(streamName);
      }
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelays[this.reconnectAttempts];
      this.reconnectAttempts++;

      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  /**
   * Notify connection status change
   */
  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusCallbacks.forEach((callback) => callback(connected));
  }

  /**
   * Listen to connection status changes
   */
  onConnectionStatusChange(
    callback: (isConnected: boolean) => void,
  ): () => void {
    this.connectionStatusCallbacks.push(callback);
    return () => {
      this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribers.clear();
    this.klineSubscribers.clear();
    this.subscriptionTopics.clear();
    this.subscriptionCount = 0;
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get last update time
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptionCount;
  }
}

// Singleton instance
export const binanceWebSocketService = new BinanceWebSocketService();

import type { PriceUpdate, ConnectionStatus } from "../types/index";

export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelays = [1000, 2000, 4000];
  private subscribers: Map<string, (update: PriceUpdate) => void> = new Map();
  private connectionStatusCallbacks: Array<(status: ConnectionStatus) => void> =
    [];
  private subscriptionCount = 0;
  private maxSubscriptions = 100;
  private lastUpdateTime = Date.now();

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket("wss://stream.binance.com:9443/ws");

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus(true);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = () => {
        this.notifyConnectionStatus(false, "WebSocket error occurred");
      };

      this.ws.onclose = () => {
        this.notifyConnectionStatus(false);
        this.attemptReconnect();
      };
    } catch (error) {
      this.notifyConnectionStatus(false, String(error));
      this.attemptReconnect();
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle tick (price) data
      if (message.e === "24hrMiniTicker") {
        const update: PriceUpdate = {
          symbol: message.s,
          price: parseFloat(message.c),
          timestamp: message.E,
          changePercent24h: parseFloat(message.P),
        };

        const callback = this.subscribers.get(message.s);
        if (callback) {
          callback(update);
        }
        this.lastUpdateTime = Date.now();
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

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
      if (this.subscriptionCount === 0) {
        this.unsubscribe(symbol);
      }
    };
  }

  private sendSubscription(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const streamName = `${symbol.toLowerCase()}@24hrMiniTicker`;
      this.ws.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: [streamName],
          id: Date.now(),
        }),
      );
    }
  }

  private unsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const streamName = `${symbol.toLowerCase()}@24hrMiniTicker`;
      this.ws.send(
        JSON.stringify({
          method: "UNSUBSCRIBE",
          params: [streamName],
          id: Date.now(),
        }),
      );
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelays[this.reconnectAttempts];
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    }
  }

  private notifyConnectionStatus(isConnected: boolean, error?: string): void {
    const status: ConnectionStatus = {
      isConnected,
      lastUpdated: Date.now(),
      error,
    };
    this.connectionStatusCallbacks.forEach((callback) => callback(status));
  }

  onConnectionStatusChange(
    callback: (status: ConnectionStatus) => void,
  ): () => void {
    this.connectionStatusCallbacks.push(callback);
    return () => {
      this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }
}

// Singleton instance
export const binanceWebSocketService = new BinanceWebSocketService();

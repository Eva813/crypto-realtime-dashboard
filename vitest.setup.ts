import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Mock React.act for React 19 compatibility
import React from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (React as any).act === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as any).act = (callback: () => void) => {
    callback();
  };
}

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// ============================================================================
// WebSocket Mock for Testing
// ============================================================================

/**
 * Mock WebSocket 類
 *
 * 用於測試環境，模擬 WebSocket API 行為
 * happy-dom 不提供 WebSocket 實現，所以需要自己 mock
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;

    // 模擬異步連接成功
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(_data: string | ArrayBuffer | Blob): void {
    // Mock implementation - do nothing
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(
          new CloseEvent("close", { code: 1000, reason: "Normal closure" }),
        );
      }
    }, 0);
  }

  addEventListener(_event: string, _listener: EventListener): void {
    // Mock implementation
  }

  removeEventListener(_event: string, _listener: EventListener): void {
    // Mock implementation
  }
}

// 註冊到全局環境
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = MockWebSocket;

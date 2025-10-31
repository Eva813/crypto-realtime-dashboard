import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

// Mock the WebSocket service
vi.mock("../services/binanceWebSocket", () => ({
  binanceWebSocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    subscribe: vi.fn(() => () => {}),
    onConnectionStatusChange: vi.fn(() => () => {}),
    getLastUpdateTime: vi.fn(() => Date.now()),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("應該渲染應用標題", async () => {
    render(<App />);
    // Use findByText instead since content loads through TanStack Query
    const heading = await screen.findByText("加密貨幣即時行情");
    expect(heading).toBeInTheDocument();
  });

  it("應該渲染加密貨幣列表", async () => {
    render(<App />);
    const listHeader = await screen.findByText("加密貨幣行情");
    expect(listHeader).toBeInTheDocument();
  });

  it("應該渲染自選清單", async () => {
    render(<App />);
    const emptyStateText = await screen.findByText("尚未收藏任何幣種");
    expect(emptyStateText).toBeInTheDocument();
  });

  it("應該顯示連線狀態指示器", async () => {
    render(<App />);
    const connectionStatus = await screen.findByText((textContent) => {
      return textContent?.includes("連線") ? true : false;
    });
    expect(connectionStatus).toBeInTheDocument();
  });
});

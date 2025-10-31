import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../services/query/client'
import App from '../App'

// Mock the WebSocket service
vi.mock('../services/binance/websocket', () => ({
  binanceWebSocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    subscribe: vi.fn(() => () => {}),
    subscribeKLine: vi.fn(() => () => {}),
    onConnectionStatusChange: vi.fn(() => () => {}),
    getLastUpdateTime: vi.fn(() => Date.now()),
  },
}))

// Mock the storage service
vi.mock('../services/storage/localStorage', () => ({
  storageService: {
    getWatchlist: vi.fn(() => ({
      symbols: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    isAvailable: vi.fn(() => true),
    addToWatchlist: vi.fn(() => true),
    removeFromWatchlist: vi.fn(() => true),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    queryClient.clear()
  })

  it('應該渲染應用標題', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    const heading = await screen.findByText('加密貨幣即時行情')
    expect(heading).toBeInTheDocument()
  })

  it('應該渲染加密貨幣列表', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    const listHeader = await screen.findByText('加密貨幣行情')
    expect(listHeader).toBeInTheDocument()
  })

  it('應該渲染自選清單', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    const watchlistHeader = await screen.findByText('自選清單')
    expect(watchlistHeader).toBeInTheDocument()
  })

  it('應該顯示連線狀態指示器', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    const connectionStatus = await screen.findByText((textContent) => {
      return textContent?.includes('連線') ? true : false
    })
    expect(connectionStatus).toBeInTheDocument()
  })
})

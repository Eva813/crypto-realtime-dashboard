/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { binanceWebSocketService } from '../services/binance/websocket'
import { storageService } from '../services/storage/localStorage'
import { useWebSocketStore, useWatchlistStore, useChartStore } from '../stores'
import { queryClient, queryKeys } from '../services/query/client'
import { throttle } from '../utils/throttle'
import type { PriceUpdate, KLine, Cryptocurrency } from '../utils/validation'

const API_BASE_URL = 'https://api.binance.com/api/v3';

const majorCryptos = new Map([
  ['BTCUSDT', { name: 'Bitcoin', rank: 1 }],
  ['ETHUSDT', { name: 'Ethereum', rank: 2 }],
  ['BNBUSDT', { name: 'BNB', rank: 3 }],
  ['SOLUSDT', { name: 'Solana', rank: 4 }],
  ['XRPUSDT', { name: 'XRP', rank: 5 }],
  ['DOGEUSDT', { name: 'Dogecoin', rank: 6 }],
  ['ADAUSDT', { name: 'Cardano', rank: 7 }],
  ['AVAXUSDT', { name: 'Avalanche', rank: 8 }],
  ['SHIBUSDT', { name: 'Shiba Inu', rank: 9 }],
  ['DOTUSDT', { name: 'Polkadot', rank: 10 }],
]);


/**
 * Custom Hook: useWebSocket (T022)
 * Manages WebSocket connection lifecycle and status
 */
export function useWebSocket() {
  const { status, error, retryCount, isReconnecting } = useWebSocketStore()

  useEffect(() => {
    binanceWebSocketService.connect()
    const unsubscribe = binanceWebSocketService.onConnectionStatusChange((isConnected) => {
      useWebSocketStore.setState({ status: isConnected })
    })
    return () => {
      unsubscribe()
      binanceWebSocketService.disconnect()
    }
  }, [])

  return {
    isConnected: status,
    error,
    retryCount,
    isReconnecting,
  }
}

/**
 * Custom Hook: useCryptoPrices (T024)
 * Fetch and manage multiple cryptocurrency prices
 */
export function useCryptoPrices(symbols: string[]) {
  // Create throttled update function inline to satisfy dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledUpdate = useCallback(
    throttle((symbol: string, update: PriceUpdate) => {
      queryClient.setQueryData(queryKeys.prices.single(symbol), (old: any) => ({
        ...old,
        price: update.price,
        changePercent24h: update.changePercent24h,
      }))
    }, 500),
    []
  )

  const { data: cryptos = [], isLoading, error } = useQuery({
    queryKey: queryKeys.cryptos.list(),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/ticker/24hr`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: any[] = await response.json();
      
      const filteredData = data.filter(ticker => majorCryptos.has(ticker.symbol));

      return filteredData.map((ticker): Cryptocurrency => ({
        id: ticker.symbol,
        symbol: ticker.symbol,
        name: majorCryptos.get(ticker.symbol)?.name || 'Unknown',
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChange),
        changePercent24h: parseFloat(ticker.priceChangePercent),
        volume24h: parseFloat(ticker.quoteVolume),
        marketCapRank: majorCryptos.get(ticker.symbol)?.rank || 999,
      }));
    },
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    const unsubscribers = symbols.map((symbol) =>
      binanceWebSocketService.subscribe(symbol, (update: PriceUpdate) => {
        throttledUpdate(symbol, update)
      })
    )
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [symbols, throttledUpdate])

  return { cryptos, isLoading, error }
}

/**
 * Custom Hook: useKLineChart (T025)
 * Fetch K-line data with interval switching capability
 *
 * 學習重點：
 * 1. 使用 TanStack Query 管理 K線數據的獲取和緩存
 * 2. 結合 WebSocket 實現即時數據更新
 * 3. enabled 參數防止無效的 API 請求
 * 4. useEffect 處理 WebSocket 訂閱和清理
 * 5. ⭐ 理解 isLoading vs isFetching 的關鍵區別
 */
export function useKLineChart(symbol: string) {
  const { selectedTimeFrame } = useChartStore()

  // TanStack Query: 獲取初始 K線數據
  /**
   * 重要：同時返回 isLoading 和 isFetching ⭐
   *
   * TanStack Query v5 狀態說明：
   * - isPending: 沒有任何緩存數據（v4 的 isLoading）
   * - isFetching: 正在發送網絡請求（不管是否有緩存）
   * - isLoading: isPending && isFetching（只在首次無緩存時為 true）
   *
   * 為什麼需要 isFetching？
   * 當用戶第二次點擊或切換時間間隔時：
   * 1. Query 檢查緩存，發現有數據（即使是空數組 []）
   * 2. isPending = false（因為有緩存）
   * 3. isLoading = false（因為 isPending 是 false）
   * 4. 但 isFetching = true（正在請求新數據）
   * 5. 結果：沒有 loading indicator → 白屏！❌
   *
   * 解決方案：使用 isFetching 追蹤所有網絡請求狀態 ✅
   */
  const { data: klines = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.klines.detail(symbol, selectedTimeFrame),
    queryFn: async () => {
      // 從 Binance REST API 獲取歷史 K線數據
      const response = await fetch(`${API_BASE_URL}/klines?symbol=${symbol}&interval=${selectedTimeFrame}&limit=100`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: any[][] = await response.json();
      // 將 Binance 的陣列格式轉換為我們的 KLine 類型
      return data.map((d): KLine => ({
        time: d[0] / 1000,        // 轉換為秒（Binance 使用毫秒）
        open: parseFloat(d[1]),   // 開盤價
        high: parseFloat(d[2]),   // 最高價
        low: parseFloat(d[3]),    // 最低價
        close: parseFloat(d[4]),  // 收盤價
        volume: parseFloat(d[5]), // 成交量
      }));
    },
    enabled: !!symbol, // 只有在 symbol 有效時才執行查詢
    staleTime: 60 * 1000, // 數據在 60 秒內視為新鮮，不會重新獲取
  })

  // WebSocket 訂閱：接收即時 K線更新
  useEffect(() => {
    // 防止無效的 symbol 訂閱 WebSocket
    if (!symbol) return;

    const unsubscribe = binanceWebSocketService.subscribeKLine(
      symbol,
      selectedTimeFrame,
      (kline: KLine) => {
        // 當收到新的 K線數據時，更新 React Query 的緩存
        queryClient.setQueryData(
          queryKeys.klines.detail(symbol, selectedTimeFrame),
          (old: KLine[] = []) => {
            const updated = [...old]
            const lastIndex = updated.length - 1
            // 如果是更新現有的 K線（時間相同），則替換
            if (lastIndex >= 0 && updated[lastIndex].time === kline.time) {
              updated[lastIndex] = kline
            } else {
              // 否則添加新的 K線
              updated.push(kline)
            }
            return updated
          }
        )
      }
    )
    // 清理函數：組件卸載或依賴變化時取消訂閱
    return unsubscribe
  }, [symbol, selectedTimeFrame]) // 當 symbol 或時間間隔改變時重新訂閱

  /**
   * 返回值說明：
   * - klines: K線數據陣列
   * - isLoading: 首次載入（無緩存）時為 true
   * - isFetching: 任何網絡請求進行中時為 true ⭐ 用於顯示 loading
   * - error: 錯誤信息
   * - refetch: 手動重新獲取數據的函數
   */
  return { klines, isLoading, isFetching, error, refetch }
}

/**
 * Custom Hook: useWatchlist (T026)
 * Manage watchlist state and localStorage sync
 */
export function useWatchlist() {
  const { favorites, isStorageAvailable } = useWatchlistStore()

  useEffect(() => {
    const stored = storageService.getWatchlist()
    useWatchlistStore.setState({
      favorites: new Set(stored.symbols),
      isStorageAvailable: storageService.isAvailable(),
    })
  }, [])

  const addToWatchlist = useCallback((symbol: string) => {
    const success = storageService.addToWatchlist(symbol)
    if (success) {
      useWatchlistStore.getState().addFavorite(symbol)
    }
  }, [])

  const removeFromWatchlist = useCallback((symbol: string) => {
    const success = storageService.removeFromWatchlist(symbol)
    if (success) {
      useWatchlistStore.getState().removeFavorite(symbol)
    }
  }, [])

  const toggleFavorite = useCallback((symbol: string) => {
    if (useWatchlistStore.getState().isFavorite(symbol)) {
      removeFromWatchlist(symbol)
    } else {
      addToWatchlist(symbol)
    }
  }, [addToWatchlist, removeFromWatchlist])

  const isFavorite = useCallback((symbol: string) => {
    return favorites.has(symbol)
  }, [favorites])

  return {
    favorites: Array.from(favorites),
    isStorageAvailable,
    addToWatchlist,
    removeFromWatchlist,
    toggleFavorite,
    isFavorite,
  }
}

/**
 * Combined Hook: useCrypto
 * High-level hook combining multiple operations
 */
export function useCrypto(symbol?: string) {
  const websocket = useWebSocket()
  const { cryptos, isLoading: cryptosLoading } = useCryptoPrices(Array.from(majorCryptos.keys()))
  const watchlist = useWatchlist()
  const { selectedTimeFrame } = useChartStore()

  const crypto = symbol ? cryptos.find((c) => c.symbol === symbol) : undefined

  return {
    crypto,
    cryptos,
    watchlist,
    selectedTimeFrame,
    isLoading: cryptosLoading,
    isConnected: websocket.isConnected,
    connectionError: websocket.error,
    toggleFavorite: watchlist.toggleFavorite,
    isFavorite: watchlist.isFavorite,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

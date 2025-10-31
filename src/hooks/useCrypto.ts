/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { binanceWebSocketService } from '../services/binance/websocket'
import { storageService } from '../services/storage/localStorage'
import { useWebSocketStore, useWatchlistStore, useChartStore } from '../stores'
import { queryClient, queryKeys } from '../services/query/client'
import { throttle } from '../utils/throttle'
import type { PriceUpdate, KLine, Cryptocurrency } from '../utils/validation'

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
 * Custom Hook: useCryptoPrice (T023)
 * Fetch and manage single cryptocurrency price data
 */
export function useCryptoPrice(symbol: string) {
  const { data: crypto, isLoading, error } = useQuery({
    queryKey: queryKeys.prices.single(symbol),
    queryFn: async () => ({
      symbol,
      price: Math.random() * 100000,
      changePercent24h: (Math.random() - 0.5) * 20,
      change24h: (Math.random() - 0.5) * 5000,
      volume24h: Math.random() * 1000000000,
    }),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })

  useEffect(() => {
    const unsubscribe = binanceWebSocketService.subscribe(symbol, (update: PriceUpdate) => {
      queryClient.setQueryData(queryKeys.prices.single(symbol), (old: any) => ({
        ...old,
        price: update.price,
        changePercent24h: update.changePercent24h,
      }))
    })
    return unsubscribe
  }, [symbol])

  return { crypto, isLoading, error }
}

/**
 * Custom Hook: useCryptoPrices (T024)
 * Fetch and manage multiple cryptocurrency prices
 */
export function useCryptoPrices(symbols: string[]) {
  // Create throttled update function inline to satisfy dependencies
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
      const mockCryptos: Cryptocurrency[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          name: 'Bitcoin',
          price: 43000,
          change24h: 1200,
          changePercent24h: 2.86,
          volume24h: 28000000000,
          marketCapRank: 1,
        },
        {
          id: '2',
          symbol: 'ETHUSDT',
          name: 'Ethereum',
          price: 2300,
          change24h: 80,
          changePercent24h: 3.6,
          volume24h: 16000000000,
          marketCapRank: 2,
        },
      ]
      return mockCryptos
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
 */
export function useKLineChart(symbol: string) {
  const { selectedTimeFrame } = useChartStore()

  const { data: klines = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.klines.detail(symbol, selectedTimeFrame),
    queryFn: async () => {
      const mockKlines: KLine[] = []
      const now = Math.floor(Date.now() / 1000)
      const intervals = {
        '1h': 3600,
        '4h': 14400,
        '1d': 86400,
        '1w': 604800,
      }
      const intervalSecs = intervals[selectedTimeFrame]

      for (let i = 50; i > 0; i--) {
        const time = now - i * intervalSecs
        const basePrice = 40000 + Math.random() * 5000
        mockKlines.push({
          time,
          open: basePrice,
          high: basePrice + Math.random() * 2000,
          low: basePrice - Math.random() * 2000,
          close: basePrice + (Math.random() - 0.5) * 3000,
          volume: Math.random() * 1000000,
        })
      }
      return mockKlines
    },
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    const unsubscribe = binanceWebSocketService.subscribeKLine(
      symbol,
      selectedTimeFrame,
      (kline: KLine) => {
        queryClient.setQueryData(
          queryKeys.klines.detail(symbol, selectedTimeFrame),
          (old: KLine[] = []) => {
            const updated = [...old]
            const lastIndex = updated.length - 1
            if (lastIndex >= 0 && updated[lastIndex].time === kline.time) {
              updated[lastIndex] = kline
            } else {
              updated.push(kline)
            }
            return updated
          }
        )
      }
    )
    return unsubscribe
  }, [symbol, selectedTimeFrame])

  return { klines, isLoading, error, refetch }
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
  const { cryptos, isLoading: cryptosLoading } = useCryptoPrices(symbol ? [symbol] : [])
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

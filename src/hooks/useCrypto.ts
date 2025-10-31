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
 */
export function useKLineChart(symbol: string) {
  const { selectedTimeFrame } = useChartStore()

  const { data: klines = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.klines.detail(symbol, selectedTimeFrame),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/klines?symbol=${symbol}&interval=${selectedTimeFrame}&limit=100`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: any[][] = await response.json();
      return data.map((d): KLine => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));
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

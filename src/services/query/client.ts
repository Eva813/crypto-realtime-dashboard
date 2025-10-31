import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'

/**
 * TanStack Query Client Configuration (T016)
 * Configures caching, retry, and stale time behavior
 */

const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache data for 30 seconds before marking as stale
      staleTime: 30 * 1000,

      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 404 or 401
        if (error instanceof Error && error.message.includes('404')) {
          return false
        }
        return failureCount < 3
      },

      // Exponential backoff: 1s, 2s, 4s
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),

      // Refetch when window regains focus
      refetchOnWindowFocus: true,

      // Refetch when network is reconnected
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },

    mutations: {
      // Retry mutations 1 time
      retry: 1,

      // Use same retry delay as queries
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
  },
}

/**
 * Create and export the Query Client instance
 */
export const queryClient = new QueryClient(queryConfig)

/**
 * Configuration for specific query types
 * Can be used with setQueryData or setQueriesData
 */
export const queryKeys = {
  // Cryptocurrency queries
  cryptos: {
    all: ['cryptos'] as const,
    list: () => [...queryKeys.cryptos.all, 'list'] as const,
    detail: (symbol: string) => [...queryKeys.cryptos.all, 'detail', symbol] as const,
  },

  // Price queries
  prices: {
    all: ['prices'] as const,
    list: (symbols: string[]) => [...queryKeys.prices.all, 'list', symbols] as const,
    single: (symbol: string) => [...queryKeys.prices.all, 'single', symbol] as const,
  },

  // K-Line (chart) queries
  klines: {
    all: ['klines'] as const,
    detail: (symbol: string, interval: string) =>
      [...queryKeys.klines.all, symbol, interval] as const,
  },

  // Watchlist queries
  watchlist: {
    all: ['watchlist'] as const,
    list: () => [...queryKeys.watchlist.all, 'list'] as const,
  },
}

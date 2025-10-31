import { create } from "zustand";
import type { ConnectionStatus } from "../utils/validation";

/**
 * Zustand WebSocket store (T019)
 * Global state for WebSocket connection management
 * Manages connection status, errors, and retry attempts
 */
interface WebSocketState {
  // State
  status: ConnectionStatus["isConnected"];
  error: string | null;
  retryCount: number;
  isReconnecting: boolean;
  lastUpdated: number;

  // Actions
  setStatus: (connected: boolean) => void;
  setError: (error: string | null) => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  setReconnecting: (reconnecting: boolean) => void;
  updateLastUpdated: () => void;

  // Helpers
  getStatus: () => ConnectionStatus;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  // Initial state
  status: false,
  error: null,
  retryCount: 0,
  isReconnecting: false,
  lastUpdated: Date.now(),

  // Actions
  setStatus: (connected: boolean) =>
    set({
      status: connected,
      lastUpdated: Date.now(),
      ...(connected && { error: null, isReconnecting: false }),
    }),

  setError: (error: string | null) =>
    set({
      error,
      ...(error && { status: false }),
    }),

  incrementRetryCount: () =>
    set((state) => ({
      retryCount: Math.min(state.retryCount + 1, 3),
      isReconnecting: true,
    })),

  resetRetryCount: () =>
    set({
      retryCount: 0,
      isReconnecting: false,
    }),

  setReconnecting: (reconnecting: boolean) =>
    set({ isReconnecting: reconnecting }),

  updateLastUpdated: () => set({ lastUpdated: Date.now() }),

  // Helpers
  getStatus: () => {
    const state = get();
    return {
      isConnected: state.status,
      lastUpdated: state.lastUpdated,
      error: state.error || undefined,
      retryCount: state.retryCount,
    };
  },
}));

/**
 * Zustand Watchlist store (T020)
 * Global state for user's favorite cryptocurrencies
 * Persists to localStorage with memory fallback
 */
interface WatchlistState {
  // State
  favorites: Set<string>;
  isStorageAvailable: boolean;

  // Actions
  addFavorite: (symbol: string) => void;
  removeFavorite: (symbol: string) => void;
  toggleFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
  getFavorites: () => string[];
  clearFavorites: () => void;
  setStorageAvailable: (available: boolean) => void;

  // Initialization
  initializeFromStorage: (stored: string[] | null) => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  // Initial state
  favorites: new Set<string>(),
  isStorageAvailable: true,

  // Actions
  addFavorite: (symbol: string) => {
    set((state) => {
      const newFavorites = new Set(state.favorites);
      newFavorites.add(symbol);
      return { favorites: newFavorites };
    });
  },

  removeFavorite: (symbol: string) => {
    set((state) => {
      const newFavorites = new Set(state.favorites);
      newFavorites.delete(symbol);
      return { favorites: newFavorites };
    });
  },

  toggleFavorite: (symbol: string) => {
    const { isFavorite } = get();
    if (isFavorite(symbol)) {
      get().removeFavorite(symbol);
    } else {
      get().addFavorite(symbol);
    }
  },

  isFavorite: (symbol: string) => {
    return get().favorites.has(symbol);
  },

  getFavorites: () => {
    return Array.from(get().favorites);
  },

  clearFavorites: () => {
    set({ favorites: new Set<string>() });
  },

  setStorageAvailable: (available: boolean) => {
    set({ isStorageAvailable: available });
  },

  initializeFromStorage: (stored: string[] | null) => {
    const favorites = new Set(stored || []);
    set({ favorites });
  },
}));

/**
 * Zustand Chart store (T021 - extended)
 * Global state for chart configuration and preferences
 */
interface ChartState {
  theme: "light" | "dark";
  showVolume: boolean;
  candleCount: number;
  selectedTimeFrame: "1h" | "4h" | "1d" | "1w";

  // Actions
  setTheme: (theme: "light" | "dark") => void;
  setShowVolume: (show: boolean) => void;
  setCandleCount: (count: number) => void;
  setTimeFrame: (timeFrame: "1h" | "4h" | "1d" | "1w") => void;
}

export const useChartStore = create<ChartState>((set) => ({
  theme: "light",
  showVolume: true,
  candleCount: 50,
  selectedTimeFrame: "1d",

  setTheme: (theme) => set({ theme }),
  setShowVolume: (show) => set({ showVolume: show }),
  setCandleCount: (count) =>
    set({ candleCount: Math.max(10, Math.min(count, 200)) }),
  setTimeFrame: (timeFrame) => set({ selectedTimeFrame: timeFrame }),
}));

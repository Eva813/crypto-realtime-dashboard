import { create } from "zustand";
import type { ConnectionStatus as OldConnectionStatus } from "../utils/validation";
import {
  ConnectionManager,
  type ConnectionState,
  type ConnectionStatus,
  type ConnectionMetrics,
  type HealthCheckResult,
} from "../services/websocket";

/**
 * ==================== WebSocket Store ====================
 *
 * 📚 架構層說明：
 * 這是企業級 WebSocket 狀態管理的核心 Store
 * 整合了新的 ConnectionManager，提供參照計數機制解決 React StrictMode 問題
 *
 * 🎯 設計目標：
 * 1. 向後兼容：保留舊的 API（status, error, retryCount 等）
 * 2. 企業級功能：提供完整的連接管理、健康監控、性能指標
 * 3. 自動同步：ConnectionManager 狀態變化時自動更新 Store
 * 4. 參照計數：多個元件可以安全地共享同一個 WebSocket 連接
 *
 * 💡 使用場景：
 * - 基礎使用：useWebSocketStore((state) => state.status)
 * - 進階使用：useWebSocketStore((state) => state.getMetrics())
 * - 連接管理：useWebSocketStore.getState().acquire() / release()
 *
 * ⚠️ StrictMode 解決方案：
 * React StrictMode 會導致元件雙重掛載：mount → unmount → remount
 * 傳統做法：connect() 在 mount，disconnect() 在 unmount
 * 問題：第一次 unmount 就會斷線，第二次 mount 需要重新連接
 *
 * 新做法（參照計數）：
 * 1. mount 時呼叫 acquire()，refCount 增加
 * 2. unmount 時呼叫 release()，refCount 減少
 * 3. 只有當 refCount 降到 0 時，才會排程斷線（延遲 500ms）
 * 4. StrictMode 的 remount 會在 500ms 內再次 acquire()，取消斷線
 * 結果：連接穩定，不受 StrictMode 影響 ✅
 */

/**
 * WebSocket Store 狀態介面
 *
 * 📝 實作層說明：
 * 分為三個層次：
 * 1. 向後兼容層：舊的 status, error, retryCount 等（給現有代碼使用）
 * 2. 新架構層：connectionState, connectionMetrics 等（給新代碼使用）
 * 3. 操作層：acquire, release, subscribe 等（連接生命週期管理）
 */
interface WebSocketState {
  // ========== 向後兼容層 ==========
  // 這些欄位保持與舊版本相同的介面，確保現有代碼無需修改
  status: OldConnectionStatus["isConnected"]; // 簡化的連接狀態（布林值）
  error: string | null; // 錯誤訊息
  retryCount: number; // 重試次數
  isReconnecting: boolean; // 是否正在重連
  lastUpdated: number; // 最後更新時間戳

  // ========== 新架構層 ==========
  // 提供更詳細的狀態資訊，給進階使用者
  connectionState: ConnectionState | null; // 完整的連接狀態
  connectionStatus: ConnectionStatus; // 詳細的連接狀態枚舉
  metrics: ConnectionMetrics | null; // 性能指標

  // ========== 向後兼容的操作 ==========
  setStatus: (connected: boolean) => void;
  setError: (error: string | null) => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  setReconnecting: (reconnecting: boolean) => void;
  updateLastUpdated: () => void;
  getStatus: () => OldConnectionStatus; // 舊版本的狀態獲取方法

  // ========== 新架構的操作 ==========
  // 連接生命週期管理
  acquire: () => void; // 增加參照計數（元件 mount 時呼叫）
  release: () => void; // 減少參照計數（元件 unmount 時呼叫）

  // 連接狀態查詢
  isConnected: () => boolean; // 檢查是否連接
  getConnectionState: () => ConnectionState; // 獲取完整連接狀態
  getMetrics: () => ConnectionMetrics; // 獲取性能指標
  getHealthStatus: () => HealthCheckResult; // 獲取健康檢查結果

  // 內部方法（由 ConnectionManager 事件觸發）
  _syncFromManager: () => void; // 從 ConnectionManager 同步狀態
}

/**
 * 建立 WebSocket Store
 *
 * 💡 實作重點：
 * 1. 初始化時獲取 ConnectionManager 單例
 * 2. 設置事件監聽器，當 ConnectionManager 狀態變化時自動更新 Store
 * 3. 提供雙層 API：舊的兼容 API + 新的企業級 API
 */
export const useWebSocketStore = create<WebSocketState>((set, get) => {
  // 獲取 ConnectionManager 單例
  // 💡 Singleton 模式：整個應用只有一個 ConnectionManager 實例
  const manager = ConnectionManager.getInstance({
    debug: true, // 開發環境啟用 debug 日誌
    disconnectDelay: 500, // StrictMode 緩衝時間（500ms）
    enableMessageQueue: true, // 啟用訊息佇列批次處理
  });

  // 設置事件監聽器：當連接狀態變化時自動同步到 Store
  // 💡 Observer 模式：ConnectionManager 是 Subject，Store 是 Observer
  manager.on("stateChange", (state: ConnectionState) => {
    // 自動同步新狀態到 Store
    get()._syncFromManager();

    // 同時更新舊的兼容欄位
    set({
      status: state.status === "connected",
      lastUpdated: Date.now(),
      // 連接成功時清除錯誤和重連狀態
      ...(state.status === "connected" && {
        error: null,
        isReconnecting: false,
      }),
    });
  });

  // 監聽錯誤事件
  manager.on("error", (error: Error) => {
    set({
      error: error.message,
      status: false,
    });
  });

  // 監聽重連事件
  manager.on("reconnecting", () => {
    set({
      isReconnecting: true,
    });
  });

  return {
    // ========== 初始狀態 ==========
    // 向後兼容層
    status: false,
    error: null,
    retryCount: 0,
    isReconnecting: false,
    lastUpdated: Date.now(),

    // 新架構層
    connectionState: null,
    connectionStatus: "disconnected",
    metrics: null,

    // ========== 向後兼容的操作 ==========
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

    getStatus: () => {
      const state = get();
      return {
        isConnected: state.status,
        lastUpdated: state.lastUpdated,
        error: state.error || undefined,
        retryCount: state.retryCount,
      };
    },

    // ========== 新架構的操作 ==========

    /**
     * 增加參照計數
     *
     * 💡 使用時機：元件 mount 時呼叫
     * 在 React Hook 的 useEffect 中：
     * ```typescript
     * useEffect(() => {
     *   useWebSocketStore.getState().acquire()
     *   return () => useWebSocketStore.getState().release()
     * }, [])
     * ```
     *
     * 🎯 行為：
     * - refCount 0 → 1：建立連接
     * - refCount 1 → 2：重用現有連接（不會重複連接）
     * - 取消已排程的斷線（處理 StrictMode 重新掛載）
     */
    acquire: () => {
      manager.acquire();
      // 同步最新狀態
      get()._syncFromManager();
    },

    /**
     * 減少參照計數
     *
     * 💡 使用時機：元件 unmount 時呼叫
     *
     * 🎯 行為：
     * - refCount 2 → 1：保持連接（還有其他元件在使用）
     * - refCount 1 → 0：排程斷線（延遲 500ms）
     * - 如果 500ms 內有新的 acquire()，會取消斷線
     */
    release: () => {
      manager.release();
      // 同步最新狀態
      get()._syncFromManager();
    },

    /**
     * 檢查是否已連接
     *
     * 💡 這是檢查連接狀態最簡單的方法
     * 推薦在元件中使用：
     * ```typescript
     * const isConnected = useWebSocketStore((state) => state.isConnected())
     * ```
     */
    isConnected: () => {
      return manager.isConnected();
    },

    /**
     * 獲取完整連接狀態
     *
     * 💡 包含詳細資訊：
     * - status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
     * - connectedAt: 連接建立時間
     * - lastError: 最後的錯誤
     * - reconnectAttempts: 重連次數
     * - url: WebSocket URL
     */
    getConnectionState: () => {
      return manager.getConnectionState();
    },

    /**
     * 獲取性能指標
     *
     * 💡 包含：
     * - latency: 延遲時間
     * - messageRate: 訊息速率（每秒）
     * - errorRate: 錯誤率（百分比）
     * - lastMessageAt: 最後訊息時間
     * - qualityScore: 品質評分（0-100）
     *
     * 🎯 用途：
     * - 監控連接品質
     * - 展示給用戶（例如：延遲 XX ms）
     * - 觸發降級策略（例如：品質差時暫停訂閱）
     */
    getMetrics: () => {
      return manager.getHealthMonitor().getMetrics();
    },

    /**
     * 獲取健康檢查結果（公開連接診斷）
     *
     * 💡 返回用戶實際使用的公開連接的詳細健康狀態
     *
     * 包含：
     * - isHealthy: 是否健康
     * - status: 健康狀態分級（EXCELLENT/GOOD/POOR/CRITICAL）
     * - qualityScore: 連接品質評分（0-100）
     * - lastMessageAt: 最後訊息時間戳
     * - timeSinceLastMessage: 距離最後訊息的時間（毫秒）
     * - isTimeout: 是否超過心跳超時
     * - metrics: 詳細性能指標
     *   - averageLatency: 平均延遲（毫秒）
     *   - messageRate: 訊息速率（訊息/秒）
     *   - qualityScore: 品質評分（0-100）
     *
     * 🎯 用途：
     * - 診斷連接問題
     * - 監控連接品質
     * - 觸發自動重連邏輯
     * - 提供用戶友好的狀態顯示
     */
    getHealthStatus: () => {
      return manager.getPublicConnectionHealth();
    },

    /**
     * 內部方法：從 ConnectionManager 同步狀態
     *
     * ⚠️ 這是內部方法，不應直接呼叫
     * 當 ConnectionManager 觸發事件時自動呼叫
     */
    _syncFromManager: () => {
      const state = manager.getConnectionState();
      const metrics = manager.getHealthMonitor().getMetrics();

      set({
        connectionState: state,
        connectionStatus: state.status,
        metrics: metrics,
        status: state.status === "connected",
        lastUpdated: Date.now(),
      });
    },
  };
});

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

/**
 * ==================== Store 導出說明 ====================
 *
 * 📚 這個文件導出了所有 Zustand Store
 *
 * 🎯 Store 列表：
 *
 * 1. useWebSocketStore - WebSocket 連接管理（企業級）
 *    - 整合 ConnectionManager
 *    - 參照計數機制（解決 StrictMode）
 *    - 健康監控和性能指標
 *    - 向後兼容舊 API
 *
 * 2. useMarketDataStore - 市場資料管理（新增）
 *    - 集中管理價格和 K線資料
 *    - 訂閱去重機制
 *    - 自動清理
 *    - 精準訂閱（避免不必要的重渲染）
 *    ⚠️ 注意：此 Store 在 market.store.ts 中定義
 *
 * 3. useWatchlistStore - 收藏列表管理
 *    - 管理用戶收藏的交易對
 *    - localStorage 持久化
 *
 * 4. useChartStore - 圖表配置管理
 *    - 主題、音量顯示、時間週期等
 *
 * 💡 使用建議：
 *
 * ### WebSocket 連接管理：
 * ```typescript
 * // 方式 1：基礎使用（向後兼容）
 * const { status, error } = useWebSocketStore()
 *
 * // 方式 2：進階使用（企業級功能）
 * const metrics = useWebSocketStore((state) => state.getMetrics())
 * const healthStatus = useWebSocketStore((state) => state.getHealthStatus())
 *
 * // 方式 3：連接管理（在 Hook 中）
 * useEffect(() => {
 *   useWebSocketStore.getState().acquire()
 *   return () => useWebSocketStore.getState().release()
 * }, [])
 * ```
 *
 * ### 市場資料管理：
 * ```typescript
 * import { useMarketDataStore, usePrice, useKlines } from '@/stores/market.store'
 *
 * // 方式 1：使用便利 Hook（推薦）
 * const btcPrice = usePrice('BTCUSDT')
 * const klines = useKlines('BTCUSDT', '1h')
 *
 * // 方式 2：使用選擇器（精準訂閱）
 * const price = useMarketDataStore((state) => state.getPrice('BTCUSDT'))
 *
 * // 方式 3：訂閱資料更新（在 Hook 中）
 * useEffect(() => {
 *   const unsubscribe = useMarketDataStore.getState().subscribePrice(
 *     'BTCUSDT',
 *     (update) => console.log(update)
 *   )
 *   return unsubscribe
 * }, [])
 * ```
 *
 * 🔄 遷移指南：
 *
 * 從舊的 binanceWebSocketService 遷移到新架構：
 *
 * **舊代碼**：
 * ```typescript
 * useEffect(() => {
 *   binanceWebSocketService.connect()
 *   const unsubscribe = binanceWebSocketService.subscribe(symbol, callback)
 *   return () => {
 *     unsubscribe()
 *     binanceWebSocketService.disconnect()
 *   }
 * }, [])
 * ```
 *
 * **新代碼**：
 * ```typescript
 * useEffect(() => {
 *   useWebSocketStore.getState().acquire()
 *   const unsubscribe = useMarketDataStore.getState().subscribePrice(symbol, callback)
 *   return () => {
 *     unsubscribe()
 *     useWebSocketStore.getState().release()
 *   }
 * }, [])
 * ```
 *
 * ✨ 新架構優勢：
 * 1. ✅ 解決 React StrictMode 雙重掛載問題
 * 2. ✅ 自動訂閱去重（多個元件訂閱同一資料只發送一次請求）
 * 3. ✅ 健康監控和性能指標
 * 4. ✅ 企業級錯誤處理
 * 5. ✅ 訊息佇列批次處理（避免 UI 卡頓）
 * 6. ✅ Zustand 精準訂閱（避免不必要的重渲染）
 */

// 註：useMarketDataStore 在 market.store.ts 中定義並導出
// 使用時：import { useMarketDataStore, usePrice, useKlines } from '@/stores/market.store'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ==================== React Hooks for Crypto Data ====================
 *
 * 📚 架構層說明：
 * 這個文件提供了所有與加密貨幣資料相關的 React Hooks
 * 已重構為使用企業級 WebSocket 架構（ConnectionManager + Stores）
 *
 * 🎯 重構目標：
 * 1. 向後兼容：保持 API 不變，現有代碼無需修改
 * 2. 企業級架構：使用 ConnectionManager 和 MarketDataStore
 * 3. 解決 StrictMode：使用參照計數機制
 * 4. 性能優化：訂閱去重、訊息批次處理
 * 5. 類型安全：完整的 TypeScript 支援
 *
 * 🔄 遷移狀態：
 * - ✅ useWebSocket: 已遷移到 useWebSocketStore
 * - ✅ useCryptoPrices: 已遷移到 useMarketDataStore
 * - ✅ useKLineChart: 已遷移到 useMarketDataStore
 * - ✅ useWatchlist: 保持不變（不依賴 WebSocket）
 * - ✅ useCrypto: 已更新以使用新 hooks
 *
 * ⚠️ 已棄用：
 * - binanceWebSocketService: 已被 ConnectionManager 替代
 */
import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { storageService } from "../services/storage/localStorage";
import { useWebSocketStore, useWatchlistStore, useChartStore } from "../stores";
import { useMarketDataStore } from "../stores/market.store";
import { queryClient, queryKeys } from "../services/query/client";
import { throttle } from "../utils/throttle";
import type { PriceUpdate, KLine, Cryptocurrency } from "../utils/validation";

const API_BASE_URL = "https://api.binance.com/api/v3";

const majorCryptos = new Map([
  ["BTCUSDT", { name: "Bitcoin", rank: 1 }],
  ["ETHUSDT", { name: "Ethereum", rank: 2 }],
  ["BNBUSDT", { name: "BNB", rank: 3 }],
  ["SOLUSDT", { name: "Solana", rank: 4 }],
  ["XRPUSDT", { name: "XRP", rank: 5 }],
  ["DOGEUSDT", { name: "Dogecoin", rank: 6 }],
  ["ADAUSDT", { name: "Cardano", rank: 7 }],
  ["AVAXUSDT", { name: "Avalanche", rank: 8 }],
  ["SHIBUSDT", { name: "Shiba Inu", rank: 9 }],
  ["DOTUSDT", { name: "Polkadot", rank: 10 }],
]);

/**
 * Custom Hook: useWebSocket (T022 - 企業級重構版)
 *
 * 📚 架構層說明：
 * 管理 WebSocket 連接生命週期和狀態
 * 已從舊的 binanceWebSocketService 遷移到新的 useWebSocketStore
 *
 * 🎯 主要改動：
 * 1. 使用 acquire/release 替代 connect/disconnect
 * 2. 自動處理 React StrictMode 雙重掛載
 * 3. 參照計數機制：多個元件可安全共享連接
 * 4. 向後兼容：返回值保持不變
 *
 * 💡 工作原理：
 * ```
 * 元件 mount → acquire() → refCount++
 *   ↓
 * 如果 refCount = 1 → 建立連接
 * 如果 refCount > 1 → 重用現有連接
 *   ↓
 * 元件 unmount → release() → refCount--
 *   ↓
 * 如果 refCount = 0 → 排程斷線（500ms 後）
 * 如果 refCount > 0 → 保持連接
 * ```
 *
 * ⚠️ StrictMode 處理：
 * React StrictMode 流程：mount → unmount → remount
 * 1. 第一次 mount: acquire() → refCount 0→1 → 建立連接
 * 2. StrictMode unmount: release() → refCount 1→0 → 排程斷線（500ms）
 * 3. StrictMode remount: acquire() → refCount 0→1 → 取消斷線，重用連接
 * 結果：連接穩定，不受 StrictMode 影響 ✅
 *
 * @returns WebSocket 連接狀態
 * - isConnected: 是否已連接
 * - error: 錯誤訊息
 * - retryCount: 重試次數
 * - isReconnecting: 是否正在重連
 */
export function useWebSocket() {
  // 從 Store 獲取狀態（向後兼容的欄位）
  const { status, error, retryCount, isReconnecting } = useWebSocketStore();

  useEffect(() => {
    // 使用參照計數機制管理連接生命週期
    // 💡 這是解決 StrictMode 問題的關鍵
    const store = useWebSocketStore.getState();

    // 增加參照計數（建立或重用連接）
    store.acquire();

    // 清理函數：減少參照計數
    return () => {
      store.release();
    };
  }, []);

  // 返回值保持不變（向後兼容）
  return {
    isConnected: status,
    error,
    retryCount,
    isReconnecting,
  };
}

/**
 * Custom Hook: useCryptoPrices (T024 - 企業級重構版)
 *
 * 📚 架構層說明：
 * 獲取並管理多個加密貨幣的價格資料
 * 已從舊的 binanceWebSocketService 遷移到新的 useMarketDataStore
 *
 * 🎯 主要改動：
 * 1. 使用 useMarketDataStore.subscribePrice() 訂閱價格更新
 * 2. 自動訂閱去重：多個元件訂閱同一 symbol 只發送一次請求
 * 3. 自動清理：元件 unmount 時自動取消訂閱
 * 4. 向後兼容：返回值保持不變
 *
 * 💡 工作原理：
 * 1. 使用 TanStack Query 獲取初始資料（REST API）
 * 2. 使用 MarketDataStore 訂閱即時更新（WebSocket）
 * 3. 收到 WebSocket 更新時，更新 Query 緩存（節流處理）
 *
 * 🎯 訂閱去重範例：
 * ```
 * // 場景：3 個元件都呼叫 useCryptoPrices(['BTCUSDT'])
 *
 * 元件 A mount → subscribePrice('BTCUSDT') → 發送訂閱請求
 * 元件 B mount → subscribePrice('BTCUSDT') → 重用現有訂閱（不發送請求）
 * 元件 C mount → subscribePrice('BTCUSDT') → 重用現有訂閱（不發送請求）
 *
 * Binance 推送價格 → MarketDataStore 收到
 *   ↓
 * 通知 3 個元件的 callback
 *   ↓
 * 每個元件的 throttledUpdate 更新 Query 緩存
 *   ↓
 * React Query 觸發重渲染（只渲染訂閱該資料的元件）
 * ```
 *
 * @param symbols - 要訂閱的交易對符號陣列
 * @returns 加密貨幣資料和載入狀態
 * - cryptos: 加密貨幣資料陣列
 * - isLoading: 是否正在載入
 * - error: 錯誤訊息
 */
export function useCryptoPrices(symbols: string[]) {
  // 創建節流更新函數
  // 💡 節流處理：避免高頻更新造成 UI 卡頓
  // 500ms 內最多更新一次
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledUpdate = useCallback(
    throttle((symbol: string, update: PriceUpdate) => {
      // 更新 TanStack Query 緩存
      // 💡 這樣可以保持 REST API 和 WebSocket 資料同步
      queryClient.setQueryData(queryKeys.prices.single(symbol), (old: any) => ({
        ...old,
        price: update.price,
        changePercent24h: update.changePercent24h,
      }));
    }, 500),
    [],
  );

  // 使用 TanStack Query 獲取初始資料
  // 💡 REST API 提供完整的初始資料（24小時統計等）
  const {
    data: cryptos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.cryptos.list(),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/ticker/24hr`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: any[] = await response.json();

      // 只保留主要加密貨幣
      const filteredData = data.filter((ticker) =>
        majorCryptos.has(ticker.symbol),
      );

      return filteredData.map(
        (ticker): Cryptocurrency => ({
          id: ticker.symbol,
          symbol: ticker.symbol,
          name: majorCryptos.get(ticker.symbol)?.name || "Unknown",
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChange),
          changePercent24h: parseFloat(ticker.priceChangePercent),
          volume24h: parseFloat(ticker.quoteVolume),
          marketCapRank: majorCryptos.get(ticker.symbol)?.rank || 999,
        }),
      );
    },
    staleTime: 30 * 1000, // 30 秒內不重新獲取
  });

  // 訂閱 WebSocket 即時價格更新
  useEffect(() => {
    // 獲取 MarketDataStore
    const store = useMarketDataStore.getState();

    // 為每個 symbol 訂閱價格更新
    // 💡 MarketDataStore 會自動處理去重
    const unsubscribers = symbols.map((symbol) =>
      store.subscribePrice(symbol, (update: PriceUpdate) => {
        // 收到價格更新，節流更新 Query 緩存
        throttledUpdate(symbol, update);
      }),
    );

    // 清理函數：取消所有訂閱
    // 💡 MarketDataStore 會在沒有訂閱者時自動取消 WebSocket 訂閱
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [symbols, throttledUpdate]);

  // 返回值保持不變（向後兼容）
  return { cryptos, isLoading, error };
}

/**
 * Custom Hook: useKLineChart (T025 - 企業級重構版)
 *
 * 📚 架構層說明：
 * 獲取並管理 K線（蠟燭圖）資料
 * 已從舊的 binanceWebSocketService 遷移到新的 useMarketDataStore
 *
 * 🎯 主要改動：
 * 1. 使用 useMarketDataStore.subscribeKline() 訂閱 K線更新
 * 2. 自動訂閱去重：多個元件訂閱同一 K線只發送一次請求
 * 3. 自動清理：元件 unmount 時自動取消訂閱
 * 4. 向後兼容：返回值保持不變
 *
 * 💡 工作原理：
 * 1. 使用 TanStack Query 獲取歷史 K線資料（REST API，100 根）
 * 2. 使用 MarketDataStore 訂閱即時 K線更新（WebSocket）
 * 3. 收到 WebSocket 更新時，更新 Query 緩存（智能合併）
 *
 * 🎯 K線更新邏輯：
 * ```
 * REST API 返回 100 根歷史 K線
 *   ↓
 * TanStack Query 緩存
 *   ↓
 * WebSocket 推送新 K線
 *   ↓
 * 檢查最後一根 K線的時間
 *   ↓
 * 時間相同？
 *   ├─ 是 → 更新最後一根（同一週期內的價格變化）
 *   └─ 否 → 添加新 K線（新週期開始）
 * ```
 *
 * 學習重點：
 * 1. 使用 TanStack Query 管理 K線數據的獲取和緩存
 * 2. 結合 WebSocket 實現即時數據更新
 * 3. enabled 參數防止無效的 API 請求
 * 4. useEffect 處理 WebSocket 訂閱和清理
 * 5. ⭐ 理解 isLoading vs isFetching 的關鍵區別
 *
 * @param symbol - 交易對符號（如：'BTCUSDT'）
 * @returns K線資料和載入狀態
 * - klines: K線資料陣列
 * - isLoading: 首次載入（無緩存）時為 true
 * - isFetching: 任何網絡請求進行中時為 true ⭐ 用於顯示 loading
 * - error: 錯誤訊息
 * - refetch: 手動重新獲取資料的函數
 */
export function useKLineChart(symbol: string) {
  const { selectedTimeFrame } = useChartStore();

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
  const {
    data: klines = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.klines.detail(symbol, selectedTimeFrame),
    queryFn: async () => {
      // 從 Binance REST API 獲取歷史 K線數據
      const response = await fetch(
        `${API_BASE_URL}/klines?symbol=${symbol}&interval=${selectedTimeFrame}&limit=100`,
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: any[][] = await response.json();
      // 將 Binance 的陣列格式轉換為我們的 KLine 類型
      return data.map(
        (d): KLine => ({
          time: d[0] / 1000, // 轉換為秒（Binance 使用毫秒）
          open: parseFloat(d[1]), // 開盤價
          high: parseFloat(d[2]), // 最高價
          low: parseFloat(d[3]), // 最低價
          close: parseFloat(d[4]), // 收盤價
          volume: parseFloat(d[5]), // 成交量
        }),
      );
    },
    enabled: !!symbol, // 只有在 symbol 有效時才執行查詢
    staleTime: 60 * 1000, // 數據在 60 秒內視為新鮮，不會重新獲取
  });

  // WebSocket 訂閱：接收即時 K線更新
  useEffect(() => {
    // 防止無效的 symbol 訂閱 WebSocket
    if (!symbol) return;

    // 獲取 MarketDataStore
    const store = useMarketDataStore.getState();

    // 訂閱 K線更新
    // 💡 MarketDataStore 會自動處理去重和清理
    const unsubscribe = store.subscribeKline(
      symbol,
      selectedTimeFrame as "1h" | "4h" | "1d" | "1w",
      (kline: KLine) => {
        // 當收到新的 K線數據時，更新 React Query 的緩存
        queryClient.setQueryData(
          queryKeys.klines.detail(symbol, selectedTimeFrame),
          (old: KLine[] = []) => {
            const updated = [...old];
            const lastIndex = updated.length - 1;

            // 智能合併邏輯：
            // 如果是更新現有的 K線（時間相同），則替換
            if (lastIndex >= 0 && updated[lastIndex].time === kline.time) {
              updated[lastIndex] = kline;
            } else {
              // 否則添加新的 K線（新週期開始）
              updated.push(kline);
            }
            return updated;
          },
        );
      },
    );

    // 清理函數：組件卸載或依賴變化時取消訂閱
    // 💡 MarketDataStore 會在沒有訂閱者時自動取消 WebSocket 訂閱
    return unsubscribe;
  }, [symbol, selectedTimeFrame]); // 當 symbol 或時間間隔改變時重新訂閱

  /**
   * 返回值說明：
   * - klines: K線數據陣列
   * - isLoading: 首次載入（無緩存）時為 true
   * - isFetching: 任何網絡請求進行中時為 true ⭐ 用於顯示 loading
   * - error: 錯誤信息
   * - refetch: 手動重新獲取數據的函數
   */
  return { klines, isLoading, isFetching, error, refetch };
}

/**
 * Custom Hook: useWatchlist (T026)
 * Manage watchlist state and localStorage sync
 */
export function useWatchlist() {
  const { favorites, isStorageAvailable } = useWatchlistStore();

  useEffect(() => {
    const stored = storageService.getWatchlist();
    useWatchlistStore.setState({
      favorites: new Set(stored.symbols),
      isStorageAvailable: storageService.isAvailable(),
    });
  }, []);

  const addToWatchlist = useCallback((symbol: string) => {
    const success = storageService.addToWatchlist(symbol);
    if (success) {
      useWatchlistStore.getState().addFavorite(symbol);
    }
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    const success = storageService.removeFromWatchlist(symbol);
    if (success) {
      useWatchlistStore.getState().removeFavorite(symbol);
    }
  }, []);

  const toggleFavorite = useCallback(
    (symbol: string) => {
      if (useWatchlistStore.getState().isFavorite(symbol)) {
        removeFromWatchlist(symbol);
      } else {
        addToWatchlist(symbol);
      }
    },
    [addToWatchlist, removeFromWatchlist],
  );

  const isFavorite = useCallback(
    (symbol: string) => {
      return favorites.has(symbol);
    },
    [favorites],
  );

  return {
    favorites: Array.from(favorites),
    isStorageAvailable,
    addToWatchlist,
    removeFromWatchlist,
    toggleFavorite,
    isFavorite,
  };
}

/**
 * Combined Hook: useCrypto (已更新)
 *
 * 📚 架構層說明：
 * 高階 Hook，整合多個操作以簡化元件使用
 * 已更新為使用新的企業級 hooks
 *
 * 💡 包含功能：
 * 1. WebSocket 連接管理（useWebSocket）
 * 2. 價格資料管理（useCryptoPrices）
 * 3. 收藏列表管理（useWatchlist）
 * 4. 圖表配置（useChartStore）
 *
 * 🎯 向後兼容：
 * API 保持完全不變，現有元件無需修改
 *
 * @param symbol - 可選的交易對符號
 * @returns 整合的加密貨幣資料和操作
 */
export function useCrypto(symbol?: string) {
  const websocket = useWebSocket();
  const { cryptos, isLoading: cryptosLoading } = useCryptoPrices(
    Array.from(majorCryptos.keys()),
  );
  const watchlist = useWatchlist();
  const { selectedTimeFrame } = useChartStore();

  const crypto = symbol ? cryptos.find((c) => c.symbol === symbol) : undefined;

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
  };
}

/**
 * ==================== 重構總結文檔 ====================
 *
 * 📚 這個文件已完成企業級架構重構
 *
 * 🎯 重構目標：
 * 1. ✅ 解決 React StrictMode 雙重掛載問題
 * 2. ✅ 引入參照計數機制（acquire/release）
 * 3. ✅ 訂閱去重和自動清理
 * 4. ✅ 企業級錯誤處理和健康監控
 * 5. ✅ 完全向後兼容（現有代碼無需修改）
 *
 * 🔄 已重構的 Hooks：
 *
 * 1. **useWebSocket()**
 *    - 舊：binanceWebSocketService.connect() / disconnect()
 *    - 新：useWebSocketStore.acquire() / release()
 *    - 好處：解決 StrictMode 問題，參照計數機制
 *
 * 2. **useCryptoPrices(symbols)**
 *    - 舊：binanceWebSocketService.subscribe()
 *    - 新：useMarketDataStore.subscribePrice()
 *    - 好處：訂閱去重，自動清理
 *
 * 3. **useKLineChart(symbol)**
 *    - 舊：binanceWebSocketService.subscribeKLine()
 *    - 新：useMarketDataStore.subscribeKline()
 *    - 好處：訂閱去重，智能 K線合併
 *
 * 4. **useWatchlist()**
 *    - 無改動（不依賴 WebSocket）
 *
 * 5. **useCrypto(symbol)**
 *    - 已更新為使用新的 hooks
 *    - API 保持不變
 *
 * 📊 架構對比：
 *
 * ### 舊架構：
 * ```
 * Component
 *   ↓
 * useWebSocket()
 *   ↓
 * binanceWebSocketService (Singleton)
 *   ↓
 * WebSocket 原生 API
 * ```
 *
 * 問題：
 * - ❌ StrictMode 會導致斷線重連
 * - ❌ 沒有訂閱去重
 * - ❌ 沒有健康監控
 * - ❌ 基礎錯誤處理
 *
 * ### 新架構：
 * ```
 * Component
 *   ↓
 * useWebSocket() / useCryptoPrices()
 *   ↓
 * useWebSocketStore / useMarketDataStore (Zustand)
 *   ↓
 * ConnectionManager (Singleton)
 *   ↓
 * ConnectionPool + SubscriptionManager
 *   ↓
 * WebSocketConnection + HealthMonitor
 *   ↓
 * MessageQueue + MessageRouter
 *   ↓
 * WebSocket 原生 API
 * ```
 *
 * 優勢：
 * - ✅ 參照計數解決 StrictMode
 * - ✅ 自動訂閱去重
 * - ✅ 健康監控和性能指標
 * - ✅ 企業級錯誤處理
 * - ✅ 訊息批次處理（60 FPS）
 * - ✅ Zustand 精準訂閱
 *
 * 💡 使用範例：
 *
 * ### 基礎使用（完全向後兼容）：
 * ```typescript
 * function CryptoList() {
 *   const { cryptos, isLoading, isConnected } = useCrypto()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (!isConnected) return <div>Disconnected</div>
 *
 *   return (
 *     <ul>
 *       {cryptos.map(crypto => (
 *         <li key={crypto.symbol}>
 *           {crypto.name}: ${crypto.price}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * ### 進階使用（新功能）：
 * ```typescript
 * function AdvancedDashboard() {
 *   const websocket = useWebSocket()
 *
 *   // 獲取性能指標
 *   const metrics = useWebSocketStore((state) => state.getMetrics())
 *   const health = useWebSocketStore((state) => state.getHealthStatus())
 *
 *   return (
 *     <div>
 *       <div>連接狀態: {websocket.isConnected ? '✅' : '❌'}</div>
 *       <div>延遲: {metrics?.latency}ms</div>
 *       <div>訊息速率: {metrics?.messageRate}/秒</div>
 *       <div>品質評分: {metrics?.qualityScore}/100</div>
 *       <div>健康狀態: {health.isHealthy ? '✅' : '⚠️'}</div>
 *     </div>
 *   )
 * }
 * ```
 *
 * 🔍 除錯工具：
 *
 * ### 檢查訂閱狀態：
 * ```typescript
 * // 在瀏覽器 Console 執行
 * const stats = useMarketDataStore.getState().getStats()
 * console.log('訂閱統計:', stats)
 * // 輸出：
 * // {
 * //   priceSubscriptions: 10,    // 價格訂閱數量
 * //   klineSubscriptions: 3,     // K線訂閱數量
 * //   totalPrices: 10,           // 已緩存的價格數量
 * //   totalKlines: 3             // 已緩存的 K線數量
 * // }
 * ```
 *
 * ### 檢查連接狀態：
 * ```typescript
 * const state = useWebSocketStore.getState().getConnectionState()
 * console.log('連接狀態:', state)
 * // 輸出：
 * // {
 * //   status: 'connected',
 * //   connectedAt: 1234567890,
 * //   lastError: null,
 * //   reconnectAttempts: 0,
 * //   url: 'wss://stream.binance.com:9443/ws'
 * // }
 * ```
 *
 * ⚠️ 注意事項：
 *
 * 1. **StrictMode 不再是問題**
 *    - 舊：每次 remount 都會斷線重連
 *    - 新：參照計數機制自動處理
 *
 * 2. **訂閱會自動去重**
 *    - 3 個元件訂閱同一資料只發送 1 次請求
 *    - 不需要手動管理訂閱狀態
 *
 * 3. **記得使用 useWebSocket()**
 *    - 至少要有一個元件呼叫 useWebSocket()
 *    - 這樣才會建立 WebSocket 連接
 *
 * 4. **效能優化已內建**
 *    - 訊息批次處理（requestAnimationFrame）
 *    - 節流更新（500ms）
 *    - Zustand 精準訂閱
 *
 * 📝 遷移檢查清單：
 *
 * - ✅ 移除所有 binanceWebSocketService.connect() 呼叫
 * - ✅ 移除所有 binanceWebSocketService.disconnect() 呼叫
 * - ✅ 移除所有 binanceWebSocketService.subscribe() 呼叫
 * - ✅ 移除所有 binanceWebSocketService.subscribeKLine() 呼叫
 * - ✅ 使用 useWebSocket() hook 管理連接
 * - ✅ 使用 useCryptoPrices() hook 管理價格
 * - ✅ 使用 useKLineChart() hook 管理 K線
 * - ✅ 測試 React StrictMode 是否正常
 * - ✅ 測試多個元件訂閱同一資料
 * - ✅ 測試元件 unmount 時是否正確清理
 *
 * 🎉 重構完成！
 * 所有 hooks 已遷移到企業級架構，並保持完全向後兼容。
 */
/* eslint-enable @typescript-eslint/no-explicit-any */

import { create } from "zustand";
import {
  ConnectionManager,
  type UnsubscribeFunction,
  type TimeFrame,
} from "../services/websocket";
import type { PriceUpdate, KLine } from "../utils/validation";

/**
 * ==================== Market Data Store ====================
 *
 * 📚 架構層說明：
 * 這是管理所有市場數據的中央 Store（價格、K線等）
 * 使用 ConnectionManager 進行訂閱，自動處理訂閱去重和生命週期
 *
 * 🎯 設計目標：
 * 1. 集中管理：所有市場數據集中在一個 Store
 * 2. 訂閱去重：多個元件訂閱同一個 symbol 只發送一次請求
 * 3. 自動清理：當沒有元件訂閱時自動取消訂閱
 * 4. 精準更新：使用 Zustand 選擇器避免不必要的重渲染
 * 5. 類型安全：完整的 TypeScript 類型支援
 *
 * 💡 核心概念：
 *
 * ### 訂閱去重
 * 問題：3 個元件都訂閱 BTCUSDT 價格，會發送 3 次訂閱請求嗎？
 * 答案：不會！SubscriptionManager 會自動去重
 *
 * 流程：
 * 1. 元件 A 訂閱 BTCUSDT → 發送訂閱請求
 * 2. 元件 B 訂閱 BTCUSDT → 重用現有訂閱（不發送請求）
 * 3. 元件 C 訂閱 BTCUSDT → 重用現有訂閱（不發送請求）
 * 4. 收到價格更新 → 通知 A、B、C 三個元件
 *
 * ### 自動清理
 * 問題：當元件 unmount 時，訂閱會自動取消嗎？
 * 答案：會！每個 subscribe 方法返回 unsubscribe 函數
 *
 * 流程：
 * 1. 元件 A unmount → 呼叫 unsubscribe → refCount 3→2
 * 2. 元件 B unmount → 呼叫 unsubscribe → refCount 2→1
 * 3. 元件 C unmount → 呼叫 unsubscribe → refCount 1→0
 * 4. refCount = 0 → 發送取消訂閱請求
 *
 * ### Zustand 精準訂閱
 * 問題：BTCUSDT 價格更新，會導致訂閱 ETHUSDT 的元件也重渲染嗎？
 * 答案：不會！使用 Zustand 選擇器可以精準訂閱
 *
 * 範例：
 * ```typescript
 * // 只訂閱 BTCUSDT 價格，ETHUSDT 變化不會觸發重渲染
 * const btcPrice = useMarketDataStore((state) => state.getPrice('BTCUSDT'))
 * ```
 *
 * 🏗️ 資料結構：
 * ```
 * prices: Map<symbol, PriceUpdate>
 *   ├─ BTCUSDT → { symbol, price, timestamp, changePercent24h }
 *   ├─ ETHUSDT → { symbol, price, timestamp, changePercent24h }
 *   └─ ...
 *
 * klines: Map<key, KLine[]>
 *   ├─ BTCUSDT_1h → [ { time, open, high, low, close, volume }, ... ]
 *   ├─ BTCUSDT_4h → [ { time, open, high, low, close, volume }, ... ]
 *   └─ ...
 *
 * subscriptions: Map<key, Set<callback>>
 *   ├─ price_BTCUSDT → Set(3) [ callbackA, callbackB, callbackC ]
 *   ├─ kline_BTCUSDT_1h → Set(1) [ callbackD ]
 *   └─ ...
 * ```
 */

/**
 * 訂閱回調函數類型
 *
 * 💡 泛型設計：
 * - SubscriptionCallback<PriceUpdate>: 價格訂閱
 * - SubscriptionCallback<KLine>: K線訂閱
 */
type SubscriptionCallback<T> = (data: T) => void;

/**
 * 訂閱資訊介面
 *
 * 📝 實作層說明：
 * 追蹤每個訂閱的詳細資訊：
 * - callbacks: 所有訂閱此資料的回調函數
 * - unsubscribe: ConnectionManager 返回的取消訂閱函數
 * - subscribedAt: 訂閱時間（用於調試）
 * - dataCount: 收到的資料數量（用於監控）
 */
interface SubscriptionInfo<T> {
  callbacks: Set<SubscriptionCallback<T>>; // 回調函數集合
  unsubscribe: UnsubscribeFunction | null; // ConnectionManager 的取消訂閱函數
  subscribedAt: number; // 訂閱時間戳
  dataCount: number; // 收到的資料數量
}

/**
 * Market Data Store 狀態介面
 */
interface MarketDataState {
  // ========== 資料存儲 ==========
  prices: Map<string, PriceUpdate>; // 價格資料：symbol → PriceUpdate
  klines: Map<string, KLine[]>; // K線資料：key → KLine[]

  // ========== 訂閱管理 ==========
  // 內部訂閱追蹤（不應直接訪問）
  _priceSubscriptions: Map<string, SubscriptionInfo<PriceUpdate>>;
  _klineSubscriptions: Map<string, SubscriptionInfo<KLine>>;

  // ========== 訂閱操作 ==========
  /**
   * 訂閱價格更新
   *
   * @param symbol - 交易對符號（如：'BTCUSDT'）
   * @param callback - 收到價格更新時的回調函數
   * @returns 取消訂閱函數
   *
   * 💡 使用範例：
   * ```typescript
   * useEffect(() => {
   *   const unsubscribe = useMarketDataStore.getState().subscribePrice(
   *     'BTCUSDT',
   *     (update) => {
   *       console.log('BTC Price:', update.price)
   *     }
   *   )
   *   return unsubscribe
   * }, [])
   * ```
   */
  subscribePrice: (
    symbol: string,
    callback: SubscriptionCallback<PriceUpdate>,
  ) => UnsubscribeFunction;

  /**
   * 訂閱 K線更新
   *
   * @param symbol - 交易對符號（如：'BTCUSDT'）
   * @param interval - 時間週期（如：'1h', '4h', '1d', '1w'）
   * @param callback - 收到 K線更新時的回調函數
   * @returns 取消訂閱函數
   *
   * 💡 使用範例：
   * ```typescript
   * useEffect(() => {
   *   const unsubscribe = useMarketDataStore.getState().subscribeKline(
   *     'BTCUSDT',
   *     '1h',
   *     (kline) => {
   *       console.log('New Kline:', kline)
   *     }
   *   )
   *   return unsubscribe
   * }, [])
   * ```
   */
  subscribeKline: (
    symbol: string,
    interval: TimeFrame,
    callback: SubscriptionCallback<KLine>,
  ) => UnsubscribeFunction;

  // ========== 資料選擇器 ==========
  /**
   * 獲取指定交易對的價格
   *
   * @param symbol - 交易對符號
   * @returns 價格資料或 undefined
   *
   * 💡 Zustand 精準訂閱：
   * ```typescript
   * // 只訂閱 BTCUSDT 價格，其他幣種變化不會觸發重渲染
   * const btcPrice = useMarketDataStore((state) => state.getPrice('BTCUSDT'))
   * ```
   */
  getPrice: (symbol: string) => PriceUpdate | undefined;

  /**
   * 獲取所有價格資料
   *
   * ⚠️ 警告：此方法會訂閱所有價格變化
   * 任何一個幣種價格更新都會觸發重渲染
   * 只在需要顯示完整列表時使用
   *
   * 💡 推薦：使用 getPriceList() 替代，它返回陣列形式
   */
  getAllPrices: () => Map<string, PriceUpdate>;

  /**
   * 獲取價格列表（陣列形式）
   *
   * @returns 價格資料陣列
   *
   * 💡 適合用於渲染列表：
   * ```typescript
   * const prices = useMarketDataStore((state) => state.getPriceList())
   * prices.map(price => <div key={price.symbol}>{price.price}</div>)
   * ```
   */
  getPriceList: () => PriceUpdate[];

  /**
   * 獲取指定交易對和時間週期的 K線資料
   *
   * @param symbol - 交易對符號
   * @param interval - 時間週期
   * @returns K線資料陣列
   *
   * 💡 Zustand 精準訂閱：
   * ```typescript
   * // 只訂閱 BTCUSDT 1h K線，其他數據變化不會觸發重渲染
   * const klines = useMarketDataStore((state) =>
   *   state.getKlines('BTCUSDT', '1h')
   * )
   * ```
   */
  getKlines: (symbol: string, interval: TimeFrame) => KLine[];

  // ========== 統計資訊 ==========
  /**
   * 獲取訂閱統計資訊
   *
   * @returns 統計資訊物件
   *
   * 💡 用途：
   * - 監控訂閱數量
   * - 調試訂閱問題
   * - 展示訂閱狀態
   */
  getStats: () => {
    priceSubscriptions: number; // 價格訂閱數量
    klineSubscriptions: number; // K線訂閱數量
    totalPrices: number; // 已緩存的價格數量
    totalKlines: number; // 已緩存的 K線數量
  };

  // ========== 內部方法 ==========
  /**
   * 更新價格資料（由 ConnectionManager 回調觸發）
   * ⚠️ 內部方法，不應直接呼叫
   */
  _updatePrice: (symbol: string, update: PriceUpdate) => void;

  /**
   * 更新 K線資料（由 ConnectionManager 回調觸發）
   * ⚠️ 內部方法，不應直接呼叫
   */
  _updateKline: (symbol: string, interval: TimeFrame, kline: KLine) => void;

  /**
   * 清理所有訂閱（測試用）
   * ⚠️ 危險操作，會取消所有訂閱
   */
  _clearAll: () => void;
}

/**
 * 建立 Market Data Store
 *
 * 💡 實作重點：
 * 1. 使用 ConnectionManager 進行訂閱（自動處理去重）
 * 2. 追蹤每個訂閱的回調函數（支援多個元件訂閱同一資料）
 * 3. 當最後一個回調被移除時，自動取消訂閱
 * 4. 使用 Map 存儲資料（O(1) 查詢效能）
 */
export const useMarketDataStore = create<MarketDataState>((set, get) => {
  // 獲取 ConnectionManager 單例
  const manager = ConnectionManager.getInstance();

  return {
    // ========== 初始狀態 ==========
    prices: new Map(),
    klines: new Map(),
    _priceSubscriptions: new Map(),
    _klineSubscriptions: new Map(),

    // ========== 訂閱操作 ==========

    /**
     * 訂閱價格更新
     *
     * 🎯 實作流程：
     * 1. 檢查是否已有訂閱（訂閱資訊存在於 _priceSubscriptions）
     * 2. 如果沒有訂閱：
     *    a. 建立新的訂閱資訊
     *    b. 呼叫 ConnectionManager.subscribePrice()
     *    c. 在回調中更新 Store 並通知所有訂閱者
     * 3. 將回調函數加入訂閱資訊的 callbacks Set
     * 4. 返回取消訂閱函數
     */
    subscribePrice: (symbol, callback) => {
      const state = get();
      let subInfo = state._priceSubscriptions.get(symbol);

      // 第一個訂閱者：需要向 ConnectionManager 發起訂閱
      if (!subInfo) {
        console.log(`[MarketDataStore] New price subscription: ${symbol}`);

        // 建立訂閱資訊
        subInfo = {
          callbacks: new Set(),
          unsubscribe: null,
          subscribedAt: Date.now(),
          dataCount: 0,
        };

        // 向 ConnectionManager 訂閱
        // 💡 關鍵：所有訂閱者共享同一個 ConnectionManager 訂閱
        const unsubscribeFromManager = manager.subscribePrice(
          symbol,
          (update: PriceUpdate) => {
            const currentSubInfo = get()._priceSubscriptions.get(symbol);
            if (!currentSubInfo) return;

            // 更新資料計數
            currentSubInfo.dataCount++;

            // 更新 Store 中的價格資料
            get()._updatePrice(symbol, update);

            // 通知所有訂閱者
            // 💡 一個 WebSocket 訊息 → 通知多個 React 元件
            currentSubInfo.callbacks.forEach((cb) => {
              try {
                cb(update);
              } catch (error) {
                console.error(
                  `[MarketDataStore] Error in price callback for ${symbol}:`,
                  error,
                );
              }
            });
          },
        );

        subInfo.unsubscribe = unsubscribeFromManager;

        // 更新訂閱資訊
        set((state) => {
          const newSubs = new Map(state._priceSubscriptions);
          newSubs.set(symbol, subInfo!);
          return { _priceSubscriptions: newSubs };
        });
      }

      // 將回調函數加入訂閱者列表
      subInfo.callbacks.add(callback);
      console.log(
        `[MarketDataStore] Price subscription count for ${symbol}: ${subInfo.callbacks.size}`,
      );

      // 返回取消訂閱函數
      // 💡 每個訂閱者都有自己的取消訂閱函數
      return () => {
        const currentSubInfo = get()._priceSubscriptions.get(symbol);
        if (!currentSubInfo) return;

        // 移除回調函數
        currentSubInfo.callbacks.delete(callback);
        console.log(
          `[MarketDataStore] Price unsubscribe ${symbol}, remaining: ${currentSubInfo.callbacks.size}`,
        );

        // 如果沒有訂閱者了，取消 ConnectionManager 訂閱
        if (currentSubInfo.callbacks.size === 0) {
          console.log(
            `[MarketDataStore] No more subscribers for ${symbol}, unsubscribing from ConnectionManager`,
          );

          // 呼叫 ConnectionManager 的取消訂閱函數
          currentSubInfo.unsubscribe?.();

          // 移除訂閱資訊
          set((state) => {
            const newSubs = new Map(state._priceSubscriptions);
            newSubs.delete(symbol);
            return { _priceSubscriptions: newSubs };
          });
        }
      };
    },

    /**
     * 訂閱 K線更新
     *
     * 🎯 實作流程：（與 subscribePrice 類似）
     * 1. 使用 `${symbol}_${interval}` 作為 key（區分不同時間週期）
     * 2. 管理 K線訂閱資訊
     * 3. 收到新 K線時：
     *    a. 如果時間相同：更新最後一根 K線（同一週期內的更新）
     *    b. 如果時間不同：添加新 K線（新週期開始）
     */
    subscribeKline: (symbol, interval, callback) => {
      const state = get();
      const key = `${symbol}_${interval}`;
      let subInfo = state._klineSubscriptions.get(key);

      // 第一個訂閱者：需要向 ConnectionManager 發起訂閱
      if (!subInfo) {
        console.log(`[MarketDataStore] New kline subscription: ${key}`);

        subInfo = {
          callbacks: new Set(),
          unsubscribe: null,
          subscribedAt: Date.now(),
          dataCount: 0,
        };

        // 向 ConnectionManager 訂閱 K線
        const unsubscribeFromManager = manager.subscribeKline(
          symbol,
          interval,
          (kline: KLine) => {
            const currentSubInfo = get()._klineSubscriptions.get(key);
            if (!currentSubInfo) return;

            currentSubInfo.dataCount++;

            // 更新 Store 中的 K線資料
            get()._updateKline(symbol, interval, kline);

            // 通知所有訂閱者
            currentSubInfo.callbacks.forEach((cb) => {
              try {
                cb(kline);
              } catch (error) {
                console.error(
                  `[MarketDataStore] Error in kline callback for ${key}:`,
                  error,
                );
              }
            });
          },
        );

        subInfo.unsubscribe = unsubscribeFromManager;

        set((state) => {
          const newSubs = new Map(state._klineSubscriptions);
          newSubs.set(key, subInfo!);
          return { _klineSubscriptions: newSubs };
        });
      }

      // 將回調函數加入訂閱者列表
      subInfo.callbacks.add(callback);
      console.log(
        `[MarketDataStore] Kline subscription count for ${key}: ${subInfo.callbacks.size}`,
      );

      // 返回取消訂閱函數
      return () => {
        const currentSubInfo = get()._klineSubscriptions.get(key);
        if (!currentSubInfo) return;

        currentSubInfo.callbacks.delete(callback);
        console.log(
          `[MarketDataStore] Kline unsubscribe ${key}, remaining: ${currentSubInfo.callbacks.size}`,
        );

        // 最後一個訂閱者離開，取消 ConnectionManager 訂閱
        if (currentSubInfo.callbacks.size === 0) {
          console.log(
            `[MarketDataStore] No more subscribers for ${key}, unsubscribing from ConnectionManager`,
          );

          currentSubInfo.unsubscribe?.();

          set((state) => {
            const newSubs = new Map(state._klineSubscriptions);
            newSubs.delete(key);
            return { _klineSubscriptions: newSubs };
          });
        }
      };
    },

    // ========== 資料選擇器 ==========

    /**
     * 獲取價格資料
     *
     * 💡 Zustand 精準訂閱範例：
     * ```typescript
     * // 方式 1：只訂閱特定幣種價格
     * const btcPrice = useMarketDataStore((state) => state.getPrice('BTCUSDT'))
     *
     * // 方式 2：只訂閱價格數值（更精準）
     * const btcPriceValue = useMarketDataStore(
     *   (state) => state.getPrice('BTCUSDT')?.price
     * )
     * ```
     */
    getPrice: (symbol) => {
      return get().prices.get(symbol);
    },

    /**
     * 獲取所有價格
     *
     * ⚠️ 任何價格變化都會觸發使用此方法的元件重渲染
     */
    getAllPrices: () => {
      return get().prices;
    },

    /**
     * 獲取價格列表（陣列形式）
     *
     * 💡 適合用於 React 列表渲染
     */
    getPriceList: () => {
      return Array.from(get().prices.values());
    },

    /**
     * 獲取 K線資料
     *
     * 💡 Zustand 精準訂閱範例：
     * ```typescript
     * // 只訂閱 BTCUSDT 1h K線
     * const klines = useMarketDataStore((state) =>
     *   state.getKlines('BTCUSDT', '1h')
     * )
     *
     * // 只訂閱 K線數量（更精準）
     * const klineCount = useMarketDataStore(
     *   (state) => state.getKlines('BTCUSDT', '1h').length
     * )
     * ```
     */
    getKlines: (symbol, interval) => {
      const key = `${symbol}_${interval}`;
      return get().klines.get(key) || [];
    },

    // ========== 統計資訊 ==========

    /**
     * 獲取統計資訊
     *
     * 💡 用於監控和調試
     */
    getStats: () => {
      const state = get();
      return {
        priceSubscriptions: state._priceSubscriptions.size,
        klineSubscriptions: state._klineSubscriptions.size,
        totalPrices: state.prices.size,
        totalKlines: state.klines.size,
      };
    },

    // ========== 內部方法 ==========

    /**
     * 更新價格資料
     *
     * ⚠️ 內部方法，由 ConnectionManager 回調觸發
     */
    _updatePrice: (symbol, update) => {
      set((state) => {
        const newPrices = new Map(state.prices);
        newPrices.set(symbol, update);
        return { prices: newPrices };
      });
    },

    /**
     * 更新 K線資料
     *
     * ⚠️ 內部方法，由 ConnectionManager 回調觸發
     *
     * 🎯 K線更新邏輯：
     * 1. 檢查最後一根 K線的時間
     * 2. 如果時間相同：更新最後一根（週期內更新）
     * 3. 如果時間不同：添加新 K線（新週期）
     * 4. 限制 K線數量（保留最近 200 根，避免記憶體溢出）
     */
    _updateKline: (symbol, interval, kline) => {
      set((state) => {
        const key = `${symbol}_${interval}`;
        const newKlines = new Map(state.klines);
        const currentKlines = newKlines.get(key) || [];

        // 創建新陣列（不直接修改原陣列）
        let updatedKlines = [...currentKlines];

        // 檢查是否更新現有 K線
        if (
          updatedKlines.length > 0 &&
          updatedKlines[updatedKlines.length - 1].time === kline.time
        ) {
          // 更新最後一根 K線（同一週期內的價格變化）
          updatedKlines[updatedKlines.length - 1] = kline;
        } else {
          // 添加新 K線（新週期開始）
          updatedKlines.push(kline);
        }

        // 限制 K線數量（保留最近 200 根）
        // 💡 避免記憶體無限增長
        if (updatedKlines.length > 200) {
          updatedKlines = updatedKlines.slice(-200);
        }

        newKlines.set(key, updatedKlines);
        return { klines: newKlines };
      });
    },

    /**
     * 清理所有訂閱
     *
     * ⚠️ 危險操作，會取消所有訂閱並清空資料
     * 主要用於測試或重置狀態
     */
    _clearAll: () => {
      const state = get();

      // 取消所有價格訂閱
      state._priceSubscriptions.forEach((subInfo) => {
        subInfo.unsubscribe?.();
      });

      // 取消所有 K線訂閱
      state._klineSubscriptions.forEach((subInfo) => {
        subInfo.unsubscribe?.();
      });

      // 清空所有資料
      set({
        prices: new Map(),
        klines: new Map(),
        _priceSubscriptions: new Map(),
        _klineSubscriptions: new Map(),
      });

      console.log("[MarketDataStore] All subscriptions cleared");
    },
  };
});

/**
 * 便利 Hooks
 *
 * 💡 提供更符合 React 習慣的 API
 */

/**
 * 使用價格資料
 *
 * @param symbol - 交易對符號
 * @returns 價格資料
 *
 * 💡 使用範例：
 * ```typescript
 * function PriceDisplay({ symbol }: { symbol: string }) {
 *   const price = usePrice(symbol)
 *
 *   if (!price) return <div>Loading...</div>
 *
 *   return (
 *     <div>
 *       {symbol}: ${price.price.toFixed(2)}
 *       <span>{price.changePercent24h.toFixed(2)}%</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePrice(symbol: string): PriceUpdate | undefined {
  return useMarketDataStore((state) => state.getPrice(symbol));
}

/**
 * 使用 K線資料
 *
 * @param symbol - 交易對符號
 * @param interval - 時間週期
 * @returns K線資料陣列
 *
 * 💡 使用範例：
 * ```typescript
 * function KlineChart({ symbol }: { symbol: string }) {
 *   const klines = useKlines(symbol, '1h')
 *
 *   return <Chart data={klines} />
 * }
 * ```
 */
export function useKlines(symbol: string, interval: TimeFrame): KLine[] {
  return useMarketDataStore((state) => state.getKlines(symbol, interval));
}

/**
 * 使用價格列表
 *
 * @returns 所有價格資料
 *
 * 💡 使用範例：
 * ```typescript
 * function PriceList() {
 *   const prices = usePriceList()
 *
 *   return (
 *     <ul>
 *       {prices.map(price => (
 *         <li key={price.symbol}>{price.symbol}: ${price.price}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function usePriceList(): PriceUpdate[] {
  return useMarketDataStore((state) => state.getPriceList());
}

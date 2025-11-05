/**
 * WebSocket 常量定義
 *
 * 📚 學習重點：
 * 1. 集中管理魔術數字（Magic Numbers）
 * 2. 使用 as const 確保類型安全
 * 3. 配置值的合理設定
 *
 * 🎯 最佳實踐：
 * - 避免在程式碼中散布魔術數字
 * - 使用語義化的常量名稱
 * - 提供註解說明數值的來源和意義
 */

/**
 * Binance WebSocket API 端點
 *
 * 📚 Binance API 說明：
 * - 公開市場流：不需要認證，用於獲取市場資料
 * - 私有用戶流：需要 listenKey，用於獲取用戶訂單和帳戶資料
 *
 * 💡 連接埠說明：
 * - 9443: 標準 WSS 埠
 * - 443: 備用埠（某些防火牆可能阻擋 9443）
 */
export const BINANCE_WS_ENDPOINTS = {
  /** 公開市場資料流（當前使用） */
  PUBLIC_STREAM: "wss://stream.binance.com:9443/ws",

  /** 公開市場資料流（備用端點） */
  PUBLIC_STREAM_BACKUP: "wss://stream.binance.com:443/ws",

  /** 私有用戶資料流（預留，未來擴展） */
  USER_STREAM: "wss://stream.binance.com:9443/ws",
} as const;

/**
 * 連接超時時間（毫秒）
 *
 * 💡 設定考量：
 * - 10秒：正常網路環境下足夠建立連接
 * - 太短：可能因網路波動導致誤判
 * - 太長：影響用戶體驗
 */
export const CONNECTION_TIMEOUT = 10000;

/**
 * 心跳檢測配置
 *
 * 🎯 為什麼需要心跳檢測？
 * 問題：WebSocket 可能「靜默斷線」
 * - TCP 連接仍然存在
 * - 但實際上已經無法傳輸資料
 * - WebSocket API 不會觸發 onclose 事件
 *
 * 解決：定期檢查是否收到訊息
 * - 如果超過閾值沒收到訊息，主動重連
 *
 * 💡 Binance 市場資料特性：
 * - 熱門交易對（BTC, ETH）：每秒都有更新
 * - 冷門交易對：可能數秒才有一次更新
 * - 因此設定 10 秒是合理的閾值
 */
export const HEARTBEAT_CONFIG = {
  /** 心跳檢測間隔（毫秒） */
  INTERVAL: 5000,

  /** 心跳超時閾值（毫秒）- 超過此時間沒收到訊息視為連接異常 */
  TIMEOUT: 10000,

  /** 是否啟用心跳檢測 */
  ENABLED: true,
} as const;

/**
 * 重連策略配置
 *
 * 📚 指數退避演算法（Exponential Backoff）：
 * 重連延遲：1s → 2s → 4s → 8s → 16s → 30s（最大值）
 *
 * 🎯 為什麼使用指數退避？
 * 1. 避免「雷擊效應」：大量客戶端同時重連導致伺服器過載
 * 2. 節省資源：網路長時間中斷時，減少無意義的重連嘗試
 * 3. 自適應：短暫中斷快速恢復，長時間中斷避免浪費資源
 *
 * 💡 交易所最佳實踐：
 * - 最大重連次數 5 次（Binance 建議）
 * - 超過後需要用戶手動刷新
 * - 避免無限重連消耗用戶流量
 */
export const RECONNECT_STRATEGY = {
  /** 初始延遲（毫秒） */
  INITIAL_DELAY: 1000,

  /** 最大延遲（毫秒） */
  MAX_DELAY: 30000,

  /** 延遲倍數（每次失敗後延遲乘以此倍數） */
  MULTIPLIER: 2,

  /** 最大重連次數 */
  MAX_ATTEMPTS: 5,

  /** 是否啟用抖動（Jitter）- 在延遲上加入隨機值，避免同步重連 */
  ENABLE_JITTER: true,

  /** 抖動範圍（0-1，表示延遲的百分比） */
  JITTER_FACTOR: 0.1,
} as const;

/**
 * 訊息佇列配置
 *
 * 🎯 效能優化關鍵參數：
 *
 * BATCH_SIZE（批次大小）：
 * - 設定為 50：平衡即時性和效能
 * - 太小（<10）：批次效果不明顯
 * - 太大（>100）：延遲過高，影響即時性
 *
 * MAX_QUEUE_SIZE（佇列最大長度）：
 * - 設定為 1000：防止記憶體溢位
 * - 計算：假設每筆訊息 1KB，1000 筆 ≈ 1MB
 * - 正常情況下不會達到此限制
 * - 達到時丟棄舊訊息（保留最新資料更重要）
 *
 * MESSAGE_EXPIRY（訊息過期時間）：
 * - 設定為 5000ms：超過 5 秒的價格資料已經失去意義
 * - 交易決策需要即時資料，過期資料應該丟棄
 *
 * 💡 requestAnimationFrame：
 * - 瀏覽器每幀約 16ms（60 FPS）
 * - 在每一幀處理一批訊息
 * - 不阻塞渲染，保持 UI 流暢
 */
export const MESSAGE_QUEUE_CONFIG = {
  /** 批次大小 */
  BATCH_SIZE: 50,

  /** 佇列最大長度 */
  MAX_QUEUE_SIZE: 1000,

  /** 處理間隔（毫秒）- 使用 requestAnimationFrame 時此值無效 */
  PROCESS_INTERVAL: 16,

  /** 訊息過期時間（毫秒） */
  MESSAGE_EXPIRY: 5000,

  /** 是否啟用訊息合併（同一 symbol 只保留最新資料） */
  ENABLE_MERGE: true,

  /** 是否啟用優先級處理 */
  ENABLE_PRIORITY: false,
} as const;

/**
 * 訂閱限制
 *
 * 📚 Binance API 限制：
 * - 每個 WebSocket 連接最多 1024 個訂閱
 * - 超過會被伺服器拒絕
 * - 需要在客戶端進行限制檢查
 *
 * 💡 實際建議：
 * - 保守設定 100 個（專案當前需求）
 * - 如需更多訂閱，建立多個 WebSocket 連接（連接池）
 */
export const SUBSCRIPTION_LIMITS = {
  /** 每個連接的最大訂閱數 */
  MAX_PER_CONNECTION: 100,

  /** Binance 的硬性限制（文件說明） */
  BINANCE_HARD_LIMIT: 1024,

  /** 訂閱請求超時（毫秒） */
  REQUEST_TIMEOUT: 5000,
} as const;

/**
 * 參照計數配置
 *
 * 🎯 解決 React StrictMode 雙重掛載問題：
 *
 * DISCONNECT_DELAY（斷線延遲）：
 * - 設定為 500ms：給予 StrictMode 足夠的重掛載時間
 * - 流程：refCount 降為 0 → 等待 500ms → 檢查 refCount
 * - 如果 500ms 內重新掛載，取消斷線
 * - 如果 500ms 後仍為 0，才真正斷線
 *
 * 💡 為什麼是 500ms？
 * - StrictMode 重掛載通常在 10ms 內完成
 * - 500ms 是安全邊界，不會影響用戶體驗
 * - 太短（<100ms）：可能來不及取消
 * - 太長（>1000ms）：用戶已經離開頁面還保持連接
 */
export const REFERENCE_COUNTING = {
  /** 延遲斷線時間（毫秒） */
  DISCONNECT_DELAY: 500,

  /** 初始參照計數 */
  INITIAL_COUNT: 0,
} as const;

/**
 * 效能監控配置
 *
 * 📊 監控指標收集頻率：
 * - METRICS_UPDATE_INTERVAL: 每 1 秒更新一次效能指標
 * - STATS_WINDOW: 統計視窗 60 秒（計算速率時使用）
 *
 * 💡 監控指標包括：
 * - 延遲（Latency）
 * - 訊息速率（Message Rate）
 * - 連接品質評分（Quality Score）
 */
export const PERFORMANCE_CONFIG = {
  /** 效能指標更新間隔（毫秒） */
  METRICS_UPDATE_INTERVAL: 1000,

  /** 統計視窗大小（毫秒） */
  STATS_WINDOW: 60000,

  /** 延遲樣本數量（用於計算平均值） */
  LATENCY_SAMPLES: 100,

  /** 是否啟用效能監控 */
  ENABLED: true,
} as const;

/**
 * 除錯配置
 *
 * 🛠️ 開發環境設定：
 * - 可通過環境變數控制
 * - 生產環境建議關閉詳細日誌
 */
export const DEBUG_CONFIG = {
  /** 是否啟用除錯日誌 */
  ENABLED: import.meta.env.DEV,

  /** 是否記錄所有訊息（會產生大量日誌） */
  LOG_ALL_MESSAGES: false,

  /** 是否記錄效能指標 */
  LOG_PERFORMANCE: true,

  /** 是否記錄訂閱操作 */
  LOG_SUBSCRIPTIONS: true,

  /** 是否記錄連接事件 */
  LOG_CONNECTIONS: true,
} as const;

/**
 * 連接品質評分標準
 *
 * 📊 評分演算法：
 * 綜合考慮多個指標：
 * 1. 延遲（Latency）: < 100ms 優秀，100-500ms 良好，> 500ms 差
 * 2. 訊息速率（Message Rate）: 穩定收到更新
 * 3. 錯誤率（Error Rate）: 低錯誤率
 *
 * 評分範圍：0-100
 * - 90-100: 優秀（綠色）
 * - 70-89: 良好（黃色）
 * - < 70: 差（紅色）
 *
 * 💡 用途：
 * - UI 顯示連接品質指示器
 * - 品質過低時提示用戶
 * - 決策是否需要重連
 */
export const QUALITY_THRESHOLDS = {
  /** 優秀延遲（毫秒） */
  EXCELLENT_LATENCY: 100,

  /** 良好延遲（毫秒） */
  GOOD_LATENCY: 500,

  /** 最小訊息速率（訊息/秒）- 低於此值視為異常 */
  MIN_MESSAGE_RATE: 0.1,

  /** 最大錯誤率（百分比）- 超過此值視為連接品質差 */
  MAX_ERROR_RATE: 5,
} as const;

/**
 * 預設配置集合
 *
 * 💡 使用方式：
 * const config = { ...DEFAULT_CONFIG, ...userConfig }
 */
export const DEFAULT_CONFIG = {
  connection: {
    timeout: CONNECTION_TIMEOUT,
    autoReconnect: true,
    debug: DEBUG_CONFIG.ENABLED,
  },
  heartbeat: HEARTBEAT_CONFIG,
  reconnect: RECONNECT_STRATEGY,
  queue: MESSAGE_QUEUE_CONFIG,
  subscription: SUBSCRIPTION_LIMITS,
  performance: PERFORMANCE_CONFIG,
} as const;

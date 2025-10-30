# Feature Specification: Crypto Realtime Dashboard

**Feature Branch**: `001-crypto-realtime`  
**Created**: 2025年10月30日  
**Status**: Draft  
**Input**: User description: "Crypto Realtime Dashboard 是一個前端專案，提供即時加密貨幣行情與圖表，支援即時價格更新、K 線圖、收藏自選幣種清單。"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 瀏覽即時加密貨幣價格 (Priority: P1)

投資者進入儀表板後，能看到常見加密貨幣（如 BTC、ETH、USDT 等）的即時價格、24小時漲跌幅，並能自動更新而無需手動刷新。

**Why this priority**: 即時價格查詢是投資者最核心的需求，直接關係到投資決策。P1 優先級確保 MVP 可提供基礎價值。

**Independent Test**: 可獨立測試 - 啟動應用程式時，驗證是否顯示至少 5 種主流幣種的價格與漲跌幅，且 30 秒內自動更新一次。

**Acceptance Scenarios**:

1. **Given** 使用者首次打開儀表板, **When** 頁面加載完成, **Then** 顯示至少 5 種主流加密貨幣（BTC、ETH、BNB、SOL、XRP）的實時價格與 24 小時漲跌幅百分比與漲跌金額
2. **Given** 使用者已進入儀表板並看到價格, **When** 經過 30 秒, **Then** 價格自動更新，新價格與舊價格不同時展示視覺反饋（如顏色變化）
3. **Given** 使用者正在查看價格, **When** 網路連線中斷, **Then** 顯示離線通知，停止更新，並保留最後一次成功的價格數據

---

### User Story 2 - 查看 K 線圖表分析 (Priority: P1)

投資者點擊特定幣種後，能看到該幣種的 K 線圖表，支援多時間框架（1小時、4小時、1天、1週），幫助進行技術分析。

**Why this priority**: K 線圖是投資者進行技術分析的必備工具，與即時價格同等重要，構成 MVP 核心功能。

**Independent Test**: 可獨立測試 - 選擇任意幣種，驗證能否顯示 K 線圖表，且支援在不同時間框架間切換。

**Acceptance Scenarios**:

1. **Given** 使用者看到幣種列表, **When** 點擊任一幣種（如 BTC）, **Then** 頁面導航至該幣種詳情，顯示 K 線圖表且預設時間框架為 1 天
2. **Given** 使用者在 K 線圖表頁面, **When** 切換時間框架（1小時、4小時、1天、1週）, **Then** 圖表平順更新，展示對應時間框架的蠟燭線數據
3. **Given** 使用者在查看 K 線圖表, **When** 新的蠟燭線數據到達, **Then** 圖表即時更新，最新蠟燭線出現在圖表右側

---

### User Story 3 - 收藏自選幣種清單 (Priority: P2)

投資者能將常關注的幣種收藏到自選清單，方便快速查看，清單應持久化存儲（瀏覽器本地存儲）。

**Why this priority**: 提升用戶體驗，讓常用投資者能快速存取關注的幣種。P2 優先級因為不影響核心的即時價格與圖表功能，但增加黏著度。

**Independent Test**: 可獨立測試 - 能將幣種加入自選清單，刷新頁面後清單仍存在，且能移除收藏。

**Acceptance Scenarios**:

1. **Given** 使用者在幣種列表或詳情頁, **When** 點擊收藏按鈕（星號圖示）, **Then** 幣種被添加到自選清單，按鈕視覺狀態改變（如填滿星號）
2. **Given** 使用者已收藏幣種, **When** 刷新瀏覽器或重新訪問應用, **Then** 自選清單仍保存，收藏的幣種仍然顯示
3. **Given** 使用者在自選清單中查看幣種, **When** 點擊移除按鈕, **Then** 幣種從清單移除，自動更新視圖

---

### User Story 4 - 練習前端即時資料處理 (Priority: P2)

前端工程師（作為二級用戶）使用此專案學習 WebSocket 和 TanStack Query 的實踐應用，程式碼應清晰註解，便於理解。

**Why this priority**: 目標用戶之一是學習者，提供高質量程式碼有助於教育價值。P2 優先級因為是學習目標而非用戶直觀功能。

**Independent Test**: 可獨立測試 - 程式碼倉庫中包含清晰的 WebSocket 連接與資料管理文件，新手開發者能跟隨程式碼理解資料流。

**Acceptance Scenarios**:

1. **Given** 開發者查看專案程式碼, **When** 查看 WebSocket 連接模組, **Then** 代碼包含充分註解，解釋連接、認證、錯誤恢復邏輯
2. **Given** 開發者查看狀態管理代碼, **When** 查看 TanStack Query 的使用, **Then** 代碼展示快取策略、重試邏輯、同步策略的實踐

### Edge Cases

- 當加密貨幣價格波動超過 10% 時，如何視覺提示用戶？
- 若 WebSocket 連線在蠟燭線形成期間斷開，如何確保資料一致性？
- 當本地存儲已滿或不可用時，應用應如何降級（是否仍允許收藏功能，或顯示警告）？
- 若同時訂閱超過 50 種幣種，如何確保 UI 響應性能不受影響？
- 用戶在離線狀態下打開應用時，是否應顯示之前快取的價格數據？

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系統必須透過 WebSocket 連接即時行情數據源，實時接收加密貨幣的最新價格與交易量
- **FR-002**: 系統必須在儀表板首頁顯示至少 10 種主流加密貨幣（包含 BTC、ETH、BNB、SOL、XRP、USDT 等）的實時價格、24小時漲跌幅百分比與漲跌金額
- **FR-003**: 系統必須自動更新價格數據，更新頻率為每 30 秒或根據即時數據源推送頻率更新
- **FR-004**: 系統必須支援選擇特定幣種後顯示詳細 K 線圖表，支援 4 種時間框架：1小時、4小時、1天、1週
- **FR-005**: 系統必須在時間框架切換時平順更新圖表，避免閃爍或加載卡頓
- **FR-006**: 系統必須即時更新 K 線圖表中的最新蠟燭線數據，當新蠟燭線形成時自動刷新
- **FR-007**: 系統必須允許使用者透過點擊收藏按鈕將幣種添加至自選清單
- **FR-008**: 系統必須將自選清單持久化至瀏覽器本地存儲，使用者重新訪問應用時清單應保留
- **FR-009**: 系統必須允許使用者從自選清單移除幣種
- **FR-010**: 系統必須在網路連線中斷時顯示明確的連線狀態指示器（如「連線已中斷」提示），並停止價格更新
- **FR-011**: 系統必須在網路恢復後自動重新連接，無需使用者手動操作
- **FR-012**: 系統必須進行錯誤恢復，當 WebSocket 連接失敗時自動重試，最多重試 3 次，退避時間依次為 1 秒、2 秒、4 秒

### Key Entities *(include if feature involves data)*

- **Cryptocurrency (幣種)**: 代表單一加密貨幣，屬性包括代號（如 BTC）、中文名稱、符號、當前價格、24小時漲跌幅、24小時交易量、市值排名
- **PriceUpdate (價格更新)**: 即時價格推送事件，包含幣種 ID、新價格、時間戳記、漲跌幅度
- **KLine (蠟燭線)**: 代表特定時間框架的 K 線資料，包含開盤價、最高價、最低價、收盤價、成交量、時間戳記
- **Watchlist (自選清單)**: 使用者收藏的幣種集合，包含幣種 ID 清單、建立時間、最後更新時間
- **ConnectionStatus (連線狀態)**: WebSocket 連接狀態，包含狀態標誌（連接中、已連接、已斷開、重新連接中）、最後更新時間

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 使用者能在應用加載後 3 秒內看到至少 10 種幣種的實時價格，且頁面首屏加載時間不超過 2 秒
- **SC-002**: 價格更新延遲不超過 1 秒（即接收到 WebSocket 推送到頁面顯示新價格的時間差）
- **SC-003**: K 線圖表在時間框架切換時的重繪時間不超過 500 毫秒，用戶感知為平順過渡
- **SC-004**: 應用應能同時處理至少 20 種幣種的實時更新，UI 帧率保持在 60 FPS 以上
- **SC-005**: 自選清單操作（新增、移除、查看）的回應時間應在 100 毫秒以內
- **SC-006**: 90% 以上的使用者能在無輔助的情況下，3 分鐘內完成「查看幣種詳情和 K 線」的任務
- **SC-007**: 應用支援在網路連線不穩定環境下（如 3G 網路）正常運作，WebSocket 斷開後能在 5 秒內自動恢復連接
- **SC-008**: 收藏功能的本地存儲應能支援至少 100 個收藏幣種的資料無損保存

### Constitutional Compliance Requirements *(mandatory)*

- **CC-001**: Feature 必須達到最少 80% 測試覆蓋率，核心路徑（WebSocket 連接、價格更新、K 線渲染）達到 100% 覆蓋
- **CC-002**: 所有組件必須通過 WCAG 2.1 AA 無障礙標準，支援鍵盤導航、螢幕閱讀器相容性
- **CC-003**: 效能必須符合 Core Web Vitals 目標：FCP (First Contentful Paint) < 1.5 秒、LCP (Largest Contentful Paint) < 2.5 秒、TTI (Time to Interactive) < 3.5 秒
- **CC-004**: 即時功能必須顯示連線狀態指示器與資料新鮮度標記（如「資料更新於 XX 秒前」）
- **CC-005**: TypeScript strict mode 完全相容，ESLint 無任何警告

## Assumptions

- 使用公開免費或低成本的加密貨幣行情數據源（如 CoinGecko API 或類似 WebSocket 服務）
- 使用 React 框架搭建，搭配 TypeScript 確保型別安全
- 使用 TanStack Query（React Query）進行快取與資料同步管理
- 使用 Chart.js、Recharts 或 TradingView Lightweight Charts 等開源圖表庫渲染 K 線圖
- 使用瀏覽器原生 localStorage 作為本地存儲解決方案
- 應用部署於靜態託管環境（如 Vercel、Netlify），無需後端伺服器
- 初始上線時不包含用戶帳戶功能，所有資料以匿名方式儲存在本地

## Out of Scope

- 用戶帳戶系統、登錄認證功能
- 社交功能（如分享、評論、跟隨其他用戶）
- 交易下單功能（僅限查看行情與圖表）
- 多語言本地化（初版僅支援繁體中文與英文）
- 手機原生應用（僅支援 Web 應用）
- 後端 API 開發（使用第三方數據源）

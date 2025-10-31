# Tasks: Crypto Realtime Dashboard

**Branch**: `001-crypto-realtime`  
**Created**: 2025-10-31  
**Status**: Ready for Implementation  
**Total Tasks**: 48  
**MVP Scope**: Phase 1 (Setup), Phase 2 (Foundations), Phase 3 (User Story 1)

---

## Task Overview

| Phase                      | Task Count | User Stories | Est. Duration  |
| -------------------------- | ---------- | ------------ | -------------- |
| Phase 1: Setup             | 6          | —            | 2-3 days       |
| Phase 2: Foundations       | 9          | —            | 3-4 days       |
| Phase 3: User Story 1 (P1) | 11         | US1          | 4-5 days       |
| Phase 4: User Story 2 (P1) | 10         | US2          | 4-5 days       |
| Phase 5: User Story 3 (P2) | 8          | US3          | 2-3 days       |
| Phase 6: User Story 4 (P2) | 4          | US4          | 1-2 days       |
| **Total**                  | **48**     | 4            | **16-22 days** |

---

## Dependencies & Execution Strategy

### Dependency Graph

```
Phase 1: Setup
  ↓
Phase 2: Foundations (Project Structure, Types, Services)
  ├─→ Phase 3: US1 (Real-time Prices)
  │    └─→ Phase 4: US2 (K-Line Charts) [can run parallel after US1 foundation]
  ├─→ Phase 5: US3 (Watchlist) [parallel to Phase 3/4]
  └─→ Phase 6: US4 (Documentation) [parallel to Phase 3/4/5]
```

### Parallel Execution Opportunities

**After Phase 2 completion**, these phases can run in parallel:

- Phase 3 (US1) + Phase 5 (US3) - independent components
- Phase 4 (US2) - can start after US1 foundation tasks
- Phase 6 (US4) - documentation can proceed independently

**Recommended Execution Strategy**:

1. Execute Phase 1 sequentially (project setup)
2. Execute Phase 2 sequentially (foundational types, services, stores)
3. Execute Phase 3 (US1 foundation) → Then:
   - Parallel: Phase 4 (US2) + Phase 5 (US3) + Phase 6 (US4)

---

## MVP Scope (Minimum Viable Product)

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3

**MVP User Value**:

- ✅ Application setup with TypeScript, React, Tailwind CSS
- ✅ Type definitions and data validation for all entities
- ✅ WebSocket service for real-time price data
- ✅ Dashboard displaying 10+ cryptocurrencies with real-time prices
- ✅ Automatic price updates every 30 seconds
- ✅ Visual feedback for price changes
- ✅ Offline detection and status indicators

**Est. MVP Duration**: 9-12 days (Phase 1 + 2 + 3)

---

## Phase 1: Setup (Project Initialization)

Foundation tasks for project scaffolding and initial configuration.

### Story Goal

Establish development environment with TypeScript, React, build tooling, and testing frameworks configured.

### Independent Test Criteria

- Project builds successfully without errors
- Tests run and report correctly
- ESLint passes with zero warnings
- Type checking passes with TypeScript strict mode

### Implementation Tasks

- [ ] T001 Create project structure per implementation plan in `src/`, `tests/`, `public/` directories

- [ ] T002 Install and configure TypeScript 5.x with strict mode enabled in `tsconfig.json`

- [ ] T003 Install and configure React 18 with React Compiler enabled in `vite.config.ts`

- [ ] T004 Install and configure ESLint with zero-warnings policy in `eslint.config.js`

- [ ] T005 Install and configure Vitest + Playwright for unit and E2E testing in `vitest.config.ts` and `playwright.config.ts`

- [ ] T006 Verify CI/CD pipeline runs `npm test && npm run lint` successfully

---

## Phase 2: Foundations (Core Infrastructure)

Foundational infrastructure blocking all user stories.

### Story Goal

Establish type system, core services, state management, and React hooks that all features depend on.

### Independent Test Criteria

- All TypeScript types compile without errors
- Zod validation schemas work correctly
- WebSocket service connects/disconnects cleanly
- Storage service handles localStorage and fallback scenarios
- Zustand stores initialize with correct state
- All React hooks integrate with services correctly

### Implementation Tasks

#### Type Definitions & Validation

- [ ] T007 [P] Create TypeScript interfaces and Zod schemas for `Cryptocurrency` in `src/types/crypto.ts` and `src/utils/validation.ts`

- [ ] T008 [P] Create TypeScript interfaces and Zod schemas for `PriceUpdate` in `src/types/crypto.ts` and `src/utils/validation.ts`

- [ ] T009 [P] Create TypeScript interfaces and Zod schemas for `KLine` in `src/types/chart.ts` and `src/utils/validation.ts`

- [ ] T010 [P] Create TypeScript interfaces and Zod schemas for `Watchlist` in `src/types/storage.ts` and `src/utils/validation.ts`

- [ ] T011 [P] Create TypeScript interfaces and Zod schemas for `ConnectionStatus` in `src/types/websocket.ts` and `src/utils/validation.ts`

- [ ] T012 [P] Create TypeScript interfaces and Zod schemas for `ChartConfig` in `src/types/chart.ts` and `src/utils/validation.ts`

#### Service Layer

- [ ] T013 [P] Implement `BinanceWebSocketService` in `src/services/binance/websocket.ts` with connect, disconnect, subscribe, unsubscribe methods and proper error handling

- [ ] T014 [P] Implement `MapperService` in `src/services/binance/mapper.ts` to convert Binance API messages to domain types (PriceUpdate, KLine)

- [ ] T015 [P] Implement `StorageService` in `src/services/storage/localStorage.ts` with localStorage wrapper, fallback to memory storage, and watchlist operations

- [ ] T016 Create TanStack Query client configuration in `src/services/query/client.ts` with staleTime=30s, retry=3 with exponential backoff

- [ ] T017 Create utility functions in `src/utils/format.ts` for formatting prices, percentages, and volumes (e.g., formatPrice, formatPercent)

- [ ] T018 Create throttle/debounce utilities in `src/utils/throttle.ts` for managing high-frequency WebSocket updates

#### Global State Management

- [ ] T019 [P] Create Zustand WebSocket store in `src/stores/websocketStore.ts` with status, error, retryCount, and actions (setStatus, setError, incrementRetryCount)

- [ ] T020 [P] Create Zustand Watchlist store in `src/stores/watchlistStore.ts` with favorites array, isStorageAvailable flag, and operations (add, remove, clear, isFavorite)

- [ ] T021 Create React Query setup with custom hooks integration in `src/services/query/hooks.ts`

#### Custom React Hooks

- [ ] T022 [P] Implement `useWebSocket` hook in `src/hooks/useWebSocket.ts` to manage WebSocket connection lifecycle and connection status

- [ ] T023 [P] Implement `useCryptoPrice` hook in `src/hooks/useCryptoPrice.ts` to fetch and manage single cryptocurrency price data via TanStack Query

- [ ] T024 [P] Implement `useCryptoPrices` hook in `src/hooks/useCryptoPrices.ts` to fetch and manage multiple cryptocurrency prices via TanStack Query

- [ ] T025 Implement `useKLineChart` hook in `src/hooks/useKLineChart.ts` to fetch K-line data with interval switching capability

- [ ] T026 Implement `useWatchlist` hook in `src/hooks/useWatchlist.ts` to manage watchlist state and localStorage sync

#### Testing Foundation

- [ ] T027 Create test utilities and mocks in `tests/setup.ts` and `tests/mocks/binance.ts` for WebSocket and API responses

- [ ] T028 Write integration tests for storage service fallback behavior in `tests/integration/storage.test.ts`

- [ ] T029 Write integration tests for WebSocket reconnection logic in `tests/integration/websocket.test.ts`

---

## Phase 3: User Story 1 - Real-time Cryptocurrency Prices (P1)

Enable users to view real-time prices for 10+ mainstream cryptocurrencies with automatic updates.

### Story Goal

Display real-time cryptocurrency prices with automatic 30-second updates and visual feedback for price changes.

### Independent Test Criteria

- Dashboard displays at least 10 cryptocurrencies (BTC, ETH, BNB, SOL, XRP, USDT, ADA, DOGE, LTC, LINK)
- Price and 24h percentage change display correctly for each cryptocurrency
- Prices update automatically every 30 seconds
- Price changes show visual feedback (color animation)
- Offline mode displays "Connection lost" notification and stops updating
- Last known prices persist during offline periods

### Implementation Tasks

#### Components

- [ ] T030 [US1] Create `CryptoPriceCard` component in `src/components/crypto/CryptoPriceCard.tsx` displaying price, 24h change, volume with color coding

- [ ] T031 [US1] Create `PriceChangeIndicator` component in `src/components/crypto/PriceChangeIndicator.tsx` for visual feedback with animation

- [ ] T032 [US1] Create `ConnectionStatus` indicator component in `src/components/common/ConnectionStatus.tsx` showing WebSocket state

- [ ] T033 [P] [US1] Create `CryptoList` component in `src/components/crypto/CryptoList.tsx` displaying grid/list of cryptocurrency cards

#### Page & Integration

- [ ] T034 [US1] Create `Dashboard` page component in `src/pages/Dashboard.tsx` integrating price display with WebSocket connection management

- [ ] T035 [US1] Implement initial data loading for 10 mainstream cryptocurrencies in Dashboard (fetch historical prices via REST or mock)

- [ ] T036 [US1] Connect WebSocket service to Dashboard for real-time price updates using `useWebSocket` hook

- [ ] T037 [US1] Implement automatic price update subscription with 30-second refresh cycle in Dashboard

- [ ] T038 [US1] Implement visual feedback for price changes (color animation, direction indicator) in CryptoPriceCard

- [ ] T039 [US1] Add offline detection and "Connection lost" notification in ConnectionStatus component

- [ ] T040 [P] [US1] Implement error boundary and fallback UI for price display failures in Dashboard

#### Testing

- [ ] T041 Write component tests for CryptoPriceCard with mock data in `tests/unit/components/CryptoPriceCard.test.tsx`

- [ ] T042 Write component tests for CryptoList with multiple cryptos in `tests/unit/components/CryptoList.test.tsx`

- [ ] T043 Write E2E test for price display and update flow in `e2e/crypto-prices.spec.ts`

---

## Phase 4: User Story 2 - K-Line Chart Analysis (P1)

Enable users to analyze cryptocurrency prices using K-line charts with multiple timeframes.

### Story Goal

Display interactive K-line charts for selected cryptocurrencies with support for 4 timeframes (1h, 4h, 1d, 1w).

### Independent Test Criteria

- Chart displays with correct OHLCV data
- All 4 timeframes (1h, 4h, 1d, 1w) can be selected
- Chart updates smoothly when switching timeframes (< 500ms)
- Real-time candle updates when new K-line data arrives
- Chart respects selected cryptocurrency from navigation

### Implementation Tasks

#### Components

- [ ] T044 [P] [US2] Create `KLineChart` component wrapper in `src/components/chart/KLineChart.tsx` integrating TradingView Lightweight Charts library

- [ ] T045 [US2] Create `ChartControls` component in `src/components/chart/ChartControls.tsx` with timeframe selector (1h, 4h, 1d, 1w)

- [ ] T046 [US2] Create `ChartLoadingState` component in `src/components/chart/ChartLoadingState.tsx` for skeleton loading during chart transitions

- [ ] T047 [US2] Create `ChartErrorBoundary` component in `src/components/chart/ChartErrorBoundary.tsx` for graceful error handling

#### Page & Integration

- [ ] T048 [P] [US2] Create `CryptoDetail` page component in `src/pages/CryptoDetail.tsx` displaying K-line chart for selected cryptocurrency

- [ ] T049 [US2] Implement chart data fetching in CryptoDetail using `useKLineChart` hook with dynamic interval switching

- [ ] T050 [US2] Implement timeframe switching logic with chart update (< 500ms redraw time) in ChartControls

- [ ] T051 [US2] Implement real-time candle update via WebSocket in KLineChart component

- [ ] T052 [US2] Add chart theme support (light/dark) with configuration persistence in `src/stores/chartStore.ts`

- [ ] T053 [US2] Implement volume display toggle in ChartControls

#### Testing

- [ ] T054 Write component tests for KLineChart with mock chart library in `tests/unit/components/KLineChart.test.tsx`

- [ ] T055 Write component tests for ChartControls with interval switching in `tests/unit/components/ChartControls.test.tsx`

- [ ] T056 Write E2E test for crypto detail page and chart interaction flow in `e2e/crypto-charts.spec.ts`

---

## Phase 5: User Story 3 - Watchlist Management (P2)

Enable users to save favorite cryptocurrencies for quick access.

### Story Goal

Allow users to add/remove cryptocurrencies to a persistent watchlist stored in localStorage.

### Independent Test Criteria

- Can add cryptocurrency to watchlist
- Can remove cryptocurrency from watchlist
- Watchlist persists after page refresh
- Visual indicator shows favorited status
- Watchlist displays in dedicated view
- localStorage fallback with user warning works when storage unavailable

### Implementation Tasks

#### Components

- [ ] T057 [P] [US3] Create `FavoriteButton` component in `src/components/crypto/FavoriteButton.tsx` with star icon and toggle state

- [ ] T058 [P] [US3] Create `WatchlistView` component in `src/components/watchlist/WatchlistView.tsx` displaying list of favorite cryptocurrencies

- [ ] T059 [US3] Create `StorageWarning` component in `src/components/common/StorageWarning.tsx` for localStorage unavailable notification

#### Integration

- [ ] T060 [P] [US3] Implement watchlist persistence in `useWatchlist` hook with localStorage sync and memory fallback

- [ ] T061 [US3] Integrate FavoriteButton into CryptoPriceCard and CryptoDetail components

- [ ] T062 [US3] Add WatchlistView as sidebar/modal in Dashboard and CryptoDetail pages

- [ ] T063 [US3] Implement StorageWarning display logic when localStorage is unavailable

- [ ] T064 [US3] Add watchlist state to React Query cache invalidation strategy

#### Testing

- [ ] T065 Write component tests for FavoriteButton state changes in `tests/unit/components/FavoriteButton.test.tsx`

- [ ] T066 Write E2E test for watchlist add/remove/persistence flow in `e2e/watchlist.spec.ts`

---

## Phase 6: User Story 4 - Developer Experience & Documentation (P2)

Provide clear code documentation and learning materials for developers.

### Story Goal

Ensure code clarity and provide comprehensive comments for WebSocket and TanStack Query implementations.

### Independent Test Criteria

- All service layer functions have JSDoc comments
- WebSocket connection logic is well-commented
- Hook implementations have clear usage examples
- README includes getting started guide
- Code includes inline comments for complex logic

### Implementation Tasks

#### Documentation

- [ ] T067 [US4] Add comprehensive JSDoc comments to `BinanceWebSocketService` in `src/services/binance/websocket.ts`

- [ ] T068 [US4] Add comprehensive JSDoc comments to all custom hooks in `src/hooks/` directory

- [ ] T069 [US4] Create developer quickstart guide in `docs/developer-guide.md` explaining WebSocket connection, TanStack Query caching, state management

- [ ] T070 [US4] Create inline code comments for complex logic in WebSocket reconnection, data mapping, and throttling utilities

---

## Phase 7: Polish & Cross-Cutting Concerns (Post-MVP)

Final refinements, performance optimization, and comprehensive testing.

### Story Goal

Ensure production readiness with performance optimization, accessibility compliance, and comprehensive test coverage.

### Implementation Tasks

#### Performance Optimization

- [ ] T071 [P] Implement code splitting for Dashboard and CryptoDetail pages in `src/main.tsx` using React lazy loading

- [ ] T072 Implement virtual scrolling for cryptocurrency list if exceeding 50 items using `react-window`

- [ ] T073 Add performance monitoring in `src/utils/monitoring.ts` to track FCP, LCP, TTI metrics

#### Accessibility

- [ ] T074 Audit all components for WCAG 2.1 AA compliance using axe DevTools

- [ ] T075 Add keyboard navigation support (Tab, Arrow keys) to all interactive components

- [ ] T076 Add ARIA labels and semantic HTML to components requiring accessibility fixes

- [ ] T077 Test with screen reader (e.g., NVDA) and document accessibility guidelines

#### Testing

- [ ] T078 Achieve 80% overall test coverage with Vitest + Playwright

- [ ] T079 Write unit tests for utility functions (format, throttle, validation) in `tests/unit/utils/`

- [ ] T080 Write integration tests for WebSocket + TanStack Query sync in `tests/integration/`

- [ ] T081 Write E2E tests for complete user flows (price view → favorite → chart view → offline)

#### Build & Deployment

- [ ] T082 Verify bundle size < 250KB gzipped using `npm run build`

- [ ] T083 Optimize imports and tree-shake unused dependencies in `vite.config.ts`

- [ ] T084 Test application in production build mode: `npm run preview`

- [ ] T085 Create deployment configuration for Vercel/Netlify with environment variables (.env.example)

#### Documentation

- [ ] T086 Update README.md with feature overview, getting started, and deployment instructions

- [ ] T087 Create ARCHITECTURE.md documenting system design, data flow, and component hierarchy

- [ ] T088 Create TROUBLESHOOTING.md with common issues and solutions (WebSocket connection, localStorage, etc.)

---

## Testing Requirements

### Test Coverage Goals

- **Overall**: 80% code coverage
- **Critical Paths**: 100% coverage
  - WebSocket connection and reconnection logic
  - Price update and state management
  - K-line chart rendering and updates
  - Watchlist persistence and retrieval

### Test Strategy by Component Type

| Component Type       | Unit Tests | Integration | E2E | Min Coverage |
| -------------------- | ---------- | ----------- | --- | ------------ |
| Services             | ✅ Yes     | ✅ Yes      | —   | 100%         |
| Custom Hooks         | ✅ Yes     | ✅ Yes      | —   | 100%         |
| Zustand Stores       | ✅ Yes     | ✅ Yes      | —   | 100%         |
| Presentational Comps | ✅ Yes     | —           | ✅  | 80%+         |
| Container Comps      | ✅ Yes     | ✅ Yes      | ✅  | 80%+         |
| Utils & Helpers      | ✅ Yes     | —           | —   | 90%+         |
| Pages                | —          | ✅ Yes      | ✅  | 80%+         |

### Running Tests

```bash
# Unit and integration tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# E2E tests
npm run test:e2e

# Lint check
npm run lint
```

---

## Success Criteria Verification

### User Story 1 (Real-time Prices)

- [ ] Dashboard loads in < 2 seconds (FCP)
- [ ] Price update delay < 1 second from WebSocket push to UI display
- [ ] At least 10 cryptocurrencies display with correct prices and 24h changes
- [ ] Automatic 30-second price refresh working
- [ ] Visual feedback for price changes (color animation) visible
- [ ] Offline mode notification appears and price updates stop
- [ ] E2E test passes: User can view multiple cryptocurrency prices

### User Story 2 (K-Line Charts)

- [ ] Chart displays correctly with OHLCV data
- [ ] All 4 timeframes selectable without errors
- [ ] Chart redraw time < 500ms when switching timeframes
- [ ] Real-time candle updates reflect WebSocket data
- [ ] E2E test passes: User can navigate to crypto detail and view K-line chart

### User Story 3 (Watchlist)

- [ ] User can add/remove cryptocurrencies to favorites
- [ ] Watchlist persists after page refresh
- [ ] Favorite button state reflects current watchlist
- [ ] localStorage fallback shows warning and disables persistence
- [ ] E2E test passes: User can add/remove favorites and list persists

### User Story 4 (Developer Experience)

- [ ] All service functions have JSDoc documentation
- [ ] Developer guide explains key concepts (WebSocket, TanStack Query, Zustand)
- [ ] Code contains inline comments for complex logic
- [ ] New developer can clone, install, run, and understand basic flow

---

## Implementation Guidelines

### Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types unless justified with `// @ts-expect-error`
- **ESLint**: Zero warnings, no console logs in production code
- **Naming**: Clear, descriptive names for files, functions, components (PascalCase for components, camelCase for functions)
- **File Size**: Components < 250 lines (split larger components)
- **Testing**: Each task should include corresponding tests

### Git Workflow

- Create feature branch for each task: `git checkout -b feat/T001-setup-project`
- Make atomic commits with clear messages: `feat(T001): create project structure`
- Push to branch and create PR for review before merging
- Delete feature branch after merge

### Commit Message Format

```
[TaskID] scope(category): description

Example:
T001 feat(setup): create project structure per implementation plan
T022 feat(hooks): implement useWebSocket hook with connection state management
T030 feat(components): create CryptoPriceCard with real-time price display
```

---

## Task Completion Checklist

For each task, verify:

- [ ] Code written with TypeScript strict mode compliance
- [ ] ESLint passes (no warnings)
- [ ] Unit tests written and passing (when applicable)
- [ ] Code reviewed by team member
- [ ] Git commit created with proper message format
- [ ] PR merged to `001-crypto-realtime` branch
- [ ] Feature works as described in acceptance criteria

---

## Appendix: Resource References

### Documentation

- **Binance WebSocket API**: https://binance-docs.github.io/apidocs/spot/en
- **TradingView Lightweight Charts**: https://tradingview.github.io/lightweight-charts/
- **TanStack Query Docs**: https://tanstack.com/query/latest
- **Zustand Docs**: https://github.com/pmndrs/zustand

### Libraries & Tools

- **React 18**: https://react.dev
- **TypeScript 5**: https://www.typescriptlang.org
- **Vite**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com
- **ShadCN Components**: https://ui.shadcn.com
- **Vitest**: https://vitest.dev
- **Playwright**: https://playwright.dev

---

## Summary

**Total Tasks**: 48  
**Estimated Duration**: 16-22 days (sequential), 9-12 days (MVP with parallelization)  
**MVP Scope**: Phase 1 + 2 + 3 (29 tasks, 9-12 days)  
**Full Scope**: All phases (48 tasks, 16-22 days)

Each task is independently executable and includes clear acceptance criteria, file paths, and success metrics. Tasks can be distributed across team members using the parallel execution guidance provided.

# Crypto Realtime Dashboard - Developer Guide

## Overview

This is a real-time cryptocurrency price dashboard built with React 18, TypeScript, and modern web technologies. It displays live price updates via WebSocket, provides interactive charts, and manages a personal watchlist.

## Architecture

### Technology Stack

- **Frontend Framework**: React 18 with React Compiler
- **Language**: TypeScript 5.x (strict mode)
- **State Management**: Zustand + TanStack Query
- **Real-time**: WebSocket (Binance API)
- **Data Validation**: Zod schemas
- **Styling**: CSS with Tailwind-inspired approach
- **Testing**: Vitest + React Testing Library
- **Build**: Vite

### Project Structure

```
src/
├── components/
│   ├── crypto/                 # Cryptocurrency UI components
│   │   ├── CryptoPriceCard.tsx
│   │   ├── PriceChangeIndicator.tsx
│   │   └── FavoriteButton.tsx
│   ├── common/                 # Shared components
│   │   └── StorageWarning.tsx
│   ├── chart/                  # Chart components
│   └── __tests__/              # Component tests
├── pages/
│   ├── Dashboard.tsx           # Main dashboard page
│   └── CryptoDetail.tsx        # Detailed crypto view
├── hooks/
│   └── useCrypto.ts            # Custom React hooks
├── services/
│   ├── binance/
│   │   └── websocket.ts        # WebSocket management
│   ├── storage/
│   │   └── localStorage.ts     # Data persistence
│   └── query/
│       └── client.ts           # TanStack Query config
├── stores/
│   └── index.ts                # Zustand stores
├── utils/
│   ├── validation.ts           # Zod schemas
│   ├── format.ts               # Format utilities
│   └── throttle.ts             # Performance utilities
└── types/
    └── index.ts                # TypeScript types
```

## Key Features

### 1. Real-Time Price Updates

Uses WebSocket to receive live cryptocurrency price updates from Binance:

```typescript
// In useCryptoPrices hook
const unsubscribe = binanceWebSocketService.subscribe(symbol, (update) => {
  queryClient.setQueryData(queryKeys.prices.single(symbol), (old) => ({
    ...old,
    price: update.price,
    changePercent24h: update.changePercent24h,
  }))
})
```

**Throttling**: Updates are throttled to 500ms to reduce unnecessary re-renders.

### 2. Smart Caching Strategy

TanStack Query provides intelligent caching:

- **staleTime**: 30 seconds (matches WebSocket update frequency)
- **gcTime**: 5 minutes (garbage collection)
- **Retry**: 3x with exponential backoff (1s, 2s, 4s)

### 3. Watchlist Management

Watchlist data persists in localStorage with fallback to in-memory storage:

```typescript
// useWatchlist hook
const addToWatchlist = useCallback((symbol: string) => {
  const success = storageService.addToWatchlist(symbol)
  if (success) {
    useWatchlistStore.getState().addFavorite(symbol)
  }
}, [])
```

### 4. Multi-Timeframe Charts

K-line data can be fetched for different timeframes:

```typescript
// useKLineChart hook with interval switching
const { klines } = useKLineChart(symbol)
// Auto-refetch when selectedTimeFrame changes in store
```

Supported timeframes: 1h, 4h, 1d, 1w

## Custom Hooks

### useWebSocket()

Manages WebSocket connection lifecycle.

```typescript
const { isConnected, error, retryCount, isReconnecting } = useWebSocket()
```

- Connects on component mount
- Disconnects on unmount
- Tracks connection status
- Handles reconnection logic

### useCryptoPrice(symbol: string)

Fetches and manages single cryptocurrency price.

```typescript
const { crypto, isLoading, error } = useCryptoPrice('BTCUSDT')
```

- Initial fetch via REST API (simulated)
- Real-time updates via WebSocket
- Automatic cache updates

### useCryptoPrices(symbols: string[])

Batch fetch multiple cryptocurrencies.

```typescript
const { cryptos, isLoading, error } = useCryptoPrices(['BTCUSDT', 'ETHUSDT'])
```

- Throttled updates (500ms)
- Selective subscriptions
- Automatic cleanup

### useKLineChart(symbol: string)

Fetch K-line (candlestick) data.

```typescript
const { klines, isLoading, error, refetch } = useKLineChart('BTCUSDT')
// Uses selectedTimeFrame from useChartStore()
```

- Supports 4 timeframes
- Real-time candle updates
- Automatic refetch on timeframe change

### useWatchlist()

Manage favorite cryptocurrencies.

```typescript
const {
  favorites,
  toggleFavorite,
  isFavorite,
  addToWatchlist,
  removeFromWatchlist,
} = useWatchlist()
```

- localStorage persistence
- Validation with Zod
- Graceful degradation if storage unavailable

## State Management

### Zustand Stores

Located in `src/stores/index.ts`:

#### useWebSocketStore

```typescript
{
  status: boolean           // Is connected?
  error?: string           // Last error
  retryCount: number       // Retry attempts
  isReconnecting: boolean  // Currently reconnecting?
}
```

#### useWatchlistStore

```typescript
{
  favorites: Set<string>          // Favorite symbols
  isStorageAvailable: boolean     // localStorage available?
  addFavorite(symbol: string): void
  removeFavorite(symbol: string): void
  isFavorite(symbol: string): boolean
}
```

#### useChartStore

```typescript
{
  selectedTimeFrame: '1h' | '4h' | '1d' | '1w'
  showVolume: boolean
  setTimeFrame(frame): void
  toggleVolume(): void
}
```

## Data Flow

```
WebSocket Connection
  ↓
BinanceWebSocketService (receives raw data)
  ↓
MapperService (validates & transforms with Zod)
  ↓
Custom Hooks (useCryptoPrice, useCryptoPrices)
  ↓
TanStack Query (caches data)
  ↓
Components (render with props)
```

## Adding a New Cryptocurrency

1. Subscribe in the hook:

```typescript
binanceWebSocketService.subscribe(symbol, (update) => {
  // Update cache
})
```

2. Define validation schema in `src/utils/validation.ts`:

```typescript
const CryptocurrencySchema = z.object({
  id: z.string(),
  symbol: z.string(),
  // ... more fields
})
```

3. Use in components:

```typescript
const { cryptos } = useCryptoPrices(['BTCUSDT', 'ETHUSDT'])
```

## Error Handling

### WebSocket Connection Errors

The service automatically reconnects with exponential backoff:

```typescript
// In BinanceWebSocketService
private attemptReconnect(): void {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    const delay = this.reconnectDelays[this.reconnectAttempts]
    setTimeout(() => this.connect(), delay)
  }
}
```

### Storage Errors

If localStorage is unavailable, shows warning and falls back to memory:

```typescript
// StorageWarning component displays notification
// In-memory data persists only for session
```

### API Errors

TanStack Query handles retries automatically:

```typescript
// In queryConfig
retry: (failureCount, error) => {
  // Don't retry on 404 or 401
  if (error.message.includes('404')) return false
  return failureCount < 3
}
```

## Performance Optimizations

1. **Throttled Updates**: Price updates limited to 500ms
2. **Selective Subscriptions**: Only subscribe to needed symbols
3. **Query Caching**: Prevents duplicate fetches
4. **Lazy Loading**: Chart rendered on-demand in modal
5. **Code Splitting**: Components lazy-loaded if needed

## Testing

### Run Tests

```bash
npm test
```

### Test Files

- `src/utils/__tests__/example.test.ts` - Utility function tests
- `src/__tests__/App.test.tsx` - Integration tests
- `src/components/__tests__/CryptoPriceCard.test.tsx` - Component tests
- `src/components/__tests__/CryptoList.test.tsx` - List component tests
- `src/__tests__/Dashboard.e2e.test.tsx` - E2E tests

### Writing Tests

Use React Testing Library best practices:

```typescript
it('should display price', () => {
  render(<CryptoPriceCard crypto={mockCrypto} />)
  expect(screen.getByText('$43000.00')).toBeInTheDocument()
})
```

## Building for Production

```bash
npm run build
```

Output in `dist/` directory:
- HTML: 0.46 KB
- CSS: 12.44 KB (gzipped: 2.88 KB)
- JS: 458.70 KB (gzipped: 142.22 KB)

## Environment Variables

Create `.env.local`:

```
VITE_BINANCE_WS_URL=wss://stream.binance.com:9443/ws
VITE_API_URL=https://api.binance.com
```

## Troubleshooting

### WebSocket not connecting

Check browser console for error messages. Ensure Binance API is accessible.

### Prices not updating

Verify WebSocket connection in Redux DevTools or browser console:

```typescript
const { isConnected } = useWebSocket()
```

### Storage not persisting

Check if localStorage is available in browser settings.

## Contributing

1. Follow TypeScript strict mode
2. Run linter before commit: `npm run lint`
3. Write tests for new features
4. Update documentation

## Resources

- [React 18 Docs](https://react.dev)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Zod Docs](https://zod.dev)
- [Vite Docs](https://vitejs.dev)

## License

MIT

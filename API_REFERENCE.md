# API Reference

## Hooks

### useWebSocket()

Manages WebSocket connection lifecycle and status.

**Returns:**
```typescript
{
  isConnected: boolean
  error?: string
  retryCount: number
  isReconnecting: boolean
}
```

**Example:**
```typescript
const { isConnected, error } = useWebSocket()

if (!isConnected) {
  return <ConnectionError error={error} />
}
```

**Lifecycle:**
- Connects on mount
- Automatically reconnects on failure
- Disconnects on unmount

---

### useCryptoPrice(symbol: string)

Fetch and manage single cryptocurrency price with real-time updates.

**Parameters:**
- `symbol` (string): Cryptocurrency symbol (e.g., 'BTCUSDT')

**Returns:**
```typescript
{
  crypto?: {
    symbol: string
    price: number
    changePercent24h: number
    change24h: number
    volume24h: number
  }
  isLoading: boolean
  error?: Error
}
```

**Example:**
```typescript
const { crypto, isLoading } = useCryptoPrice('BTCUSDT')

if (isLoading) return <Loading />
return <PriceDisplay price={crypto?.price} />
```

**Features:**
- Fetches initial data via TanStack Query
- Subscribes to WebSocket updates
- Caches for 30 seconds
- Auto-unsubscribes on unmount

---

### useCryptoPrices(symbols: string[])

Batch fetch multiple cryptocurrency prices with throttled updates.

**Parameters:**
- `symbols` (string[]): Array of cryptocurrency symbols

**Returns:**
```typescript
{
  cryptos: Cryptocurrency[]
  isLoading: boolean
  error?: Error
}
```

**Example:**
```typescript
const { cryptos } = useCryptoPrices(['BTCUSDT', 'ETHUSDT', 'BNBUSDT'])

return (
  <div>
    {cryptos.map((c) => (
      <CryptoCard key={c.symbol} crypto={c} />
    ))}
  </div>
)
```

**Features:**
- Loads all cryptos on first call
- Throttles updates to 500ms
- Selective subscriptions
- Automatic cleanup

---

### useKLineChart(symbol: string)

Fetch K-line (candlestick) data with interval switching.

**Parameters:**
- `symbol` (string): Cryptocurrency symbol

**Returns:**
```typescript
{
  klines: KLine[]
  isLoading: boolean
  error?: Error
  refetch: () => Promise<any>
}
```

**Example:**
```typescript
const { klines } = useKLineChart('BTCUSDT')
const { selectedTimeFrame } = useChartStore()

return (
  <>
    <CandleChart data={klines} />
    <TimeframeSelector
      value={selectedTimeFrame}
      onChange={(tf) => setTimeFrame(tf)}
    />
  </>
)
```

**Features:**
- Supports 1h, 4h, 1d, 1w timeframes
- Real-time candle updates
- Auto-refetch on timeframe change
- 60-second cache

---

### useWatchlist()

Manage favorite cryptocurrencies with localStorage persistence.

**Returns:**
```typescript
{
  favorites: string[]
  isStorageAvailable: boolean
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  toggleFavorite: (symbol: string) => void
  isFavorite: (symbol: string) => boolean
}
```

**Example:**
```typescript
const { favorites, toggleFavorite, isFavorite } = useWatchlist()

return (
  <FavoriteButton
    isFavorite={isFavorite('BTCUSDT')}
    onToggle={() => toggleFavorite('BTCUSDT')}
  />
)
```

**Features:**
- Persistent storage via localStorage
- Falls back to memory if unavailable
- Validation with Zod
- Automatic save on change

---

### useCrypto(symbol?: string)

High-level hook combining multiple operations.

**Parameters:**
- `symbol` (string, optional): Specific crypto to focus on

**Returns:**
```typescript
{
  crypto?: Cryptocurrency
  cryptos: Cryptocurrency[]
  watchlist: WatchlistState
  selectedTimeFrame: TimeFrame
  isLoading: boolean
  isConnected: boolean
  connectionError?: string
  toggleFavorite: (symbol: string) => void
  isFavorite: (symbol: string) => boolean
}
```

**Example:**
```typescript
const { crypto, cryptos, watchlist, isConnected } = useCrypto('BTCUSDT')

return (
  <Dashboard
    selectedCrypto={crypto}
    allCryptos={cryptos}
    favorites={watchlist.favorites}
    connected={isConnected}
  />
)
```

---

## Components

### CryptoPriceCard

Displays a single cryptocurrency with price and change indicator.

**Props:**
```typescript
interface CryptoPriceCardProps {
  crypto: Cryptocurrency
  onSelect: () => void
  onFavoriteToggle: () => void
  isFavorite: boolean
}
```

**Example:**
```typescript
<CryptoPriceCard
  crypto={btc}
  onSelect={() => navigate('/crypto/BTCUSDT')}
  onFavoriteToggle={() => toggleFavorite('BTCUSDT')}
  isFavorite={isFavorite('BTCUSDT')}
/>
```

---

### PriceChangeIndicator

Visual indicator for price changes.

**Props:**
```typescript
interface PriceChangeIndicatorProps {
  percentChange: number
  showAmount?: boolean
  amount?: number
  animate?: boolean
  size?: 'small' | 'medium' | 'large'
}
```

**Example:**
```typescript
<PriceChangeIndicator
  percentChange={2.86}
  showAmount={true}
  amount={1200}
  size="large"
/>
```

---

### FavoriteButton

Toggle button for adding/removing from watchlist.

**Props:**
```typescript
interface FavoriteButtonProps {
  isFavorite: boolean
  onToggle: () => void
  cryptoName?: string
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}
```

**Example:**
```typescript
<FavoriteButton
  isFavorite={true}
  onToggle={handleToggle}
  cryptoName="Bitcoin"
  size="medium"
/>
```

---

### StorageWarning

Displays notification when localStorage unavailable.

**Props:**
```typescript
interface StorageWarningProps {
  isVisible?: boolean
  onDismiss?: () => void
}
```

**Example:**
```typescript
{!isStorageAvailable && (
  <StorageWarning
    isVisible={true}
    onDismiss={() => setShowWarning(false)}
  />
)}
```

---

## Services

### BinanceWebSocketService

Manages WebSocket connection to Binance API.

**Methods:**

```typescript
connect(): void
subscribe(symbol: string, callback: (update: PriceUpdate) => void): () => void
subscribeKLine(symbol: string, interval: TimeFrame, callback: (kline: KLine) => void): () => void
disconnect(): void
onConnectionStatusChange(callback: (isConnected: boolean) => void): () => void
getIsConnected(): boolean
```

**Example:**
```typescript
const unsubscribe = binanceWebSocketService.subscribe('BTCUSDT', (update) => {
  console.log('Price:', update.price)
})

// Cleanup
unsubscribe()
```

---

### StorageService

Manages localStorage with fallback.

**Methods:**

```typescript
getWatchlist(): WatchlistData
addToWatchlist(symbol: string): boolean
removeFromWatchlist(symbol: string): boolean
isAvailable(): boolean
```

**Example:**
```typescript
const success = storageService.addToWatchlist('BTCUSDT')
const watchlist = storageService.getWatchlist()
```

---

## Stores (Zustand)

### useWebSocketStore

Global state for WebSocket connection.

```typescript
const { status, error, retryCount } = useWebSocketStore()
useWebSocketStore.setState({ status: true })
```

### useWatchlistStore

Global state for watchlist.

```typescript
const { favorites, addFavorite, removeFavorite } = useWatchlistStore()
useWatchlistStore.setState({ favorites: new Set(['BTCUSDT']) })
```

### useChartStore

Global state for chart preferences.

```typescript
const { selectedTimeFrame } = useChartStore()
useChartStore.setState({ selectedTimeFrame: '1h' })
```

---

## Query Keys

Type-safe query key factory for cache management.

```typescript
queryKeys.cryptos.all        // All crypto queries
queryKeys.cryptos.list()     // Crypto list
queryKeys.cryptos.detail('BTCUSDT')  // Specific crypto

queryKeys.prices.all         // All price queries
queryKeys.prices.single('BTCUSDT')   // Single price
queryKeys.prices.list(['BTC', 'ETH']) // Multiple prices

queryKeys.klines.all         // All K-line queries
queryKeys.klines.detail('BTCUSDT', '1d') // K-line for timeframe

queryKeys.watchlist.list()   // Watchlist queries
```

**Example:**
```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.prices.all })
queryClient.setQueryData(queryKeys.prices.single('BTCUSDT'), newData)
```

---

## Utility Functions

### Format Utilities

```typescript
formatPrice(price: number): string              // "$43000.00"
formatPercent(percent: number): string          // "+2.86%"
formatVolume(volume: number): string            // "28.00B"
formatTime(timestamp: number): string           // "just now"
formatNumber(num: number, decimals?: number): string
formatSymbol(symbol: string): string            // "BTCUSDT" → "BTC/USDT"
```

### Performance Utilities

```typescript
throttle<T>(func: T, limit: number): (...args) => any
debounce<T>(func: T, delay: number): (...args) => void
throttleRAF<T>(func: T): (...args) => void
throttleLeading<T>(func: T, limit: number): (...args) => void
throttleTrailing<T>(func: T, limit: number): (...args) => void
```

---

## Types

### Cryptocurrency

```typescript
interface Cryptocurrency {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCapRank: number
}
```

### PriceUpdate

```typescript
interface PriceUpdate {
  symbol: string
  price: number
  timestamp: number
  changePercent24h: number
}
```

### KLine

```typescript
interface KLine {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

---

## Error Handling

All hooks follow consistent error handling:

```typescript
const { data, isLoading, error } = useHook()

if (error) {
  return <ErrorMessage error={error.message} />
}

if (isLoading) {
  return <Skeleton />
}

return <Content data={data} />
```

---

## Best Practices

1. **Always handle loading and error states**
2. **Use try-catch for async operations in callbacks**
3. **Unsubscribe from WebSocket on unmount**
4. **Validate data with Zod schemas**
5. **Use query keys for cache management**
6. **Throttle high-frequency events**
7. **Test with React Testing Library**

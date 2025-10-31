import { z } from "zod";

/**
 * Validation schema for Cryptocurrency data (T007)
 * Ensures type safety for cryptocurrency objects from API/WebSocket
 */
export const CryptocurrencySchema = z.object({
  id: z.string().min(1, "Cryptocurrency ID is required"),
  symbol: z
    .string()
    .regex(/^[A-Z0-9]+$/, "Symbol must be uppercase alphanumeric"),
  name: z.string().min(1, "Cryptocurrency name is required"),
  price: z.number().positive("Price must be positive"),
  change24h: z.number(),
  changePercent24h: z.number(),
  volume24h: z.number().nonnegative("Volume cannot be negative"),
  marketCapRank: z.number().positive("Market cap rank must be positive"),
});

export type Cryptocurrency = z.infer<typeof CryptocurrencySchema>;

/**
 * Validation schema for PriceUpdate events (T008)
 * Validates real-time WebSocket price push notifications
 */
export const PriceUpdateSchema = z.object({
  symbol: z
    .string()
    .regex(/^[A-Z0-9]+$/, "Symbol must be uppercase alphanumeric"),
  price: z.number().positive("Price must be positive"),
  timestamp: z.number().positive("Timestamp must be positive"),
  changePercent24h: z.number(),
});

export type PriceUpdate = z.infer<typeof PriceUpdateSchema>;

/**
 * Validation schema for KLine (candlestick) data (T009)
 * Validates OHLCV data for chart rendering
 */
export const KLineSchema = z.object({
  time: z.number().positive("Time must be positive"),
  open: z.number().positive("Open price must be positive"),
  high: z.number().positive("High price must be positive"),
  low: z.number().positive("Low price must be positive"),
  close: z.number().positive("Close price must be positive"),
  volume: z.number().nonnegative("Volume cannot be negative"),
});

export type KLine = z.infer<typeof KLineSchema>;

/**
 * Validation schema for Watchlist data (T010)
 * Persisted user favorites list
 */
export const WatchlistSchema = z.object({
  symbols: z.array(z.string().regex(/^[A-Z0-9]+$/)).default([]),
  createdAt: z.number().positive(),
  updatedAt: z.number().positive(),
});

export type Watchlist = z.infer<typeof WatchlistSchema>;

/**
 * Validation schema for ConnectionStatus (T011)
 * WebSocket connection state
 */
export const ConnectionStatusSchema = z.object({
  isConnected: z.boolean(),
  lastUpdated: z.number().positive(),
  error: z.string().optional(),
  retryCount: z.number().nonnegative().default(0),
});

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

/**
 * Validation schema for ChartConfig (T012)
 * Chart display and interaction configuration
 */
export const ChartConfigSchema = z.object({
  timeFrame: z.enum(["1h", "4h", "1d", "1w"]).default("1d"),
  showVolume: z.boolean().default(true),
  theme: z.enum(["light", "dark"]).default("light"),
  candleCount: z.number().positive().default(50),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

/**
 * Validate cryptocurrency data
 */
export function validateCryptocurrency(data: unknown): Cryptocurrency {
  return CryptocurrencySchema.parse(data);
}

/**
 * Validate price update event
 */
export function validatePriceUpdate(data: unknown): PriceUpdate {
  return PriceUpdateSchema.parse(data);
}

/**
 * Validate K-line data
 */
export function validateKLine(data: unknown): KLine {
  return KLineSchema.parse(data);
}

/**
 * Validate watchlist data
 */
export function validateWatchlist(data: unknown): Watchlist {
  return WatchlistSchema.parse(data);
}

/**
 * Validate connection status
 */
export function validateConnectionStatus(data: unknown): ConnectionStatus {
  return ConnectionStatusSchema.parse(data);
}

/**
 * Validate chart configuration
 */
export function validateChartConfig(data: unknown): ChartConfig {
  return ChartConfigSchema.parse(data);
}

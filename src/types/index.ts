export interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCapRank: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  changePercent24h: number;
}

export interface KLine {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastUpdated: number;
  error?: string;
}

export type TimeFrame = "1h" | "4h" | "1d" | "1w";

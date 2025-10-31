import type { Cryptocurrency } from "../types/index";

const WATCHLIST_KEY = "crypto_watchlist";
const STORAGE_WARNING_KEY = "storage_warning_shown";

// Mock cryptocurrency data - in production, fetch from API
const CRYPTOCURRENCIES: Cryptocurrency[] = [
  {
    id: "bitcoin",
    symbol: "BTCUSDT",
    name: "Bitcoin",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 1,
  },
  {
    id: "ethereum",
    symbol: "ETHUSDT",
    name: "Ethereum",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 2,
  },
  {
    id: "binancecoin",
    symbol: "BNBUSDT",
    name: "BNB",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 3,
  },
  {
    id: "solana",
    symbol: "SOLUSDT",
    name: "Solana",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 4,
  },
  {
    id: "ripple",
    symbol: "XRPUSDT",
    name: "XRP",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 5,
  },
  {
    id: "cardano",
    symbol: "ADAUSDT",
    name: "Cardano",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 6,
  },
  {
    id: "dogecoin",
    symbol: "DOGUSDT",
    name: "Dogecoin",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 7,
  },
  {
    id: "polygon",
    symbol: "MATICUSDT",
    name: "Polygon",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 8,
  },
  {
    id: "litecoin",
    symbol: "LTCUSDT",
    name: "Litecoin",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 9,
  },
  {
    id: "uniswap",
    symbol: "UNIUSDT",
    name: "Uniswap",
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCapRank: 10,
  },
];

export class CryptoService {
  getCryptocurrencies(): Cryptocurrency[] {
    return CRYPTOCURRENCIES;
  }

  getCryptocurrencyBySymbol(symbol: string): Cryptocurrency | undefined {
    return CRYPTOCURRENCIES.find((c) => c.symbol === symbol);
  }

  // Watchlist management
  getWatchlist(): string[] {
    try {
      const data = localStorage.getItem(WATCHLIST_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading watchlist from storage:", error);
      return [];
    }
  }

  addToWatchlist(symbol: string): boolean {
    try {
      const watchlist = this.getWatchlist();
      if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
      }
      return true;
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      this.showStorageWarning();
      return false;
    }
  }

  removeFromWatchlist(symbol: string): boolean {
    try {
      const watchlist = this.getWatchlist();
      const filtered = watchlist.filter((s) => s !== symbol);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      this.showStorageWarning();
      return false;
    }
  }

  isInWatchlist(symbol: string): boolean {
    return this.getWatchlist().includes(symbol);
  }

  clearWatchlist(): boolean {
    try {
      localStorage.removeItem(WATCHLIST_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing watchlist:", error);
      return false;
    }
  }

  private showStorageWarning(): void {
    if (!sessionStorage.getItem(STORAGE_WARNING_KEY)) {
      console.warn(
        "無法保存收藏，頁面刷新後清單將丟失 (Cannot save favorites, list will be lost after page refresh)",
      );
      sessionStorage.setItem(STORAGE_WARNING_KEY, "true");
    }
  }
}

export const cryptoService = new CryptoService();

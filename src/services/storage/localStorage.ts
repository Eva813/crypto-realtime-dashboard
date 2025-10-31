import { validateWatchlist, type Watchlist } from "../../utils/validation";

/**
 * Storage Service (T015)
 * Wraps localStorage with fallback to in-memory storage
 * Handles watchlist persistence and graceful degradation
 */
export class StorageService {
  private readonly WATCHLIST_KEY = "crypto_watchlist";
  private memoryStorage: Record<string, string> = {};
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  /**
   * Check if localStorage is available and writable
   */
  private checkLocalStorageAvailability(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      console.warn("localStorage is not available, using in-memory fallback");
      return false;
    }
  }

  /**
   * Get watchlist from storage
   */
  getWatchlist(): Watchlist {
    try {
      const data = this.getItem(this.WATCHLIST_KEY);

      if (!data) {
        return {
          symbols: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      const parsed = JSON.parse(data);
      return validateWatchlist(parsed);
    } catch (error) {
      console.error("Error reading watchlist from storage:", error);
      return {
        symbols: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
  }

  /**
   * Save watchlist to storage
   */
  saveWatchlist(watchlist: Watchlist): boolean {
    try {
      const validated = validateWatchlist(watchlist);
      const data = JSON.stringify({
        ...validated,
        updatedAt: Date.now(),
      });

      this.setItem(this.WATCHLIST_KEY, data);
      return true;
    } catch (error) {
      console.error("Error saving watchlist to storage:", error);
      return false;
    }
  }

  /**
   * Add symbol to watchlist
   */
  addToWatchlist(symbol: string): boolean {
    try {
      const watchlist = this.getWatchlist();

      if (!watchlist.symbols.includes(symbol)) {
        watchlist.symbols.push(symbol);
        return this.saveWatchlist(watchlist);
      }

      return true;
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      return false;
    }
  }

  /**
   * Remove symbol from watchlist
   */
  removeFromWatchlist(symbol: string): boolean {
    try {
      const watchlist = this.getWatchlist();
      watchlist.symbols = watchlist.symbols.filter((s) => s !== symbol);
      return this.saveWatchlist(watchlist);
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      return false;
    }
  }

  /**
   * Check if symbol is in watchlist
   */
  isInWatchlist(symbol: string): boolean {
    try {
      const watchlist = this.getWatchlist();
      return watchlist.symbols.includes(symbol);
    } catch {
      return false;
    }
  }

  /**
   * Clear watchlist
   */
  clearWatchlist(): boolean {
    try {
      this.removeItem(this.WATCHLIST_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing watchlist:", error);
      return false;
    }
  }

  /**
   * Generic get item (with fallback)
   */
  private getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key);
      }
      return this.memoryStorage[key] || null;
    } catch {
      return this.memoryStorage[key] || null;
    }
  }

  /**
   * Generic set item (with fallback)
   */
  private setItem(key: string, value: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, value);
      }
      this.memoryStorage[key] = value;
    } catch {
      // Fallback to memory storage
      this.memoryStorage[key] = value;
    }
  }

  /**
   * Generic remove item (with fallback)
   */
  private removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key);
      }
      delete this.memoryStorage[key];
    } catch {
      delete this.memoryStorage[key];
    }
  }

  /**
   * Check storage availability
   */
  isAvailable(): boolean {
    return this.isLocalStorageAvailable;
  }

  /**
   * Get storage info for debugging
   */
  getStorageInfo() {
    return {
      isLocalStorageAvailable: this.isLocalStorageAvailable,
      memoryStorageSize: Object.keys(this.memoryStorage).length,
      watchlist: this.getWatchlist(),
    };
  }
}

// Singleton instance
export const storageService = new StorageService();

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PriceUpdate, ConnectionStatus } from "../types/index";
import { binanceWebSocketService } from "../services/binanceWebSocket";
import { cryptoService } from "../services/cryptoService";

export function usePriceUpdate(symbol: string) {
  const [priceUpdate, setPriceUpdate] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    // Connect WebSocket if not already connected
    if (!binanceWebSocketService.isConnected()) {
      binanceWebSocketService.connect();
    }

    // Subscribe to price updates
    const unsubscribe = binanceWebSocketService.subscribe(symbol, (update) => {
      setPriceUpdate(update);
    });

    return unsubscribe;
  }, [symbol]);

  return priceUpdate;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastUpdated: Date.now(),
  });

  useEffect(() => {
    // Connect WebSocket if not already connected
    if (!binanceWebSocketService.isConnected()) {
      binanceWebSocketService.connect();
    }

    const unsubscribe =
      binanceWebSocketService.onConnectionStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

export function useCryptocurrencies() {
  return useQuery({
    queryKey: ["cryptocurrencies"],
    queryFn: () => cryptoService.getCryptocurrencies(),
    staleTime: Infinity,
  });
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWatchlist(cryptoService.getWatchlist());
    setLoading(false);
  }, []);

  const addToWatchlist = (symbol: string) => {
    const success = cryptoService.addToWatchlist(symbol);
    if (success) {
      setWatchlist((prev) => [...prev, symbol]);
    }
    return success;
  };

  const removeFromWatchlist = (symbol: string) => {
    const success = cryptoService.removeFromWatchlist(symbol);
    if (success) {
      setWatchlist((prev) => prev.filter((s) => s !== symbol));
    }
    return success;
  };

  const isInWatchlist = (symbol: string) => watchlist.includes(symbol);

  return {
    watchlist,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
  };
}

export function usePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!binanceWebSocketService.isConnected()) {
      binanceWebSocketService.connect();
    }

    const unsubscribes = symbols.map((symbol) =>
      binanceWebSocketService.subscribe(symbol, (update) => {
        setPrices((prev) => ({
          ...prev,
          [symbol]: update.price,
        }));
      }),
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [symbols]);

  return prices;
}

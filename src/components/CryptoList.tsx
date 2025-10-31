import { useState } from "react";
import {
  useCryptocurrencies,
  usePrices,
  useWatchlist,
} from "../hooks/useCrypto";
import type { Cryptocurrency } from "../types/index";
import "./CryptoList.css";

interface CryptoListProps {
  onSelectCrypto: (crypto: Cryptocurrency) => void;
}

export function CryptoList({ onSelectCrypto }: CryptoListProps) {
  const { data: cryptocurrencies } = useCryptocurrencies();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const symbols = cryptocurrencies?.map((c) => c.symbol) || [];
  const prices = usePrices(symbols);
  const [sortBy, setSortBy] = useState<"rank" | "price">("rank");

  if (!cryptocurrencies) {
    return <div className="crypto-list loading">載入中...</div>;
  }

  const displayCryptos = [...cryptocurrencies].sort((a, b) => {
    if (sortBy === "price") {
      return (prices[b.symbol] || 0) - (prices[a.symbol] || 0);
    }
    return a.marketCapRank - b.marketCapRank;
  });

  const toggleWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    if (isInWatchlist(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  return (
    <div className="crypto-list">
      <div className="list-header">
        <h2>加密貨幣行情</h2>
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === "rank" ? "active" : ""}`}
            onClick={() => setSortBy("rank")}
          >
            按排名
          </button>
          <button
            className={`sort-btn ${sortBy === "price" ? "active" : ""}`}
            onClick={() => setSortBy("price")}
          >
            按價格
          </button>
        </div>
      </div>

      <div className="list-container">
        {displayCryptos.map((crypto) => {
          const price = prices[crypto.symbol] || 0;
          const inWatchlist = isInWatchlist(crypto.symbol);

          return (
            <div
              key={crypto.symbol}
              className="crypto-item"
              onClick={() => onSelectCrypto({ ...crypto, price })}
            >
              <div className="crypto-info">
                <div className="crypto-header">
                  <span className="crypto-rank">#{crypto.marketCapRank}</span>
                  <span className="crypto-name">{crypto.name}</span>
                  <span className="crypto-symbol">{crypto.symbol}</span>
                </div>
              </div>

              <div className="crypto-price">
                <span className="price">
                  $
                  {price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <button
                className={`watchlist-btn ${inWatchlist ? "active" : ""}`}
                onClick={(e) => toggleWatchlist(e, crypto.symbol)}
                title={inWatchlist ? "從自選移除" : "加入自選"}
              >
                {inWatchlist ? "★" : "☆"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import {
  useCryptocurrencies,
  usePrices,
  useWatchlist,
} from "../hooks/useCrypto";
import type { Cryptocurrency } from "../types/index";
import "./WatchlistView.css";

interface WatchlistViewProps {
  onSelectCrypto: (crypto: Cryptocurrency) => void;
}

export function WatchlistView({ onSelectCrypto }: WatchlistViewProps) {
  const { data: allCryptos } = useCryptocurrencies();
  const { watchlist, removeFromWatchlist, loading } = useWatchlist();
  const symbols = watchlist;
  const prices = usePrices(symbols);

  if (loading) {
    return <div className="watchlist-view loading">載入中...</div>;
  }

  if (watchlist.length === 0) {
    return (
      <div className="watchlist-view empty">
        <div className="empty-state">
          <p>尚未收藏任何幣種</p>
          <small>點擊幣種列表右側的星號來收藏您關注的幣種</small>
        </div>
      </div>
    );
  }

  const watchlistCryptos = watchlist
    .map((symbol) => allCryptos?.find((c) => c.symbol === symbol))
    .filter((c) => c !== undefined) as Cryptocurrency[];

  return (
    <div className="watchlist-view">
      <div className="watchlist-header">
        <h2>自選清單 ({watchlist.length})</h2>
      </div>

      <div className="watchlist-container">
        {watchlistCryptos.map((crypto) => {
          const price = prices[crypto.symbol] || 0;

          return (
            <div
              key={crypto.symbol}
              className="watchlist-item"
              onClick={() => onSelectCrypto({ ...crypto, price })}
            >
              <div className="watchlist-info">
                <div className="watchlist-header-info">
                  <span className="watchlist-name">{crypto.name}</span>
                  <span className="watchlist-symbol">{crypto.symbol}</span>
                </div>
              </div>

              <div className="watchlist-price">
                <span className="price">
                  $
                  {price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWatchlist(crypto.symbol);
                }}
                title="移除"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { Cryptocurrency } from '../utils/validation'
import './WatchlistView.css'

interface WatchlistViewProps {
  favorites: string[]
  cryptos: Cryptocurrency[]
  onSelectCrypto: (crypto: Cryptocurrency) => void
  onRemoveFavorite: (symbol: string) => void
  isFavorite: (symbol: string) => boolean
}

/**
 * WatchlistView Component
 * Displays user's favorite cryptocurrencies
 */
export function WatchlistView({
  favorites,
  cryptos,
  onSelectCrypto,
  onRemoveFavorite,
  isFavorite,
}: WatchlistViewProps) {
  // Note: callbacks are provided for potential future enhancements
  void onSelectCrypto
  void isFavorite

  // Filter cryptos to only show favorites
  const watchlistCryptos = cryptos.filter((c) => favorites.includes(c.symbol))

  if (favorites.length === 0) {
    return (
      <div className="watchlist-view empty">
        <div className="empty-state">
          <p>尚未收藏任何幣種</p>
          <small>點擊幣種列表右側的星號來收藏您關注的幣種</small>
        </div>
      </div>
    )
  }

  return (
    <div className="watchlist-view">
      <div className="watchlist-list">
        {watchlistCryptos.map((crypto) => (
          <div key={crypto.symbol} className="watchlist-item">
            <div className="watchlist-item-content">
              <h4>{crypto.name}</h4>
              <span className="price">${crypto.price.toFixed(2)}</span>
            </div>
            <button
              className="remove-btn"
              onClick={() => onRemoveFavorite(crypto.symbol)}
              title="Remove from watchlist"
              aria-label={`Remove ${crypto.name} from watchlist`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WatchlistView

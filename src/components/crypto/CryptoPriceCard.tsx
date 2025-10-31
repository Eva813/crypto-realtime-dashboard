import { formatPrice, formatPercent } from "../../utils/format";
import type { Cryptocurrency } from "../../utils/validation";
import "./CryptoPriceCard.css";

/**
 * CryptoPriceCard Component (T030)
 * Displays individual cryptocurrency price information with color coding
 * and visual feedback for price changes
 */
interface CryptoPriceCardProps {
  crypto: Cryptocurrency;
  onSelect?: () => void;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

export function CryptoPriceCard({
  crypto,
  onSelect,
  onFavoriteToggle,
  isFavorite = false,
}: CryptoPriceCardProps) {
  const isPositive = crypto.changePercent24h >= 0;
  const changeClass = isPositive ? "positive" : "negative";

  return (
    <div className="crypto-price-card" onClick={onSelect}>
      {/* Header with crypto name and symbol */}
      <div className="card-header">
        <div className="crypto-identity">
          <h3 className="crypto-name">{crypto.name}</h3>
          <span className="crypto-symbol">{crypto.symbol}</span>
        </div>

        {onFavoriteToggle && (
          <button
            className={`favorite-btn ${isFavorite ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={`${isFavorite ? "Remove" : "Add"} ${crypto.name} to favorites`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        )}
      </div>

      {/* Price display */}
      <div className="price-section">
        <div className="current-price">{formatPrice(crypto.price)}</div>

        {/* Change indicator with animation */}
        <div className={`price-change ${changeClass}`}>
          <span className="change-arrow">{isPositive ? "▲" : "▼"}</span>
          <span className="change-value">
            {formatPercent(crypto.changePercent24h)}
          </span>
          {crypto.change24h !== 0 && (
            <span className="change-amount">
              ({isPositive ? "+" : ""}
              {formatPrice(crypto.change24h)})
            </span>
          )}
        </div>
      </div>

      {/* Volume and market cap info */}
      <div className="card-footer">
        <div className="info-row">
          <span className="label">24h Volume:</span>
          <span className="value">{formatPrice(crypto.volume24h)}</span>
        </div>
        <div className="info-row">
          <span className="label">Market Cap Rank:</span>
          <span className="value">#{crypto.marketCapRank}</span>
        </div>
      </div>

      {/* Hover overlay for interaction hint */}
      <div className="card-overlay">
        <span>Click to view chart</span>
      </div>
    </div>
  );
}

export default CryptoPriceCard;

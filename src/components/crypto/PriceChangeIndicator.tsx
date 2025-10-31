import { formatPercent } from "../../utils/format";
import "./PriceChangeIndicator.css";

/**
 * PriceChangeIndicator Component (T031)
 * Visual feedback indicator for price changes with animation
 * Shows direction (up/down) and magnitude of change
 */
interface PriceChangeIndicatorProps {
  percentChange: number;
  showAmount?: boolean;
  amount?: number;
  animate?: boolean;
  size?: "small" | "medium" | "large";
}

export function PriceChangeIndicator({
  percentChange,
  showAmount = false,
  amount = 0,
  animate = true,
  size = "medium",
}: PriceChangeIndicatorProps) {
  const isPositive = percentChange >= 0;
  const direction = isPositive ? "up" : "down";
  const className = `price-change-indicator ${direction} ${size} ${animate ? "animate" : ""}`;

  return (
    <div className={className} title={`${formatPercent(percentChange)}`}>
      {/* Direction arrow */}
      <span className="direction-icon">{isPositive ? "▲" : "▼"}</span>

      {/* Percentage change */}
      <span className="percent-value">
        {formatPercent(Math.abs(percentChange))}
      </span>

      {/* Optional amount display */}
      {showAmount && amount !== 0 && (
        <span className="amount-value">
          ({isPositive ? "+" : "-"}${Math.abs(amount).toFixed(2)})
        </span>
      )}

      {/* Pulse animation indicator */}
      {animate && <span className="pulse"></span>}
    </div>
  );
}

/**
 * Inline price change badge - compact version
 */
export function PriceChangeBadge({ percentChange }: { percentChange: number }) {
  const isPositive = percentChange >= 0;
  const className = `price-change-badge ${isPositive ? "positive" : "negative"}`;

  return (
    <span className={className} title={`${formatPercent(percentChange)}`}>
      {isPositive ? "+" : ""}
      {formatPercent(percentChange)}
    </span>
  );
}

export default PriceChangeIndicator;

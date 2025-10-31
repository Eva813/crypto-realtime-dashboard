/**
 * Format price for display
 * T017: Formatting utility for prices
 *
 * @example
 * formatPrice(12345.6789) => '$12,345.68'
 * formatPrice(0.001234) => '$0.0012'
 */
export function formatPrice(price: number, precision?: number): string {
  if (!isFinite(price)) return "$0.00";

  // Auto-determine precision based on price magnitude
  let decimals = precision ?? 2;
  if (price < 0.01) decimals = 4;
  else if (price < 1) decimals = 3;

  const formatted = price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `$${formatted}`;
}

/**
 * Format percentage for display with sign
 * @example
 * formatPercent(5.25) => '+5.25%'
 * formatPercent(-2.5) => '-2.50%'
 */
export function formatPercent(percent: number, precision = 2): string {
  if (!isFinite(percent)) return "0.00%";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(precision)}%`;
}

/**
 * Format volume for display with K, M, B suffixes
 * @example
 * formatVolume(1234567) => '1.23M'
 * formatVolume(1234567890) => '1.23B'
 */
export function formatVolume(volume: number): string {
  if (!isFinite(volume) || volume === 0) return "0";

  const abs = Math.abs(volume);
  const suffixes = ["", "K", "M", "B", "T"];
  let magnitude = 0;

  let scaled = abs;
  while (scaled >= 1000 && magnitude < suffixes.length - 1) {
    scaled /= 1000;
    magnitude++;
  }

  return `${scaled.toFixed(magnitude === 0 ? 0 : 2)}${suffixes[magnitude]}`;
}

/**
 * Format cryptocurrency symbol for display
 * @example
 * formatSymbol('BTCUSDT') => 'BTC'
 */
export function formatSymbol(symbol: string): string {
  return symbol.replace(/USDT?$/, "");
}

/**
 * Format timestamp to readable time string
 * @example
 * formatTime(Date.now()) => '10:30 AM' or '2 minutes ago'
 */
export function formatTime(timestamp: number, showRelative = true): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (showRelative) {
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format large numbers with commas
 * @example
 * formatNumber(1234567.89) => '1,234,567.89'
 */
export function formatNumber(num: number): string {
  if (!isFinite(num)) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

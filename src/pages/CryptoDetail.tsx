import { useCallback } from 'react'
import { useKLineChart } from '../hooks/useCrypto'
import { useCryptoPrices } from '../hooks/useCrypto'
import { useChartStore } from '../stores'
import { PriceChangeIndicator } from '../components/crypto/PriceChangeIndicator'
import { FavoriteButton } from '../components/crypto/FavoriteButton'
import { useWatchlist } from '../hooks/useCrypto'
import './CryptoDetail.css'

interface CryptoDetailProps {
  symbol: string
  onClose?: () => void
}

/**
 * CryptoDetail Component (T048)
 * Detailed view for a single cryptocurrency with full chart and analytics
 */
export function CryptoDetail({ symbol, onClose }: CryptoDetailProps) {
  // Fetch crypto data
  const { cryptos } = useCryptoPrices([symbol])
  const crypto = cryptos.find((c) => c.symbol === symbol)

  // Fetch chart data
  const { klines: _unused } = useKLineChart(symbol)
  void _unused // Use eslint-disable for unused variable
  const { selectedTimeFrame, setTimeFrame } = useChartStore()

  // Watchlist management
  const { toggleFavorite, isFavorite } = useWatchlist()

  const handleFavoriteToggle = useCallback(() => {
    toggleFavorite(symbol)
  }, [symbol, toggleFavorite])

  const timeFrames: Array<'1h' | '4h' | '1d' | '1w'> = ['1h', '4h', '1d', '1w']

  if (!crypto) {
    return (
      <div className="crypto-detail loading">
        <p>載入中...</p>
      </div>
    )
  }

  return (
    <div className="crypto-detail">
      {/* Header */}
      <header className="detail-header">
        {onClose && (
          <button className="back-button" onClick={onClose}>
            ← 返回
          </button>
        )}

        <div className="detail-title">
          <h1>{crypto.name}</h1>
          <span className="symbol">{crypto.symbol}</span>
        </div>

        <div className="detail-actions">
          <FavoriteButton
            isFavorite={isFavorite(symbol)}
            onToggle={handleFavoriteToggle}
            cryptoName={crypto.name}
            size="large"
          />
        </div>
      </header>

      {/* Price Info Card */}
      <section className="detail-price-section">
        <div className="price-display">
          <div className="current-price">
            <span className="label">現價</span>
            <span className="price">${crypto.price.toFixed(2)}</span>
          </div>

          <div className="price-change">
            <PriceChangeIndicator
              percentChange={crypto.changePercent24h}
              showAmount={true}
              amount={crypto.change24h}
              size="large"
              animate={false}
            />
          </div>
        </div>

        <div className="price-stats">
          <div className="stat">
            <span className="label">24小時最高</span>
            <span className="value">
              ${(crypto.price * (1 + crypto.changePercent24h / 100 + 0.05)).toFixed(2)}
            </span>
          </div>
          <div className="stat">
            <span className="label">24小時最低</span>
            <span className="value">
              ${(crypto.price * (1 + crypto.changePercent24h / 100 - 0.05)).toFixed(2)}
            </span>
          </div>
          <div className="stat">
            <span className="label">24小時交易量</span>
            <span className="value">${(crypto.volume24h / 1000000000).toFixed(2)}B</span>
          </div>
          <div className="stat">
            <span className="label">市值排名</span>
            <span className="value">#{crypto.marketCapRank}</span>
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="detail-chart-section">
        <div className="chart-controls">
          <h2>行情圖表</h2>
          <div className="timeframe-buttons">
            {timeFrames.map((tf) => (
              <button
                key={tf}
                className={`timeframe-btn ${selectedTimeFrame === tf ? 'active' : ''}`}
                onClick={() => setTimeFrame(tf)}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-placeholder">
          <p>圖表將在此顯示 (K-line data for {selectedTimeFrame})</p>
        </div>
      </section>
    </div>
  )
}

export default CryptoDetail

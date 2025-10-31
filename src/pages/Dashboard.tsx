import { useState } from 'react'
import { useCryptoPrices } from '../hooks/useCrypto'
import { useWatchlist } from '../hooks/useCrypto'
import { useWebSocket } from '../hooks/useCrypto'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { CryptoList } from '../components/CryptoList'
import { WatchlistView } from '../components/WatchlistView'
import { KLineChart } from '../components/KLineChart'
import { StorageWarning } from '../components/common/StorageWarning'
import type { Cryptocurrency } from '../utils/validation'
import './Dashboard.css'

/**
 * Dashboard Page Component (T034)
 * Main page displaying cryptocurrency prices, watchlist, and chart
 * Integrates all components and hooks together
 */
export function Dashboard() {
  const [selectedCrypto, setSelectedCrypto] = useState<Cryptocurrency | null>(null)
  const [showChart, setShowChart] = useState(false)

  // Use custom hooks
  const { cryptos, isLoading } = useCryptoPrices([])
  const { favorites, toggleFavorite, isFavorite, isStorageAvailable } = useWatchlist()
  const { isConnected, error: connectionError } = useWebSocket()

  const handleSelectCrypto = (crypto: Cryptocurrency) => {
    setSelectedCrypto(crypto)
    setShowChart(true)
  }

  const handleCloseChart = () => {
    setShowChart(false)
    setSelectedCrypto(null)
  }

  const handleFavoriteToggle = (crypto: Cryptocurrency) => {
    toggleFavorite(crypto.symbol)
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>加密貨幣即時行情</h1>

        {/* Connection Status */}
        <div className="header-status">
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
        </div>
      </header>

      {/* Storage Warning */}
      {!isStorageAvailable && (
        <StorageWarning
          isVisible={true}
          onDismiss={() => {
            /* Auto-dismiss after 10 seconds */
          }}
        />
      )}

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Crypto List Section */}
        <section className="dashboard-section crypto-section">
          <h2>加密貨幣行情</h2>

          {isLoading ? (
            <div className="loading">載入中...</div>
          ) : cryptos.length === 0 ? (
            <div className="empty-state">
              <p>未能載入加密貨幣列表</p>
            </div>
          ) : (
            <CryptoList
              cryptos={cryptos}
              onSelectCrypto={handleSelectCrypto}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
              isFavorite={isFavorite}
            />
          )}
        </section>

        {/* Watchlist Section */}
        <aside className="dashboard-section watchlist-section">
          <h2>自選清單</h2>
          <WatchlistView
            favorites={favorites}
            cryptos={cryptos}
            onSelectCrypto={handleSelectCrypto}
            onRemoveFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        </aside>
      </main>

      {/* K-Line Chart Modal */}
      {showChart && selectedCrypto && (
        <div className="chart-modal-overlay" onClick={handleCloseChart}>
          <div className="chart-modal" onClick={(e) => e.stopPropagation()}>
            <KLineChart crypto={selectedCrypto} onClose={handleCloseChart} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

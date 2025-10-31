import { useState } from 'react'
import type { Cryptocurrency } from '../utils/validation'
import { CryptoPriceCard } from './crypto/CryptoPriceCard'
import './CryptoList.css'

interface CryptoListProps {
  cryptos: Cryptocurrency[]
  onSelectCrypto: (crypto: Cryptocurrency) => void
  onFavoriteToggle: (crypto: Cryptocurrency) => void
  favorites: string[]
  isFavorite: (symbol: string) => boolean
}

/**
 * CryptoList Component
 * Displays a sortable list of cryptocurrencies
 */
export function CryptoList({
  cryptos,
  onSelectCrypto,
  onFavoriteToggle,
  favorites,
  isFavorite,
}: CryptoListProps) {
  const [sortBy, setSortBy] = useState<'rank' | 'price'>('rank')

  // Note: favorites prop is used via isFavorite callback
  void favorites

  const displayCryptos = [...cryptos].sort((a, b) => {
    if (sortBy === 'price') {
      return b.price - a.price
    }
    return a.marketCapRank - b.marketCapRank
  })

  return (
    <div className="crypto-list">
      <div className="list-header">
        <h2>加密貨幣行情</h2>
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === 'rank' ? 'active' : ''}`}
            onClick={() => setSortBy('rank')}
          >
            按排名
          </button>
          <button
            className={`sort-btn ${sortBy === 'price' ? 'active' : ''}`}
            onClick={() => setSortBy('price')}
          >
            按價格
          </button>
        </div>
      </div>

      <div className="list-container">
        {displayCryptos.map((crypto) => (
          <CryptoPriceCard
            key={crypto.symbol}
            crypto={crypto}
            onSelect={() => onSelectCrypto(crypto)}
            onFavoriteToggle={() => onFavoriteToggle(crypto)}
            isFavorite={isFavorite(crypto.symbol)}
          />
        ))}
      </div>
    </div>
  )
}

export default CryptoList

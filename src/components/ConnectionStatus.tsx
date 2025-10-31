import { useEffect, useState } from 'react'
import './ConnectionStatus.css'

interface ConnectionStatusProps {
  isConnected: boolean
  error?: string | null
}

/**
 * ConnectionStatus Component
 * Displays WebSocket connection status and last update time
 */
export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [timeSince, setTimeSince] = useState('now')

  useEffect(() => {
    if (isConnected) {
      setLastUpdate(new Date())
    }
  }, [isConnected])

  // Update "time since" display
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = now.getTime() - lastUpdate.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (seconds < 60) {
        setTimeSince('just now')
      } else if (minutes < 60) {
        setTimeSince(`${minutes}m ago`)
      } else if (hours < 24) {
        setTimeSince(`${hours}h ago`)
      } else {
        setTimeSince('offline')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastUpdate])

  const statusClass = isConnected ? 'connected' : 'disconnected'
  const statusText = isConnected ? '連線已連接' : '連線已中斷'

  return (
    <div className={`connection-status ${statusClass}`}>
      <div className="status-indicator"></div>
      <span className="status-text">{statusText}</span>
      <span className="status-time">{timeSince}</span>
      {error && <span className="status-error" title={error}>⚠️</span>}
    </div>
  )
}

export default ConnectionStatus

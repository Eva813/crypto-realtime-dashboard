import { useConnectionStatus } from "../hooks/useCrypto";
import "./ConnectionStatus.css";

export function ConnectionStatus() {
  const status = useConnectionStatus();
  const secondsAgo = Math.floor((Date.now() - status.lastUpdated) / 1000);

  return (
    <div
      className={`connection-status ${status.isConnected ? "connected" : "disconnected"}`}
    >
      <div className="status-indicator"></div>
      <span className="status-text">
        {status.isConnected ? (
          <>
            連線中{" "}
            <span className="update-time">(更新於 {secondsAgo} 秒前)</span>
          </>
        ) : (
          <>
            連線已中斷{" "}
            {status.error && (
              <span className="error-msg">({status.error})</span>
            )}
          </>
        )}
      </span>
    </div>
  );
}

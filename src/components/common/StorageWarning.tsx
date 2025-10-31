import { useState } from "react";
import "./StorageWarning.css";

/**
 * StorageWarning Component (T059)
 * Displays notification when localStorage is unavailable
 * Informs users that watchlist won't persist across sessions
 */
interface StorageWarningProps {
  isVisible?: boolean;
  onDismiss?: () => void;
}

export function StorageWarning({
  isVisible = true,
  onDismiss,
}: StorageWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="storage-warning" role="alert" aria-live="polite">
      <div className="warning-content">
        <span className="warning-icon">⚠️</span>

        <div className="warning-message">
          <h4 className="warning-title">Storage Unavailable</h4>
          <p className="warning-text">
            Local storage is not available. Your watchlist will not persist
            after page refresh. Changes will be lost when you close this page.
          </p>
        </div>

        <button
          className="warning-close"
          onClick={handleDismiss}
          title="Dismiss"
          aria-label="Dismiss storage warning"
        >
          ✕
        </button>
      </div>

      {/* Progress bar that auto-dismisses after 10 seconds */}
      <div className="warning-progress">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
}

/**
 * SessionStorageWarning - Persistent version
 * Stays visible and can only be dismissed by user
 */
export function SessionStorageWarning({
  onDismiss,
}: {
  onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="storage-warning session-warning" role="alert">
      <div className="warning-content">
        <span className="warning-icon">💾</span>

        <div className="warning-message">
          <h4 className="warning-title">Using Session Storage</h4>
          <p className="warning-text">
            Your watchlist is stored in session memory only. It will be cleared
            when you close your browser.
          </p>
        </div>

        <button
          className="warning-close"
          onClick={handleDismiss}
          title="Dismiss"
          aria-label="Dismiss session storage warning"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default StorageWarning;

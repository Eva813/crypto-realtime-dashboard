import "./FavoriteButton.css";

/**
 * FavoriteButton Component (T057)
 * Toggle button for adding/removing cryptocurrencies to favorites
 * Shows visual star icon with state feedback
 */
interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  cryptoName?: string;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
}

export function FavoriteButton({
  isFavorite,
  onToggle,
  cryptoName,
  size = "medium",
  disabled = false,
}: FavoriteButtonProps) {
  return (
    <button
      className={`favorite-button ${size} ${isFavorite ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={onToggle}
      disabled={disabled}
      title={
        isFavorite
          ? `Remove ${cryptoName || "this cryptocurrency"} from favorites`
          : `Add ${cryptoName || "this cryptocurrency"} to favorites`
      }
      aria-label={
        isFavorite
          ? `Remove from favorites: ${cryptoName}`
          : `Add to favorites: ${cryptoName}`
      }
      aria-pressed={isFavorite}
    >
      <span className="star-icon">{isFavorite ? "★" : "☆"}</span>
    </button>
  );
}

export default FavoriteButton;

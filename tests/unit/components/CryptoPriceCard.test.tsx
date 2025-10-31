/**
 * T041: Component tests for CryptoPriceCard
 * Tests cryptocurrency price card display with mock data
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { CryptoPriceCard } from "../../../src/components/crypto/CryptoPriceCard";
import type { Cryptocurrency } from "../../../src/utils/validation";

// Mock CSS imports
vi.mock("../../../src/components/crypto/CryptoPriceCard.css", () => ({}));

describe("CryptoPriceCard Component (T041)", () => {
  // Mock cryptocurrency data
  const mockCryptoBTC: Cryptocurrency = {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 45000.5,
    change24h: 1250.3,
    changePercent24h: 2.85,
    volume24h: 28500000000,
    marketCapRank: 1,
  };

  const mockCryptoETH: Cryptocurrency = {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 2350.75,
    change24h: -75.5,
    changePercent24h: -3.11,
    volume24h: 15200000000,
    marketCapRank: 2,
  };

  const mockCryptoSmallPrice: Cryptocurrency = {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.075,
    change24h: 0.005,
    changePercent24h: 7.14,
    volume24h: 450000000,
    marketCapRank: 9,
  };

  it("should render cryptocurrency name and symbol", () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("BTC")).toBeInTheDocument();
  });

  it("should display formatted price correctly", () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    // Should format price with $ and commas
    expect(screen.getByText(/\$45,000\.50/)).toBeInTheDocument();
  });

  it("should show positive change indicator for gains", () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    // Should show up arrow for positive change
    expect(screen.getByText("▲")).toBeInTheDocument();

    // Should show positive percentage with + sign
    expect(screen.getByText(/\+2\.85%/)).toBeInTheDocument();

    // Should show positive change amount
    expect(screen.getByText(/\+\$1,250\.30/)).toBeInTheDocument();
  });

  it("should show negative change indicator for losses", () => {
    render(<CryptoPriceCard crypto={mockCryptoETH} />);

    // Should show down arrow for negative change
    expect(screen.getByText("▼")).toBeInTheDocument();

    // Should show negative percentage
    expect(screen.getByText(/-3\.11%/)).toBeInTheDocument();

    // Should show negative change amount (check for pattern matching the actual format)
    expect(screen.getByText(/\(\$-75\.5/)).toBeInTheDocument();
  });

  it("should apply positive class for price gains", () => {
    const { container } = render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    const priceChange = container.querySelector(".price-change.positive");
    expect(priceChange).toBeInTheDocument();
  });

  it("should apply negative class for price losses", () => {
    const { container } = render(<CryptoPriceCard crypto={mockCryptoETH} />);

    const priceChange = container.querySelector(".price-change.negative");
    expect(priceChange).toBeInTheDocument();
  });

  it("should display 24h volume", () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    expect(screen.getByText("24h Volume:")).toBeInTheDocument();
    expect(screen.getByText(/\$28,500,000,000\.00/)).toBeInTheDocument();
  });

  it("should display market cap rank", () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    expect(screen.getByText("Market Cap Rank:")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("should format small prices with appropriate precision", () => {
    render(<CryptoPriceCard crypto={mockCryptoSmallPrice} />);

    // Small prices should show more decimal places
    expect(screen.getByText(/\$0\.075/)).toBeInTheDocument();
  });

  it("should call onSelect when card is clicked", async () => {
    const onSelectMock = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <CryptoPriceCard crypto={mockCryptoBTC} onSelect={onSelectMock} />,
    );

    const card = container.querySelector(".crypto-price-card");
    expect(card).toBeInTheDocument();

    if (card) {
      await user.click(card);
      expect(onSelectMock).toHaveBeenCalledTimes(1);
    }
  });

  it("should render favorite button when onFavoriteToggle is provided", () => {
    const onFavoriteToggleMock = vi.fn();

    render(
      <CryptoPriceCard
        crypto={mockCryptoBTC}
        onFavoriteToggle={onFavoriteToggleMock}
        isFavorite={false}
      />,
    );

    const favoriteButton = screen.getByRole("button", {
      name: /Add Bitcoin to favorites/i,
    });
    expect(favoriteButton).toBeInTheDocument();
  });

  it("should not render favorite button when onFavoriteToggle is not provided", () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    const favoriteButtons = screen.queryAllByRole("button");
    expect(favoriteButtons).toHaveLength(0);
  });

  it("should show filled star when isFavorite is true", () => {
    const onFavoriteToggleMock = vi.fn();

    render(
      <CryptoPriceCard
        crypto={mockCryptoBTC}
        onFavoriteToggle={onFavoriteToggleMock}
        isFavorite={true}
      />,
    );

    const favoriteButton = screen.getByTitle("Remove from favorites");
    expect(favoriteButton).toHaveTextContent("★");
  });

  it("should show empty star when isFavorite is false", () => {
    const onFavoriteToggleMock = vi.fn();

    render(
      <CryptoPriceCard
        crypto={mockCryptoBTC}
        onFavoriteToggle={onFavoriteToggleMock}
        isFavorite={false}
      />,
    );

    const favoriteButton = screen.getByRole("button", {
      name: /Add Bitcoin to favorites/i,
    });
    expect(favoriteButton).toHaveTextContent("☆");
  });

  it("should call onFavoriteToggle when favorite button is clicked", async () => {
    const onFavoriteToggleMock = vi.fn();
    const onSelectMock = vi.fn();
    const user = userEvent.setup();

    render(
      <CryptoPriceCard
        crypto={mockCryptoBTC}
        onFavoriteToggle={onFavoriteToggleMock}
        onSelect={onSelectMock}
        isFavorite={false}
      />,
    );

    const favoriteButton = screen.getByRole("button", {
      name: /Add Bitcoin to favorites/i,
    });

    await user.click(favoriteButton);

    // Should call favorite toggle
    expect(onFavoriteToggleMock).toHaveBeenCalledTimes(1);

    // Should NOT call onSelect (event.stopPropagation)
    expect(onSelectMock).not.toHaveBeenCalled();
  });

  it('should display hover overlay with "Click to view chart" text', () => {
    render(<CryptoPriceCard crypto={mockCryptoBTC} onSelect={vi.fn()} />);

    expect(screen.getByText("Click to view chart")).toBeInTheDocument();
  });

  it("should handle zero price change correctly", () => {
    const mockCryptoNoChange: Cryptocurrency = {
      ...mockCryptoBTC,
      change24h: 0,
      changePercent24h: 0,
    };

    render(<CryptoPriceCard crypto={mockCryptoNoChange} />);

    // Should show up arrow for non-negative (zero is >= 0)
    expect(screen.getByText("▲")).toBeInTheDocument();

    // Should show percentage (0 doesn't get + sign from formatPercent)
    expect(screen.getByText("0.00%")).toBeInTheDocument();

    // Should NOT show change amount when it's exactly 0
    expect(screen.queryByText(/\(\+\$0\.00\)/)).not.toBeInTheDocument();
  });

  it("should handle multiple cryptocurrencies in succession", () => {
    const { rerender } = render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText(/\+2\.85%/)).toBeInTheDocument();

    // Rerender with different crypto
    rerender(<CryptoPriceCard crypto={mockCryptoETH} />);

    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText(/-3\.11%/)).toBeInTheDocument();
  });

  it("should have correct accessibility attributes on favorite button", () => {
    const onFavoriteToggleMock = vi.fn();

    render(
      <CryptoPriceCard
        crypto={mockCryptoBTC}
        onFavoriteToggle={onFavoriteToggleMock}
        isFavorite={false}
      />,
    );

    const favoriteButton = screen.getByRole("button", {
      name: /Add Bitcoin to favorites/i,
    });

    expect(favoriteButton).toHaveAttribute(
      "aria-label",
      "Add Bitcoin to favorites",
    );
    expect(favoriteButton).toHaveAttribute("title", "Add to favorites");
  });

  it("should render all card sections correctly", () => {
    const { container } = render(<CryptoPriceCard crypto={mockCryptoBTC} />);

    // Check for all main sections
    expect(container.querySelector(".card-header")).toBeInTheDocument();
    expect(container.querySelector(".price-section")).toBeInTheDocument();
    expect(container.querySelector(".card-footer")).toBeInTheDocument();
    expect(container.querySelector(".card-overlay")).toBeInTheDocument();
  });
});

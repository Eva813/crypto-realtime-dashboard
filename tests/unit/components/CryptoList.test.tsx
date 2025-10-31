/**
 * T042: Component tests for CryptoList
 * Tests cryptocurrency list display with multiple cryptos
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { CryptoList } from "../../../src/components/CryptoList";
import type { Cryptocurrency } from "../../../src/utils/validation";

// Mock CSS imports
vi.mock("../../../src/components/CryptoList.css", () => ({}));
vi.mock("../../../src/components/crypto/CryptoPriceCard.css", () => ({}));

describe("CryptoList Component (T042)", () => {
  // Mock cryptocurrency data
  const mockCryptos: Cryptocurrency[] = [
    {
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      price: 45000.5,
      change24h: 1250.3,
      changePercent24h: 2.85,
      volume24h: 28500000000,
      marketCapRank: 1,
    },
    {
      id: "ethereum",
      symbol: "ETH",
      name: "Ethereum",
      price: 2350.75,
      change24h: -75.5,
      changePercent24h: -3.11,
      volume24h: 15200000000,
      marketCapRank: 2,
    },
    {
      id: "binancecoin",
      symbol: "BNB",
      name: "Binance Coin",
      price: 310.25,
      change24h: 15.8,
      changePercent24h: 5.37,
      volume24h: 1200000000,
      marketCapRank: 4,
    },
    {
      id: "solana",
      symbol: "SOL",
      name: "Solana",
      price: 95.8,
      change24h: -2.1,
      changePercent24h: -2.14,
      volume24h: 850000000,
      marketCapRank: 5,
    },
    {
      id: "ripple",
      symbol: "XRP",
      name: "XRP",
      price: 0.52,
      change24h: 0.03,
      changePercent24h: 6.12,
      volume24h: 1800000000,
      marketCapRank: 6,
    },
  ];

  const mockOnSelectCrypto = vi.fn();
  const mockOnFavoriteToggle = vi.fn();
  const mockIsFavorite = vi.fn(
    (symbol: string) => symbol === "BTC" || symbol === "ETH",
  );

  const defaultProps = {
    cryptos: mockCryptos,
    onSelectCrypto: mockOnSelectCrypto,
    onFavoriteToggle: mockOnFavoriteToggle,
    favorites: ["BTC", "ETH"],
    isFavorite: mockIsFavorite,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render list header with title", () => {
    render(<CryptoList {...defaultProps} />);

    expect(screen.getByText("加密貨幣行情")).toBeInTheDocument();
  });

  it("should render all cryptocurrency cards", () => {
    render(<CryptoList {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Bitcoin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ethereum" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Binance Coin" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Solana" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "XRP" })).toBeInTheDocument();
  });

  it("should display correct number of cards", () => {
    const { container } = render(<CryptoList {...defaultProps} />);

    const cards = container.querySelectorAll(".crypto-price-card");
    expect(cards).toHaveLength(5);
  });

  it("should render sort buttons", () => {
    render(<CryptoList {...defaultProps} />);

    expect(screen.getByRole("button", { name: "按排名" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按價格" })).toBeInTheDocument();
  });

  it("should initially sort by market cap rank", () => {
    const { container } = render(<CryptoList {...defaultProps} />);

    const cards = container.querySelectorAll(".crypto-price-card");

    // First card should be Bitcoin (rank 1)
    expect(
      within(cards[0] as HTMLElement).getByText("Bitcoin"),
    ).toBeInTheDocument();

    // Second card should be Ethereum (rank 2)
    expect(
      within(cards[1] as HTMLElement).getByText("Ethereum"),
    ).toBeInTheDocument();

    // Third should be BNB (rank 4, skipping 3)
    expect(
      within(cards[2] as HTMLElement).getByText("Binance Coin"),
    ).toBeInTheDocument();
  });

  it('should have "按排名" button active by default', () => {
    render(<CryptoList {...defaultProps} />);

    const rankButton = screen.getByRole("button", { name: "按排名" });
    expect(rankButton).toHaveClass("active");
  });

  it('should sort by price when "按價格" button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<CryptoList {...defaultProps} />);

    const priceButton = screen.getByRole("button", { name: "按價格" });
    await user.click(priceButton);

    const cards = container.querySelectorAll(".crypto-price-card");

    // First card should be Bitcoin (highest price: 45000.5)
    expect(
      within(cards[0] as HTMLElement).getByRole("heading", { name: "Bitcoin" }),
    ).toBeInTheDocument();

    // Second card should be Ethereum (price: 2350.75)
    expect(
      within(cards[1] as HTMLElement).getByRole("heading", {
        name: "Ethereum",
      }),
    ).toBeInTheDocument();

    // Third should be BNB (price: 310.25)
    expect(
      within(cards[2] as HTMLElement).getByRole("heading", {
        name: "Binance Coin",
      }),
    ).toBeInTheDocument();

    // Fourth should be SOL (price: 95.8)
    expect(
      within(cards[3] as HTMLElement).getByRole("heading", { name: "Solana" }),
    ).toBeInTheDocument();

    // Last should be XRP (price: 0.52)
    expect(
      within(cards[4] as HTMLElement).getByRole("heading", { name: "XRP" }),
    ).toBeInTheDocument();
  });

  it("should switch active class when sort button is clicked", async () => {
    const user = userEvent.setup();
    render(<CryptoList {...defaultProps} />);

    const rankButton = screen.getByRole("button", { name: "按排名" });
    const priceButton = screen.getByRole("button", { name: "按價格" });

    // Initially rank button should be active
    expect(rankButton).toHaveClass("active");
    expect(priceButton).not.toHaveClass("active");

    // Click price button
    await user.click(priceButton);

    // Now price button should be active
    expect(priceButton).toHaveClass("active");
    expect(rankButton).not.toHaveClass("active");

    // Click rank button again
    await user.click(rankButton);

    // Rank button should be active again
    expect(rankButton).toHaveClass("active");
    expect(priceButton).not.toHaveClass("active");
  });

  it("should call onSelectCrypto when a card is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<CryptoList {...defaultProps} />);

    const firstCard = container.querySelector(".crypto-price-card");
    expect(firstCard).toBeInTheDocument();

    if (firstCard) {
      await user.click(firstCard);
      expect(mockOnSelectCrypto).toHaveBeenCalledTimes(1);
      expect(mockOnSelectCrypto).toHaveBeenCalledWith(mockCryptos[0]);
    }
  });

  it("should call onFavoriteToggle when favorite button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<CryptoList {...defaultProps} />);

    // Find Bitcoin card (first card)
    const btcCard = container.querySelectorAll(".crypto-price-card")[0];
    const btcFavoriteButton = within(btcCard as HTMLElement).getByTitle(
      "Remove from favorites",
    );

    await user.click(btcFavoriteButton);

    expect(mockOnFavoriteToggle).toHaveBeenCalledTimes(1);
    expect(mockOnFavoriteToggle).toHaveBeenCalledWith(mockCryptos[0]);
  });

  it("should call isFavorite for each cryptocurrency", () => {
    render(<CryptoList {...defaultProps} />);

    // isFavorite should be called for each crypto when rendering
    expect(mockIsFavorite).toHaveBeenCalled();

    // Check that it was called with crypto symbols
    expect(mockIsFavorite).toHaveBeenCalledWith("BTC");
    expect(mockIsFavorite).toHaveBeenCalledWith("ETH");
    expect(mockIsFavorite).toHaveBeenCalledWith("BNB");
    expect(mockIsFavorite).toHaveBeenCalledWith("SOL");
    expect(mockIsFavorite).toHaveBeenCalledWith("XRP");
  });

  it("should handle empty cryptocurrency list", () => {
    const { container } = render(<CryptoList {...defaultProps} cryptos={[]} />);

    const cards = container.querySelectorAll(".crypto-price-card");
    expect(cards).toHaveLength(0);

    // Header should still be rendered
    expect(screen.getByText("加密貨幣行情")).toBeInTheDocument();
  });

  it("should handle single cryptocurrency", () => {
    const singleCrypto = [mockCryptos[0]];

    const { container } = render(
      <CryptoList {...defaultProps} cryptos={singleCrypto} />,
    );

    const cards = container.querySelectorAll(".crypto-price-card");
    expect(cards).toHaveLength(1);
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
  });

  it("should maintain sort order after toggling favorite", async () => {
    const user = userEvent.setup();
    const { container } = render(<CryptoList {...defaultProps} />);

    // Click price sort button
    const priceButton = screen.getByRole("button", { name: "按價格" });
    await user.click(priceButton);

    // Get initial order
    let cards = container.querySelectorAll(".crypto-price-card");
    const firstCardBeforeFavorite = within(cards[0] as HTMLElement).getByRole(
      "heading",
      { name: "Bitcoin" },
    );

    // Toggle favorite on first card (Bitcoin)
    const btcCard = cards[0];
    const favoriteButton = within(btcCard as HTMLElement).getByTitle(
      "Remove from favorites",
    );
    await user.click(favoriteButton);

    // Order should remain the same (sorted by price)
    cards = container.querySelectorAll(".crypto-price-card");
    const firstCardAfterFavorite = within(cards[0] as HTMLElement).queryByRole(
      "heading",
      { name: "Bitcoin" },
    );

    expect(firstCardBeforeFavorite).toBeTruthy();
    expect(firstCardAfterFavorite).toBeTruthy();
  });

  it("should sort correctly with cryptos having same rank", () => {
    const cryptosWithSameRank = [
      { ...mockCryptos[0], marketCapRank: 1 },
      { ...mockCryptos[1], marketCapRank: 1 },
      { ...mockCryptos[2], marketCapRank: 2 },
    ];

    const { container } = render(
      <CryptoList {...defaultProps} cryptos={cryptosWithSameRank} />,
    );

    const cards = container.querySelectorAll(".crypto-price-card");
    expect(cards).toHaveLength(3);

    // Should handle same rank gracefully (order may be stable)
    expect(cards[0]).toBeInTheDocument();
    expect(cards[1]).toBeInTheDocument();
    expect(cards[2]).toBeInTheDocument();
  });

  it("should not mutate original cryptos array when sorting", async () => {
    const user = userEvent.setup();
    const originalCryptos = [...mockCryptos];

    render(<CryptoList {...defaultProps} cryptos={mockCryptos} />);

    // Change sort order
    const priceButton = screen.getByRole("button", { name: "按價格" });
    await user.click(priceButton);

    // Original array should remain unchanged
    expect(mockCryptos).toEqual(originalCryptos);
  });

  it("should have correct CSS classes", () => {
    const { container } = render(<CryptoList {...defaultProps} />);

    expect(container.querySelector(".crypto-list")).toBeInTheDocument();
    expect(container.querySelector(".list-header")).toBeInTheDocument();
    expect(container.querySelector(".sort-controls")).toBeInTheDocument();
    expect(container.querySelector(".list-container")).toBeInTheDocument();
  });

  it("should render cards with unique keys", () => {
    const { container } = render(<CryptoList {...defaultProps} />);

    const cards = container.querySelectorAll(".crypto-price-card");

    // Each card should be rendered (no duplicate key warnings in console)
    expect(cards).toHaveLength(mockCryptos.length);
  });

  it("should handle rapid sort button clicks", async () => {
    const user = userEvent.setup();
    render(<CryptoList {...defaultProps} />);

    const rankButton = screen.getByRole("button", { name: "按排名" });
    const priceButton = screen.getByRole("button", { name: "按價格" });

    // Rapidly click between sort options
    await user.click(priceButton);
    await user.click(rankButton);
    await user.click(priceButton);
    await user.click(rankButton);

    // Should end up with rank sort active
    expect(rankButton).toHaveClass("active");
    expect(priceButton).not.toHaveClass("active");
  });

  it("should pass correct props to each CryptoPriceCard", () => {
    const { container } = render(<CryptoList {...defaultProps} />);

    // Find Bitcoin card (first one, rank 1)
    const cards = container.querySelectorAll(".crypto-price-card");
    const btcCard = cards[0];

    // Bitcoin should have filled star (it's favorited)
    const btcFavoriteButton = within(btcCard as HTMLElement).getByTitle(
      "Remove from favorites",
    );
    expect(btcFavoriteButton).toHaveTextContent("★");

    // Find a non-favorited card (BNB is not in favorites)
    const bnbCard = cards[2]; // BNB is 3rd in rank order
    const bnbFavoriteButton = within(bnbCard as HTMLElement).getByTitle(
      "Add to favorites",
    );
    expect(bnbFavoriteButton).toHaveTextContent("☆");
  });
});

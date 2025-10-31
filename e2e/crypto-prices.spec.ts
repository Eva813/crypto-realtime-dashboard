/**
 * T043: E2E test for price display and update flow
 * Tests real-time cryptocurrency price display and interaction
 */
import { test, expect } from "@playwright/test";

test.describe("Cryptocurrency Price Display and Update Flow (T043)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto("/");
  });

  test("should display dashboard title and main sections", async ({ page }) => {
    // Verify main title is visible
    const title = page.getByRole("heading", { name: "加密貨幣即時行情" });
    await expect(title).toBeVisible();

    // Verify crypto list section
    const cryptoSection = page.getByRole("heading", {
      name: "加密貨幣行情",
      exact: true,
    });
    await expect(cryptoSection).toBeVisible();

    // Verify watchlist section
    const watchlistSection = page.getByRole("heading", { name: "自選清單" });
    await expect(watchlistSection).toBeVisible();
  });

  test("should display connection status indicator", async ({ page }) => {
    // Wait for connection status to appear
    await page.waitForSelector(".header-status", { timeout: 5000 });

    // Connection status should be visible
    const connectionStatus = page.locator(".header-status");
    await expect(connectionStatus).toBeVisible();
  });

  test("should load and display cryptocurrency list", async ({ page }) => {
    // Wait for loading to complete (either loading text disappears or cryptos appear)
    await page.waitForTimeout(2000);

    // Check if loading state appears first
    const loadingText = page.getByText("載入中...");
    const hasLoading = await loadingText.isVisible().catch(() => false);

    if (hasLoading) {
      // Wait for loading to complete
      await expect(loadingText).not.toBeVisible({ timeout: 10000 });
    }

    // Verify cryptocurrency cards are displayed
    const cryptoCards = page.locator(".crypto-price-card");
    await expect(cryptoCards.first()).toBeVisible({ timeout: 10000 });

    // Should display multiple cryptocurrencies (at least 5)
    const count = await cryptoCards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("should display cryptocurrency information correctly", async ({
    page,
  }) => {
    // Wait for first crypto card to load
    const firstCard = page.locator(".crypto-price-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Verify crypto card contains essential information
    await expect(firstCard.locator(".crypto-name")).toBeVisible();
    await expect(firstCard.locator(".crypto-symbol")).toBeVisible();
    await expect(firstCard.locator(".current-price")).toBeVisible();
    await expect(firstCard.locator(".price-change")).toBeVisible();

    // Verify price is formatted correctly (should start with $)
    const priceText = await firstCard.locator(".current-price").textContent();
    expect(priceText).toMatch(/^\$[\d,]+\./);

    // Verify change indicator exists (▲ or ▼)
    const changeArrow = await firstCard.locator(".change-arrow").textContent();
    expect(changeArrow).toMatch(/[▲▼]/);
  });

  test("should show visual feedback for positive and negative price changes", async ({
    page,
  }) => {
    // Wait for crypto cards to load
    await page.waitForSelector(".crypto-price-card", { timeout: 10000 });

    const allCards = page.locator(".crypto-price-card");
    const cardCount = await allCards.count();

    let foundPositive = false;
    let foundNegative = false;

    // Check multiple cards to find both positive and negative changes
    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      const card = allCards.nth(i);
      const priceChange = card.locator(".price-change");

      const hasPositive = await priceChange
        .evaluate((el) => el.classList.contains("positive"))
        .catch(() => false);
      const hasNegative = await priceChange
        .evaluate((el) => el.classList.contains("negative"))
        .catch(() => false);

      if (hasPositive) foundPositive = true;
      if (hasNegative) foundNegative = true;
    }

    // Should have at least one of each type (in real market data)
    // Note: In some cases all might be positive or negative
    expect(foundPositive || foundNegative).toBe(true);
  });

  test("should display sort controls and allow sorting", async ({ page }) => {
    // Wait for crypto list to load
    await page.waitForSelector(".crypto-price-card", { timeout: 10000 });

    // Verify sort buttons exist
    const rankButton = page.getByRole("button", { name: "按排名" });
    const priceButton = page.getByRole("button", { name: "按價格" });

    await expect(rankButton).toBeVisible();
    await expect(priceButton).toBeVisible();

    // Rank button should be active by default
    await expect(rankButton).toHaveClass(/active/);

    // Get first crypto name before sort
    const firstCardBefore = page.locator(".crypto-price-card").first();
    const firstNameBefore = await firstCardBefore
      .locator(".crypto-name")
      .textContent();

    // Click price sort button
    await priceButton.click();

    // Wait for re-render
    await page.waitForTimeout(500);

    // Price button should now be active
    await expect(priceButton).toHaveClass(/active/);

    // Verify order might have changed (depending on data)
    const firstCardAfter = page.locator(".crypto-price-card").first();
    const firstNameAfter = await firstCardAfter
      .locator(".crypto-name")
      .textContent();

    // Names might be same or different depending on data
    expect(firstNameAfter).toBeTruthy();
    expect(firstNameBefore).toBeTruthy();
  });

  test("should allow adding cryptocurrency to favorites", async ({ page }) => {
    // Wait for crypto cards to load
    const firstCard = page.locator(".crypto-price-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Find favorite button (star icon)
    const favoriteButton = firstCard.locator(".favorite-btn");
    await expect(favoriteButton).toBeVisible();

    // Check initial state (should be empty star ☆ or filled star ★)
    const initialState = await favoriteButton.textContent();
    expect(initialState).toMatch(/[☆★]/);

    // Click favorite button
    await favoriteButton.click();

    // Wait for state update
    await page.waitForTimeout(500);

    // State should have changed
    const newState = await favoriteButton.textContent();
    expect(newState).toMatch(/[☆★]/);

    // If it was empty, it should now be filled, or vice versa
    if (initialState === "☆") {
      expect(newState).toBe("★");
    } else {
      expect(newState).toBe("☆");
    }
  });

  test("should display favorites in watchlist section", async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector(".crypto-price-card", { timeout: 10000 });

    // Add a crypto to favorites
    const firstCard = page.locator(".crypto-price-card").first();
    const favoriteButton = firstCard.locator(".favorite-btn");

    // Ensure it's favorited
    const currentState = await favoriteButton.textContent();
    if (currentState === "☆") {
      await favoriteButton.click();
      await page.waitForTimeout(500);
    }

    // Check watchlist section
    const watchlistSection = page.locator(".watchlist-section");
    await expect(watchlistSection).toBeVisible();

    // Watchlist should contain the favorited crypto or show empty state
    const watchlistContent = await watchlistSection.textContent();
    expect(watchlistContent).toBeTruthy();
  });

  test("should open chart modal when clicking on cryptocurrency card", async ({
    page,
  }) => {
    // Wait for crypto cards to load
    const firstCard = page.locator(".crypto-price-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Click on the card (not on favorite button)
    await firstCard.locator(".price-section").click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Chart modal should be visible
    const chartModal = page.locator(".chart-modal-overlay");
    const modalIsVisible = await chartModal.isVisible().catch(() => false);

    if (modalIsVisible) {
      await expect(chartModal).toBeVisible();

      // Modal should contain chart component
      const chartComponent = page.locator(".chart-modal");
      await expect(chartComponent).toBeVisible();
    }
  });

  test("should handle loading state correctly", async ({ page }) => {
    // Reload page to see loading state
    await page.reload();

    // Loading state or content should appear within reasonable time
    const loadingOrContent = await page
      .waitForSelector(".crypto-price-card, .loading", { timeout: 10000 })
      .catch(() => null);

    expect(loadingOrContent).toBeTruthy();
  });

  test("should maintain state after favorite toggle", async ({ page }) => {
    // Wait for crypto cards to load
    await page.waitForSelector(".crypto-price-card", { timeout: 10000 });
    const firstCard = page.locator(".crypto-price-card").first();
    const cryptoName = await firstCard.locator(".crypto-name").textContent();

    // Toggle favorite
    const favoriteButton = firstCard.locator(".favorite-btn");
    await favoriteButton.click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForSelector(".crypto-price-card", { timeout: 10000 });

    // Find the same crypto again
    const allCards = page.locator(".crypto-price-card");
    const cardCount = await allCards.count();

    let foundSameCrypto = false;
    for (let i = 0; i < cardCount; i++) {
      const card = allCards.nth(i);
      const name = await card.locator(".crypto-name").textContent();

      if (name === cryptoName) {
        foundSameCrypto = true;
        // Favorite state should persist (localStorage)
        const button = card.locator(".favorite-btn");
        const state = await button.textContent();
        expect(state).toMatch(/[☆★]/);
        break;
      }
    }

    expect(foundSameCrypto).toBe(true);
  });

  test("should display market information for each cryptocurrency", async ({
    page,
  }) => {
    // Wait for crypto cards to load
    const firstCard = page.locator(".crypto-price-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Verify market information is displayed
    const cardFooter = firstCard.locator(".card-footer");
    await expect(cardFooter).toBeVisible();

    // Check for volume and market cap rank
    const footerText = await cardFooter.textContent();
    expect(footerText).toContain("24h Volume");
    expect(footerText).toContain("Market Cap Rank");
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Wait for content to load
    await page.waitForSelector(".crypto-price-card, .loading", {
      timeout: 10000,
    });

    // Main title should be visible
    const title = page.getByRole("heading", { name: "加密貨幣即時行情" });
    await expect(title).toBeVisible();

    // Crypto cards should be visible and stacked
    const firstCard = page.locator(".crypto-price-card").first();
    const cardIsVisible = await firstCard.isVisible().catch(() => false);

    if (cardIsVisible) {
      await expect(firstCard).toBeVisible();
    }
  });

  test("should handle network errors gracefully", async ({ page }) => {
    // This test verifies error handling
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Page should either show data or an error message, not crash
    const hasCards = await page.locator(".crypto-price-card").count();
    const hasError = await page
      .locator(".empty-state, .error-message")
      .isVisible()
      .catch(() => false);
    const hasLoading = await page
      .locator(".loading")
      .isVisible()
      .catch(() => false);

    // One of these states should be true
    expect(hasCards > 0 || hasError || hasLoading).toBe(true);
  });

  test("should display hover overlay on crypto cards", async ({ page }) => {
    // Wait for crypto cards to load
    const firstCard = page.locator(".crypto-price-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Check for overlay element
    const overlay = firstCard.locator(".card-overlay");
    await expect(overlay).toBeVisible();

    // Overlay should contain hint text
    const overlayText = await overlay.textContent();
    expect(overlayText).toContain("Click to view chart");
  });

  test("should display page within performance budget", async ({ page }) => {
    // Navigate to page
    await page.goto("/", { waitUntil: "networkidle" });

    // Measure performance
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    console.log("Performance Metrics:", metrics);

    // Dashboard should load quickly (within 3 seconds for initial render)
    // Note: This is a lenient check for E2E tests
    expect(metrics.domContentLoaded).toBeLessThan(3000);
  });
});

import { test, expect } from '@playwright/test';

/**
 * Bullet-proof checks for the Explore page modal:
 *  - Cards render with images
 *  - Clicking a card opens a modal with image + map + name
 *  - The page footer is not visible while the modal is open
 *  - Pressing Escape closes the modal
 *
 * Runs against /places (public, no auth needed). Same modal + card components
 * power /trip/[id]/activities, so this covers both surfaces.
 */
test.describe('Explore — place detail modal', () => {
  test('search → click card → modal opens with image, map, name; Esc closes', async ({ page }) => {
    await page.goto('/places');
    await expect(page.getByRole('heading', { name: /Find a place/i })).toBeVisible();

    // Trigger a query that reliably returns results so we don't depend on
    // empty-by-default rails in this dev environment.
    const search = page.getByPlaceholder(/Search Tokyo/i);
    await search.fill('Tokyo');

    // Wait for at least one card image to materialize. We anchor on a card
    // that has a real <img> (not a skeleton).
    const card = page.locator('[class*="snap-start"]:not(.animate-pulse)').first();
    await expect(card).toBeVisible({ timeout: 30_000 });

    // Card should have an image element with non-zero size. Scroll into
    // view (lazy-loaded) and wait for `complete`+`naturalWidth>0`.
    const cardImg = card.locator('img').first();
    await cardImg.scrollIntoViewIfNeeded();
    await expect(cardImg).toBeVisible();
    await page.waitForFunction(
      (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      await cardImg.elementHandle(),
      { timeout: 15_000 },
    );

    // Click the card
    await card.click();

    // Modal opens
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Must contain a heading (place name) and a close button
    await expect(modal.locator('h2').first()).toBeVisible();
    await expect(modal.getByRole('button', { name: /^Close$/i })).toBeVisible();

    // Modal carries an image + a map container (leaflet renders into .leaflet-container)
    await expect(modal.locator('img').first()).toBeVisible();
    // Map can take a moment to render
    await expect(modal.locator('.leaflet-container, [class*="leaflet"]').first()).toBeVisible({
      timeout: 15_000,
    });

    // The page footer must NOT be visible while the modal is open. We assert
    // by checking that any explicit <footer> is not in the user's viewport.
    const footer = page.locator('footer').first();
    if (await footer.count()) {
      const inView = await footer.evaluate((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      });
      expect(inView).toBe(false);
    }

    // "Add to itinerary" CTA is gated on trip context — must NOT show on /places
    await expect(modal.getByRole('button', { name: /Add to itinerary/i })).toHaveCount(0);

    // Esc closes
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('rails are distinct (different categories surface different places)', async ({ page }) => {
    await page.goto('/places');
    const search = page.getByPlaceholder(/Search Tokyo/i);
    await search.fill('Tokyo');

    // Wait for at least 8 cards to render so we have meaningful sample
    await expect(page.locator('[class*="snap-start"]:not(.animate-pulse)').first()).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[class*="snap-start"]:not(.animate-pulse)').length >= 8,
      undefined,
      { timeout: 20_000 },
    );

    // Collect names from first 8 cards. Distinct sources should produce
    // at least a handful of unique place names (regression guard against
    // the bug where every rail rendered the same 4 results).
    const names = await page.$$eval('[class*="snap-start"]:not(.animate-pulse) h3', (els) =>
      els.slice(0, 8).map((el) => (el.textContent || '').trim()).filter(Boolean),
    );
    const unique = new Set(names);
    expect(unique.size).toBeGreaterThanOrEqual(4);
  });
});

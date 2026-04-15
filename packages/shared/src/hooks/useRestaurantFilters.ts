/**
 * @module useRestaurantFilters
 * Manages filter, sort, and view-mode state for the Restaurants tab on trip detail pages.
 * Mirrors the pattern of `useActivityFilters` but is scoped to dining items.
 * Supports 'booked' (items already in the itinerary) and 'discover' (recommended
 * dining from trip_context) view modes, plus category, cuisine sub-filter, search,
 * and sort options.
 *
 * Also exports constants and sort configuration used by both web and mobile
 * restaurant filter UIs.
 * Used by the web RestaurantsTab and the mobile RestaurantsScreen.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { DiscoverItem } from '../types';

// ─── Constants (shared between web + mobile) ──────────────────
export const RESTAURANT_CATEGORIES = ['All', 'Restaurant', 'Experience', 'Bar', 'Dessert', 'Bakery', 'Street Food'] as const;
export type RestaurantCategory = (typeof RESTAURANT_CATEGORIES)[number];

export const RESTAURANT_CATEGORY_ICONS: Record<string, string> = {
  All: 'compass',
  Restaurant: 'cutlery',
  Experience: 'fire',
  Bar: 'glass',
  Dessert: 'birthday-cake',
  Bakery: 'coffee',
  'Street Food': 'shopping-bag',
};

export const CUISINE_SUBFILTERS: Record<string, string[]> = {
  All: [],
  Restaurant: ['All Restaurants', 'Classic French', 'Fine Dining', 'Modern French', 'Traditional French', 'Cr\u00eapes & Galettes'],
  Experience: ['All Experiences', 'Food Tours', 'Wine Tasting', 'Cooking Classes', 'Pastry Class'],
  Bar: ['All Bars', 'Wine Bar', 'Cocktail Bar', 'Aperitivo', 'Rooftop'],
  Dessert: ['All Desserts', 'Ice Cream & Sorbet', 'Pastry', 'Artisanal'],
  Bakery: ['All Bakeries', 'Artisan Bakery', 'Pastries', 'Bread'],
  'Street Food': ['All Street Food', 'Falafel', 'Cr\u00eapes', 'Quick Bites'],
};

export type RestaurantSortOption = 'rating' | 'price' | 'distance' | 'reviews';

export const RESTAURANT_SORT_OPTIONS: { key: RestaurantSortOption; label: string; icon: string }[] = [
  { key: 'rating', label: 'Rating', icon: 'star' },
  { key: 'price', label: 'Price', icon: 'dollar' },
  { key: 'distance', label: 'Distance', icon: 'map-marker' },
  { key: 'reviews', label: 'Reviews', icon: 'comments-o' },
];

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Manages all filter/sort/search state for the restaurants tab.
 *
 * Splits the provided `externalItems` into `bookedItems` (those with `isBooked: true`)
 * and `discoverItems`. Automatically switches to 'booked' view once booked items appear.
 * Filters support text search across name, cuisine, tags, and description; category
 * and cuisine sub-filter matching; and four sort modes (rating, price, distance, reviews).
 *
 * @param externalItems - Combined array of restaurant `DiscoverItem` objects from the parent
 *   (typically assembled by the screen from `trip_context.restaurants` and itinerary dining activities)
 * @returns Object with:
 *   - `viewMode` / `setViewMode` — `'booked'` or `'discover'`
 *   - `searchQuery` / `setSearchQuery` — text search input state
 *   - `categoryFilter` / `handleCategoryChange` — active category + change handler (resets cuisine sub-filter)
 *   - `cuisineSubFilter` / `setCuisineSubFilter` — active cuisine sub-filter string
 *   - `sortBy` / `setSortBy` — active sort option (`'rating'` | `'price'` | `'distance'` | `'reviews'`)
 *   - `favorites` / `toggleFavorite` — client-side favorites set
 *   - `sourceItems` — full list for the current view mode (before filtering)
 *   - `filteredItems` — items after all filters and sort are applied
 *   - `bookedCount` / `discoverCount` — counts for badge display
 *   - `clearFilters` — reset all filters to defaults
 *
 * @example
 * ```tsx
 * const { filteredItems, categoryFilter, handleCategoryChange, sortBy, setSortBy } =
 *   useRestaurantFilters(restaurantItems);
 * ```
 */
export function useRestaurantFilters(externalItems?: DiscoverItem[]) {
  const allDining: DiscoverItem[] = externalItems ?? [];
  const bookedItems = allDining.filter((d) => d.isBooked);
  const discoverItems = allDining.filter((d) => !d.isBooked);

  const [viewMode, setViewMode] = useState<'booked' | 'discover'>('discover');

  // Switch to 'booked' once data loads with booked items
  useEffect(() => {
    if (bookedItems.length > 0) setViewMode('booked');
  }, [bookedItems.length]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RestaurantCategory>('All');
  const [cuisineSubFilter, setCuisineSubFilter] = useState('');
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('rating');
  const [favorites, setFavorites] = useState<string[]>([]);

  /**
   * Changes the active restaurant category filter and clears the cuisine sub-filter
   * to prevent stale sub-filter values from a different category appearing.
   * @param f - The new restaurant category to filter by
   */
  const handleCategoryChange = (f: RestaurantCategory) => {
    setCategoryFilter(f);
    setCuisineSubFilter('');
  };

  const sourceItems = viewMode === 'booked' ? bookedItems : discoverItems;

  const filteredItems = useMemo(() => {
    let items = sourceItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.cuisine?.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.description.toLowerCase().includes(q),
      );
    }

    if (categoryFilter !== 'All') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (cuisineSubFilter) {
      const sub = cuisineSubFilter.toLowerCase();
      items = items.filter(
        (item) =>
          item.cuisine?.toLowerCase().includes(sub) ||
          item.tags.some((t) => t.toLowerCase().includes(sub)) ||
          item.name.toLowerCase().includes(sub) ||
          item.description.toLowerCase().includes(sub),
      );
    }

    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'reviews': return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'price': {
          const priceVal = (p?: string) => (p?.match(/\u20ac/g) || []).length || 0;
          return priceVal(a.price) - priceVal(b.price);
        }
        case 'distance': {
          const distVal = (d?: string) => parseFloat(d?.replace(/[^\d.]/g, '') || '999');
          return distVal(a.distance) - distVal(b.distance);
        }
        default: return 0;
      }
    });

    return items;
  }, [sourceItems, searchQuery, categoryFilter, cuisineSubFilter, sortBy]);

  /**
   * Toggles the favorite state for a restaurant item (client-side only, not persisted).
   * @param itemId - ID of the `DiscoverItem` to toggle
   */
  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => (prev.includes(itemId) ? prev.filter((f) => f !== itemId) : [...prev, itemId]));
  };

  /**
   * Resets all filters (category, cuisine sub-filter, search query, sort order) back to defaults.
   */
  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setCuisineSubFilter('');
    setSortBy('rating');
  };

  return {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    categoryFilter, handleCategoryChange,
    cuisineSubFilter, setCuisineSubFilter,
    sortBy, setSortBy,
    favorites, toggleFavorite,
    sourceItems,
    filteredItems,
    bookedCount: bookedItems.length,
    discoverCount: discoverItems.length,
    clearFilters,
  };
}

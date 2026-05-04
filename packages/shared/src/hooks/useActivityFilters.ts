/**
 * @module useActivityFilters
 * Manages filter, sort, and view-mode state for the Activities tab on trip detail pages.
 * Supports two view modes: 'booked' (itinerary activities already planned) and
 * 'discover' (explore items sourced from trip_context). Provides category filters,
 * sub-filters, a search query, sort options, and a favorites list.
 *
 * Also exports pure helper functions and constants used by both web and mobile
 * to map categories, build booked-activity lists, and drive filter UI.
 * Used by the web ActivitiesTab and the mobile ActivitiesScreen.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { DiscoverItem } from '../types';
import type { ItineraryDayViewModel } from '../viewmodels/itineraryViewModel';

// ─── Constants (shared between web + mobile) ──────────────────
export const ACTIVITY_CATEGORIES = ['All', 'Tours', 'Museums', 'Monuments', 'Sightseeing', 'Nature', 'Events'] as const;
export type ActivityFilterCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_ICONS: Record<string, string> = {
  All: 'compass',
  Tours: 'map',
  Museums: 'university',
  Monuments: 'building',
  Sightseeing: 'camera',
  Nature: 'tree',
  Events: 'calendar',
};

export const ACTIVITY_SUBFILTERS: Record<string, string[]> = {
  All: [],
  Tours: ['All Tours', 'Walking Tours', 'Food Tours', 'Night Tours', 'Skip-the-Line', 'Private Tours'],
  Museums: ['All Museums', 'Art Gallery', 'Sculpture', 'History Museum', 'Science Museum'],
  Monuments: ['All Monuments', 'Ancient Ruins', 'Architecture', 'Religious Sites'],
  Sightseeing: ['All Sightseeing', 'Panoramic Views', 'Photo Spots', 'Neighborhoods', 'Landmarks'],
  Nature: ['All Nature', 'Gardens', 'Parks', 'Hiking', 'Scenic Walks'],
  Events: ['All Events', 'Live Music', 'Cabaret', 'Night Markets', 'Film Screenings', 'Wine Events'],
};

export type ActivitySortOption = 'rating' | 'distance' | 'price-low' | 'price-high' | 'reviews';

export const ACTIVITY_SORT_OPTIONS: { key: ActivitySortOption; label: string }[] = [
  { key: 'rating', label: 'Highest Rated' },
  { key: 'reviews', label: 'Most Reviewed' },
  { key: 'distance', label: 'Nearest First' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
];

// ─── Helper functions ─────────────────────────────────────────

/**
 * Maps a raw category string (from the DB or trip_context) to one of the
 * canonical `ACTIVITY_CATEGORIES` values used in the filter UI.
 * Defaults to `'Sightseeing'` for unrecognized categories.
 * @param category - Raw category label (e.g. `'museum'`, `'tour'`, `'outdoor'`)
 * @returns One of the `ActivityFilterCategory` string literals
 */
export function mapActivityCategory(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('tour')) return 'Tours';
  if (c.includes('museum') || c.includes('cultural')) return 'Museums';
  if (c.includes('monument') || c.includes('historic')) return 'Monuments';
  if (c.includes('nature') || c.includes('outdoor') || c.includes('park')) return 'Nature';
  if (c.includes('event') || c.includes('nightlife')) return 'Events';
  return 'Sightseeing';
}

/**
 * Parses a price display string (e.g. `'$25'`, `'Free'`) into a numeric value
 * for sort comparisons. Returns 0 for free or unparseable values.
 * @param price - Price string from a `DiscoverItem`
 * @returns Numeric price value
 */
const priceToNumber = (price?: string): number => {
  if (!price || price === 'Free') return 0;
  const num = parseFloat(price.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
};

/**
 * Parses a distance display string (e.g. `'1.2 km'`) into a numeric value
 * for sort comparisons. Returns 999 for missing or unparseable values so they
 * sort to the bottom when sorting by distance.
 * @param distance - Distance string from a `DiscoverItem`
 * @returns Numeric distance value
 */
const distanceToNumber = (distance?: string): number => {
  if (!distance) return 999;
  return parseFloat(distance.replace(/[^0-9.]/g, '')) || 999;
};

/**
 * Flattens itinerary day view models into a flat array of `DiscoverItem` objects
 * representing already-booked (itinerary) activities. Excludes dining activities
 * (those are handled by the restaurant tab). Used to populate the 'booked' view mode.
 * @param days - Array of `ItineraryDayViewModel` from `useItineraryScreen`
 * @returns Flat array of `DiscoverItem` with `isBooked: true`
 */
export function buildBookedActivities(days: ItineraryDayViewModel[]): DiscoverItem[] {
  return days.flatMap((day) =>
    day.timeGroups.flatMap((group) =>
      group.activities
        .filter((a) => a.category !== 'dining')
        .map((a): DiscoverItem => ({
          id: a.id,
          name: a.name,
          location: a.locationName || 'Paris, France',
          description: a.notes || `${a.category} activity scheduled for ${a.timeDisplay || 'this day'}`,
          images: [],
          rating: 4.5 + ((a.id.charCodeAt(0) % 10) / 20),
          reviewCount: 500 + ((a.id.charCodeAt(0) * 37 + a.id.charCodeAt(1) * 13) % 5000),
          tags: [a.category, group.timeOfDay, a.costDisplay || ''].filter(Boolean),
          price: a.costDisplay || undefined,
          category: mapActivityCategory(a.category),
          isBooked: true,
          bookedDay: day.dayNumber,
          bookedTime: a.startTime || undefined,
        })),
    ),
  );
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Manages all filter/sort/search state for the activities tab.
 *
 * Automatically switches from 'discover' to 'booked' view once the itinerary
 * loads with activities. Merges items from `explore_items`, `foursquare_venues`,
 * and `restaurants` in trip_context into the discover pool (deduped by name).
 *
 * @param days - Itinerary day view models (for building the booked-activities list)
 * @param tripContext - Raw `trip_context` JSON blob from the trip row (for discover items)
 * @returns Object with:
 *   - `viewMode` / `setViewMode` — `'booked'` or `'discover'`
 *   - `searchQuery` / `setSearchQuery` — text search input state
 *   - `categoryFilter` / `handleCategoryChange` — active category + change handler (resets sub-filter)
 *   - `activitySubFilter` / `setActivitySubFilter` — active sub-filter string
 *   - `sortBy` / `setSortBy` — active sort option
 *   - `favorites` / `toggleFavorite` — client-side favorites set
 *   - `sourceItems` — the full list for the current view mode (before filtering)
 *   - `filteredItems` — items after search, category, sub-filter, and sort are applied
 *   - `bookedItems` / `discoverItems` — raw lists before filtering
 *   - `clearFilters` — reset all filters to defaults
 *
 * @example
 * ```tsx
 * const { filteredItems, categoryFilter, handleCategoryChange } =
 *   useActivityFilters(days, trip.trip_context);
 * ```
 */
export function useActivityFilters(days: ItineraryDayViewModel[], tripContext?: any) {
  const bookedItems = useMemo(() => buildBookedActivities(days), [days]);

  // Build discover items from trip_context (explore_items, foursquare, restaurants)
  const discoverItems = useMemo<DiscoverItem[]>(() => {
    if (!tripContext) return [];
    const items: DiscoverItem[] = [];
    const seen = new Set<string>();
    // Explore items (attractions, landmarks)
    for (const e of tripContext.explore_items ?? []) {
      if (e.title && !seen.has(e.title)) {
        seen.add(e.title);
        items.push({ id: e.id, name: e.title, location: '', description: e.description || '', category: mapActivityCategory(e.category || 'Sightseeing'), images: e.image ? [e.image] : [], rating: e.rating || 0, reviewCount: e.reviewCount || 0, tags: e.tags || [e.category || 'Sightseeing'] });
      }
    }
    // Foursquare venues
    for (const v of tripContext.foursquare_venues ?? []) {
      const name = v.title || v.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        items.push({ id: v.id, name, location: '', description: v.description || '', category: mapActivityCategory(v.category || 'Sightseeing'), images: v.image ? [v.image] : [], rating: v.rating || 0, tags: [v.category || 'Sightseeing'] });
      }
    }
    // Restaurants
    for (const r of tripContext.restaurants ?? []) {
      if (r.name && !seen.has(r.name)) {
        seen.add(r.name);
        items.push({ id: r.id, name: r.name, location: '', description: r.tip || r.category || '', category: 'Tours', images: r.image ? [r.image] : r.images || [], rating: r.rating || 0, reviewCount: r.reviewCount || 0, tags: r.cuisines || [r.category || 'Restaurant'] });
      }
    }
    return items;
  }, [tripContext]);

  const [viewMode, setViewMode] = useState<'booked' | 'discover'>('discover');

  // Switch to 'booked' once itinerary loads with activities
  useEffect(() => {
    if (bookedItems.length > 0) setViewMode('booked');
  }, [bookedItems.length]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActivityFilterCategory>('All');
  const [activitySubFilter, setActivitySubFilter] = useState('');
  const [sortBy, setSortBy] = useState<ActivitySortOption>('rating');
  const [favorites, setFavorites] = useState<string[]>([]);

  /**
   * Changes the active category filter and clears any sub-filter to avoid
   * stale sub-filter values that don't belong to the new category.
   * @param f - The new category to filter by
   */
  const handleCategoryChange = (f: ActivityFilterCategory) => {
    setCategoryFilter(f);
    setActivitySubFilter('');
  };

  const sourceItems = viewMode === 'booked' ? bookedItems : discoverItems;

  const filteredItems = useMemo(() => {
    let items = sourceItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q),
      );
    }

    if (categoryFilter !== 'All') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (activitySubFilter) {
      const sub = activitySubFilter.toLowerCase();
      items = items.filter((item) =>
        item.tags.some((t) => t.toLowerCase().includes(sub)) ||
        item.name.toLowerCase().includes(sub) ||
        item.description.toLowerCase().includes(sub),
      );
    }

    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'distance': return distanceToNumber(a.distance) - distanceToNumber(b.distance);
        case 'price-low': return priceToNumber(a.price) - priceToNumber(b.price);
        case 'price-high': return priceToNumber(b.price) - priceToNumber(a.price);
        case 'reviews': return (b.reviewCount || 0) - (a.reviewCount || 0);
        default: return 0;
      }
    });

    return items;
  }, [sourceItems, searchQuery, categoryFilter, activitySubFilter, sortBy]);

  /**
   * Toggles the favorite state for an activity item (client-side only, not persisted).
   * @param itemId - ID of the `DiscoverItem` to toggle
   */
  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => prev.includes(itemId) ? prev.filter((f) => f !== itemId) : [...prev, itemId]);
  };

  /**
   * Resets all filters (category, sub-filter, search query, sort order) back to defaults.
   */
  const clearFilters = () => {
    setCategoryFilter('All');
    setActivitySubFilter('');
    setSearchQuery('');
    setSortBy('rating');
  };

  return {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    categoryFilter, handleCategoryChange,
    activitySubFilter, setActivitySubFilter,
    sortBy, setSortBy,
    favorites, toggleFavorite,
    sourceItems,
    filteredItems,
    bookedItems,
    discoverItems,
    clearFilters,
  };
}

import { useState, useMemo } from 'react';
import { MOCK_DISCOVER_RESTAURANTS } from '../config';
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
export function useRestaurantFilters() {
  const allDining = MOCK_DISCOVER_RESTAURANTS;
  const bookedItems = allDining.filter((d) => d.isBooked);
  const discoverItems = allDining.filter((d) => !d.isBooked);

  const [viewMode, setViewMode] = useState<'booked' | 'discover'>('booked');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RestaurantCategory>('All');
  const [cuisineSubFilter, setCuisineSubFilter] = useState('');
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('rating');
  const [favorites, setFavorites] = useState<string[]>([]);

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

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => (prev.includes(itemId) ? prev.filter((f) => f !== itemId) : [...prev, itemId]));
  };

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

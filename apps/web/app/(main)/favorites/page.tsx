'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';

const ResponsiveMasonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.ResponsiveMasonry),
  { ssr: false },
);
const Masonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.default),
  { ssr: false },
);
import {
  Search, Globe, Landmark, UtensilsCrossed, Compass, CalendarDays, Heart,
  MapPin, ArrowUpDown, Star, X, Clock, ExternalLink,
} from 'lucide-react';
import { MOCK_PLACES } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { PinCard } from '@/components/PinCard';
import { Footer, OceanWave } from '@/components/home';

type SortKey = 'default' | 'rating' | 'name';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'name', label: 'A–Z' },
];

const TABS = [
  { key: 'all', label: 'All', icon: Globe },
  { key: 'destination', label: 'Destinations', icon: MapPin },
  { key: 'attraction', label: 'Attractions', icon: Landmark },
  { key: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { key: 'experience', label: 'Experiences', icon: Compass },
  { key: 'event', label: 'Events', icon: CalendarDays },
  { key: 'favorites', label: 'Favorites', icon: Heart },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PlacesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return MOCK_PLACES;
    if (activeTab === 'favorites') return MOCK_PLACES.filter((p) => favorites.includes(p.id));
    return MOCK_PLACES.filter((p) => p.type === activeTab);
  }, [activeTab, favorites]);

  // Compute subcategories from current tab
  const subcategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of tabFiltered) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ label: cat, count }));
  }, [tabFiltered]);

  // Filter by subcategory + search
  const filtered = useMemo(() => {
    let items = tabFiltered;

    if (activeSubcategory) {
      items = items.filter((p) => p.category === activeSubcategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === 'rating') items = [...items].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [tabFiltered, activeSubcategory, searchQuery, sortBy]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1">
      {/* Sticky Header */}
      <div className="sticky top-11 z-40 bg-white/95 backdrop-blur-md">
        {/* Tabs + Search row */}
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-0">
          <div className="flex items-center gap-4">
            {/* Category Tabs — single row, no visible scroll */}
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-0 -mb-px">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setActiveSubcategory(''); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-all shrink-0 ${
                      activeTab === key
                        ? 'border-[#1e3a5f] text-[#1e3a5f] font-semibold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort + Search */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="relative">
                <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="appearance-none pl-7 pr-6 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search places..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thin divider */}
        <div className="h-px bg-gray-100" />

        {/* Subcategory pills — compact row */}
        {subcategories.length > 1 && (
          <div className="max-w-7xl mx-auto px-4 py-1.5">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveSubcategory('')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-all ${
                  !activeSubcategory
                    ? 'bg-[#1e3a5f] text-white font-medium'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {subcategories.map(({ label, count }) => (
                <button
                  key={label}
                  onClick={() => setActiveSubcategory(label === activeSubcategory ? '' : label)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-all ${
                    activeSubcategory === label
                      ? 'bg-[#1e3a5f] text-white font-medium'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile search */}
      <div className="sm:hidden max-w-7xl mx-auto px-4 pt-2.5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
      </div>

      {/* Masonry Grid */}
      <div
        className="max-w-7xl mx-auto px-4 py-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l40 40M40 0L0 40' stroke='%23000' stroke-width='0.3' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${activeSubcategory}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {filtered.length > 0 ? (
              <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 3, 1024: 4, 1280: 5 }}>
                <Masonry gutter="8px">
                  {filtered.map((item, i) => (
                    <PinCard
                      key={item.id}
                      item={item}
                      index={i}
                      isFavorited={favorites.includes(item.id)}
                      onFavorite={toggleFavorite}
                      onClick={(id) => {
                        const place = MOCK_PLACES.find((p) => p.id === id);
                        if (place) setSelectedPlace(place);
                      }}
                    />
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            ) : (
              <div className="text-center py-20">
                <Search size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {activeTab === 'favorites' ? 'No favorites yet. Heart places to save them here.' : 'No places match your search.'}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      </div>
      <OceanWave />
      <Footer />

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedPlace(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl"
            >
              {/* Image */}
              <div className="relative h-[220px] overflow-hidden">
                <img src={selectedPlace.image} alt={selectedPlace.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-[#1e3a5f]">
                  {selectedPlace.category}
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-[12px] font-bold text-gray-800">{selectedPlace.rating}</span>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedPlace.name}</h2>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <MapPin size={11} className="text-gray-400" />
                    <span>{selectedPlace.tagline}</span>
                  </div>
                </div>

                {selectedPlace.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedPlace.description}</p>
                )}

                {selectedPlace.tags && selectedPlace.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPlace.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-[11px] text-gray-600 font-medium">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => { toggleFavorite(selectedPlace.id); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      favorites.includes(selectedPlace.id)
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart size={13} className={favorites.includes(selectedPlace.id) ? 'fill-red-500' : ''} />
                    {favorites.includes(selectedPlace.id) ? 'Saved' : 'Save'}
                  </button>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-500 capitalize">{selectedPlace.type}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { use, useState } from 'react';
import dynamic from 'next/dynamic';

const ResponsiveMasonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.ResponsiveMasonry),
  { ssr: false },
);
const Masonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.default),
  { ssr: false },
);
import { AnimatePresence, motion } from 'motion/react';
import {
  Search, CalendarCheck, Star, X, ArrowUpDown,
  Map, Landmark, TreePine, Compass, CalendarDays, Camera,
  ImageIcon,
} from 'lucide-react';
import {
  useItineraryScreen,
  useActivityFilters,
  ACTIVITY_CATEGORIES,
  ACTIVITY_SUBFILTERS,
  ACTIVITY_SORT_OPTIONS,
} from '@travyl/shared';
import { SplitScreenModal } from '@/components/itinerary';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';

const ACCENT = 'var(--trip-base)';
const ACCENT_BG_08 = 'rgb(var(--trip-base-rgb) / 0.08)';
const ACCENT_BG_19 = 'rgb(var(--trip-base-rgb) / 0.19)';
const ACCENT_RING = 'rgb(var(--trip-base-rgb) / 0.3)';

const categoryIcons: Record<string, React.ReactNode> = {
  All: <Compass size={13} />,
  Tours: <Map size={13} />,
  Museums: <Landmark size={13} />,
  Monuments: <Landmark size={13} />,
  Sightseeing: <Camera size={13} />,
  Nature: <TreePine size={13} />,
  Events: <CalendarDays size={13} />,
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200 ${className}`} />;
}

function SkeletonActivityCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="relative h-[120px] bg-gray-100">
        <ImageIcon size={24} className="text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="flex items-center gap-4 px-3 py-2.5">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2.5 w-10 ml-auto" />
      </div>
    </div>
  );
}

function ActivitiesSkeleton() {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['All', 'Sightseeing', 'Dining', 'Cultural'].map((label, i) => (
          <div key={label} className={`rounded-full px-3.5 py-1.5 ${i === 0 ? 'text-white' : 'bg-gray-100'}`} style={i === 0 ? { backgroundColor: ACCENT } : undefined}>
            <Skeleton className={`h-3 w-16 ${i === 0 ? 'bg-white/30' : ''}`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonActivityCard />
        <SkeletonActivityCard />
        <SkeletonActivityCard />
        <SkeletonActivityCard />
      </div>
    </div>
  );
}

export default function Activities({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { days, isLoading } = useItineraryScreen(id);

  const {
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
  } = useActivityFilters(days);

  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activeFilterCount = (minRating > 0 ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0) + (activitySubFilter ? 1 : 0);

  const clearAllFilters = () => {
    setMinRating(0);
    clearFilters();
  };

  // Apply local minRating filter on top of shared filtered items
  const displayItems = minRating > 0
    ? filteredItems.filter((item) => item.rating >= minRating)
    : filteredItems;

  if (isLoading) return <ActivitiesSkeleton />;

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setViewMode('booked')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium transition-all border-b-2 ${
            viewMode === 'booked'
              ? 'border-current'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          style={viewMode === 'booked' ? { color: ACCENT } : undefined}
        >
          <CalendarCheck size={14} />
          Booked
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: viewMode === 'booked' ? ACCENT_BG_08 : '#f3f4f6', color: viewMode === 'booked' ? ACCENT : '#6b7280' }}>
            {bookedItems.length}
          </span>
        </button>
        <button
          onClick={() => setViewMode('discover')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium transition-all border-b-2 ${
            viewMode === 'discover'
              ? 'border-current'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          style={viewMode === 'discover' ? { color: ACCENT } : undefined}
        >
          <Search size={14} />
          Discover
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: viewMode === 'discover' ? ACCENT_BG_08 : '#f3f4f6', color: viewMode === 'discover' ? ACCENT : '#6b7280' }}>
            {discoverItems.length}
          </span>
        </button>
      </div>

      {/* Search Bar -- always visible */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': ACCENT_RING } as React.CSSProperties}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => { setShowSort(!showSort); setShowFilters(false); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowUpDown size={14} className="text-gray-400" />
              </button>
              {showSort && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50">
                  {ACTIVITY_SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setShowSort(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${sortBy === opt.key ? 'font-medium' : 'text-gray-600'}`}
                      style={sortBy === opt.key ? { color: ACCENT } : undefined}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <span className="text-[12px] text-gray-400 shrink-0">{displayItems.length}</span>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Minimum Rating</div>
            <div className="flex gap-2">
              {[0, 3.5, 4.0, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`flex-1 py-2 rounded-lg text-xs border transition-all flex items-center justify-center gap-1 ${
                    minRating === r ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: minRating === r ? ACCENT : undefined }}
                >
                  {r === 0 ? 'Any' : <><Star size={10} fill={minRating === r ? '#fff' : '#f59e0b'} className={minRating === r ? 'text-white' : 'text-amber-500'} />{r}+</>}
                </button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X size={12} />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Category Tabs (underline style) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm">
      <div className="flex gap-0.5 overflow-x-auto pb-0 -mx-1 px-1 scrollbar-hide border-b border-gray-100">
        {ACTIVITY_CATEGORIES.map((f) => {
          const count = sourceItems.filter((i) => f === 'All' || i.category === f).length;
          if (count === 0 && f !== 'All') return null;
          return (
            <button
              key={f}
              onClick={() => handleCategoryChange(f)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-all ${
                categoryFilter === f
                  ? 'font-semibold border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
              style={categoryFilter === f ? { color: ACCENT } : undefined}
            >
              {categoryIcons[f]}
              <span>{f}</span>
              <span className={`text-[10px] ${categoryFilter === f ? 'opacity-60' : 'text-gray-400'}`}>
                {f === 'All' ? sourceItems.length : count}
              </span>
            </button>
          );
        })}
      </div>
      </div>

      {/* Sub-filters */}
      {categoryFilter !== 'All' && ACTIVITY_SUBFILTERS[categoryFilter]?.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {ACTIVITY_SUBFILTERS[categoryFilter].map((sub) => {
            const isAll = sub.startsWith('All ');
            const isActive = isAll ? !activitySubFilter : activitySubFilter === sub;
            return (
              <button
                key={sub}
                onClick={() => setActivitySubFilter(isAll ? '' : sub)}
                className={`px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap transition-all border ${
                  isActive ? 'border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: isActive ? ACCENT_BG_08 : undefined,
                  color: isActive ? ACCENT : undefined,
                  borderColor: isActive ? ACCENT_BG_19 : undefined,
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* Masonry Grid */}
      <div
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l40 40M40 0L0 40' stroke='%23000' stroke-width='0.3' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${categoryFilter}-${activitySubFilter}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {displayItems.length > 0 ? (
              <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 520: 2, 900: 3 }}>
                <Masonry gutter="8px">
                  {displayItems.map((item, i) => (
                    <ItineraryPinCard
                      key={item.id}
                      item={item}
                      index={i}
                      accentColor={item.category === 'Events' ? 'var(--trip-base)' : ACCENT}
                      isFavorited={favorites.includes(item.id)}
                      onFavorite={toggleFavorite}
                      onClick={() => setSelectedIndex(displayItems.indexOf(item))}
                      onAddToItinerary={() => {}}
                      onRemoveFromItinerary={() => {}}
                    />
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            ) : (
              <div className="text-center py-12">
                <Search size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No results match your filters</p>
                <button onClick={clearAllFilters} className="text-xs mt-2 hover:underline" style={{ color: ACCENT }}>
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {selectedIndex !== null && (
        <SplitScreenModal
          items={displayItems}
          initialIndex={selectedIndex}
          accentColor={ACCENT}
          favorites={favorites}
          onClose={() => setSelectedIndex(null)}
          onFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}

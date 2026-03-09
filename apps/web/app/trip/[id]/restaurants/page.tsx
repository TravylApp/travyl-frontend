'use client';

import { use } from 'react';
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
  Search, CalendarCheck, X,
  Utensils, Wine, IceCreamCone, Compass, CookingPot, Sandwich, Croissant,
  ImageIcon,
} from 'lucide-react';
import {
  useItineraryScreen,
  useRestaurantFilters,
  RESTAURANT_CATEGORIES,
  CUISINE_SUBFILTERS,
  TAB_COLORS,
  COLORS,
} from '@travyl/shared';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';

const ACCENT = TAB_COLORS.restaurants;
const NAVY = COLORS.navy; // #1e3a5f -- used for active toggle / category states

const categoryIcons: Record<string, React.ReactNode> = {
  All: <Compass size={14} />,
  Restaurant: <Utensils size={14} />,
  Experience: <CookingPot size={14} />,
  Bar: <Wine size={14} />,
  Dessert: <IceCreamCone size={14} />,
  Bakery: <Croissant size={14} />,
  'Street Food': <Sandwich size={14} />,
};

/* -- Skeleton components ------------------------------------------------- */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200 ${className}`} />;
}

function SkeletonDiscoverCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="relative h-[180px] bg-gray-100">
        <ImageIcon size={28} className="text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="p-3.5">
        <Skeleton className="h-4 w-[80%] mb-1.5" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    </div>
  );
}

function RestaurantsSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-0 mb-4 border-b border-gray-200">
        <div className="flex-1 py-2 text-center">
          <Skeleton className="h-3 w-20 mx-auto" />
        </div>
        <div className="flex-1 py-2 text-center">
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonDiscoverCard />
        <SkeletonDiscoverCard />
      </div>
    </div>
  );
}

/* -- Main component ------------------------------------------------------ */

export default function Restaurants({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading } = useItineraryScreen(id);

  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    categoryFilter, handleCategoryChange,
    cuisineSubFilter, setCuisineSubFilter,
    favorites, toggleFavorite,
    sourceItems,
    filteredItems,
    bookedCount,
    discoverCount,
    clearFilters,
  } = useRestaurantFilters();

  if (isLoading) return <RestaurantsSkeleton />;

  return (
    <div className="space-y-0">
      {/* -- View Mode Toggle ------------------------------------------- */}
      <div className="flex items-center gap-0 mb-1">
        <button
          onClick={() => setViewMode('booked')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 transition-all ${
            viewMode === 'booked'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
          style={{ fontWeight: viewMode === 'booked' ? 600 : 400 }}
        >
          <CalendarCheck size={13} />
          Booked
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              viewMode === 'booked'
                ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                : 'bg-gray-100 text-gray-400'
            }`}
            style={{ fontWeight: 600 }}
          >
            {bookedCount}
          </span>
        </button>
        <button
          onClick={() => setViewMode('discover')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 transition-all ${
            viewMode === 'discover'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
          style={{ fontWeight: viewMode === 'discover' ? 600 : 400 }}
        >
          <Compass size={13} />
          Discover
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              viewMode === 'discover'
                ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                : 'bg-gray-100 text-gray-400'
            }`}
            style={{ fontWeight: 600 }}
          >
            {discoverCount}
          </span>
        </button>
      </div>

      {/* -- Sticky Header: Categories + Search + Subcategory ----------- */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm pb-0">
        {/* Category tabs -- icon-above-label underline style */}
        <div className="flex items-end gap-0 overflow-x-auto scrollbar-hide border-b border-gray-200">
          {RESTAURANT_CATEGORIES.map((f) => {
            const count = sourceItems.filter((i) => f === 'All' || i.category === f).length;
            if (count === 0 && f !== 'All') return null;
            const isActive = categoryFilter === f;
            return (
              <button
                key={f}
                onClick={() => handleCategoryChange(f)}
                className={`group flex flex-col items-center gap-1 px-3 pb-2 pt-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="relative">{categoryIcons[f]}</span>
                <span
                  className="text-[10px]"
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {f}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 py-2.5">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-full bg-gray-100 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 cursor-pointer transition-colors"
              >
                <X size={12} className="text-gray-400" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 tabular-nums shrink-0">
            {filteredItems.length}
          </span>
        </div>

        {/* Subcategory pills */}
        {categoryFilter !== 'All' && CUISINE_SUBFILTERS[categoryFilter]?.length > 0 && (
          <div className="flex items-center gap-2 pb-2.5 overflow-x-auto scrollbar-hide">
            {CUISINE_SUBFILTERS[categoryFilter].map((sub) => {
              const isAll = sub.startsWith('All ');
              const isActive = isAll ? !cuisineSubFilter : cuisineSubFilter === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setCuisineSubFilter(isAll ? '' : sub)}
                  className={`px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer border whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* -- Masonry Grid with textured background ---------------------- */}
      <div className="relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 rounded-xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${categoryFilter}-${cuisineSubFilter}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10"
          >
            {filteredItems.length > 0 ? (
              <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 520: 2, 900: 3 }}>
                <Masonry gutter="8px">
                  {filteredItems.map((item, i) => (
                    <ItineraryPinCard
                      key={item.id}
                      item={item}
                      index={i}
                      accentColor={ACCENT}
                      isFavorited={favorites.includes(item.id)}
                      onFavorite={toggleFavorite}
                      onAddToItinerary={!item.isBooked ? (itemId) => console.log('Add:', itemId) : undefined}
                      onRemoveFromItinerary={item.isBooked ? (itemId) => console.log('Remove:', itemId) : undefined}
                    />
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            ) : (
              <div className="text-center py-12">
                <Search size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No results match your filters</p>
                <button
                  onClick={clearFilters}
                  className="text-xs mt-2 hover:underline"
                  style={{ color: ACCENT }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

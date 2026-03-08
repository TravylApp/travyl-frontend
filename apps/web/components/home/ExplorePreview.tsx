'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronLeft, ChevronRight, Heart, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useExploreRows } from '@travyl/shared';
import type { ExploreItem } from '@travyl/shared';

// ─── Fallback data when API returns empty ────────────────────
const FALLBACK_ROWS = [
  {
    title: 'Popular Destinations',
    gradient: { from: '#1e3a5f', to: '#2d5a8a' },
    isExpanded: false,
    items: [
      { id: 'fd1', name: 'Santorini, Greece', image_url: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&fit=crop' },
      { id: 'fd2', name: 'Kyoto, Japan', image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&fit=crop' },
      { id: 'fd3', name: 'Amalfi Coast, Italy', image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&fit=crop' },
      { id: 'fd4', name: 'Bali, Indonesia', image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&fit=crop' },
      { id: 'fd5', name: 'Machu Picchu, Peru', image_url: 'https://images.unsplash.com/photo-1587595431973-160d0d163abd?w=600&fit=crop' },
      { id: 'fd6', name: 'Maldives', image_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&fit=crop' },
      { id: 'fd7', name: 'Banff, Canada', image_url: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600&fit=crop' },
      { id: 'fd8', name: 'Swiss Alps', image_url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&fit=crop' },
    ],
  },
  {
    title: 'Famous Attractions',
    gradient: { from: '#162d4a', to: '#1e3a5f' },
    isExpanded: false,
    items: [
      { id: 'fa1', name: 'Eiffel Tower', image_url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=600&fit=crop' },
      { id: 'fa2', name: 'Colosseum', image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&fit=crop' },
      { id: 'fa3', name: 'Great Wall of China', image_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&fit=crop' },
      { id: 'fa4', name: 'Taj Mahal', image_url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&fit=crop' },
      { id: 'fa5', name: 'Statue of Liberty', image_url: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=600&fit=crop' },
      { id: 'fa6', name: 'Christ the Redeemer', image_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&fit=crop' },
      { id: 'fa7', name: 'Petra, Jordan', image_url: 'https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=600&fit=crop' },
      { id: 'fa8', name: 'Sydney Opera House', image_url: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=600&fit=crop' },
    ],
  },
  {
    title: 'Top Restaurants',
    gradient: { from: '#1e3a5f', to: '#3a6b9f' },
    isExpanded: false,
    items: [
      { id: 'fr1', name: 'Le Jules Verne, Paris', image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&fit=crop' },
      { id: 'fr2', name: 'Osteria Francescana', image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&fit=crop' },
      { id: 'fr3', name: 'Noma, Copenhagen', image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&fit=crop' },
      { id: 'fr4', name: 'Sukiyabashi Jiro', image_url: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&fit=crop' },
      { id: 'fr5', name: 'El Celler de Can Roca', image_url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600&fit=crop' },
      { id: 'fr6', name: 'The Fat Duck', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&fit=crop' },
    ],
  },
  {
    title: 'Hot Experiences',
    gradient: { from: '#0f2440', to: '#1e3a5f' },
    isExpanded: false,
    items: [
      { id: 'fe1', name: 'Northern Lights Tour', image_url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=600&fit=crop' },
      { id: 'fe2', name: 'Hot Air Balloon, Cappadocia', image_url: 'https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=600&fit=crop' },
      { id: 'fe3', name: 'Safari, Serengeti', image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&fit=crop' },
      { id: 'fe4', name: 'Scuba Diving, Maldives', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&fit=crop' },
      { id: 'fe5', name: 'Cherry Blossom, Tokyo', image_url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&fit=crop' },
      { id: 'fe6', name: 'Gondola Ride, Venice', image_url: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&fit=crop' },
    ],
  },
];

// ─── Section Header ──────────────────────────────────────────
function SectionHeader({
  title,
  gradient,
  isExpanded,
  onToggle,
}: {
  title: string;
  gradient: { from: string; to: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
    >
      <span className="tracking-wide">{title}</span>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChevronDown size={16} />
      </motion.div>
    </button>
  );
}

// ─── Explore Card ────────────────────────────────────────────
function ExploreCard({
  item,
  accent,
}: {
  item: ExploreItem;
  accent: string;
}) {
  const [fav, setFav] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const images = item.image_url ? [item.image_url] : [];

  return (
    <motion.div
      className="shrink-0 w-[210px] group"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
        {/* Image */}
        <div className="relative h-[160px] overflow-hidden">
          {images.length > 0 ? (
            <Image
              src={images[imgIdx]}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="210px"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <MapPin size={20} className="text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Favorite button */}
          <button
            onClick={(e) => { e.stopPropagation(); setFav(!fav); }}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all z-10 ${
              fav ? 'bg-red-500 shadow-lg' : 'bg-white/80 hover:bg-white shadow-sm'
            }`}
          >
            <Heart size={12} className={fav ? 'text-white fill-white' : 'text-gray-500'} />
          </button>

          {/* Name overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
            <h3 className="text-[13px] font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}60, transparent)` }} />
      </div>
    </motion.div>
  );
}

// ─── Scrollable Container ────────────────────────────────────
function ExploreContainer({
  items,
  accent,
}: {
  items: ExploreItem[];
  accent: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -440 : 440;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative group/scroll">
      {/* Left arrow */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors backdrop-blur-sm"
          >
            <ChevronLeft size={16} className="text-gray-700" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right arrow */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors backdrop-blur-sm"
          >
            <ChevronRight size={16} className="text-gray-700" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <ExploreCard key={item.id} item={item} accent={accent} />
        ))}
      </div>
    </div>
  );
}

// ─── Explore Section (header + container) ────────────────────
function ExploreSection({
  title,
  gradient,
  isExpanded,
  onToggle,
  items,
}: {
  title: string;
  gradient: { from: string; to: string };
  isExpanded: boolean;
  onToggle: () => void;
  items: ExploreItem[];
}) {
  return (
    <div className="space-y-2">
      <SectionHeader
        title={title}
        gradient={gradient}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2">
              <ExploreContainer items={items} accent={gradient.from} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function ExplorePreview() {
  const { rows: apiRows, toggleRow, collapseAll, expandAll, allExpanded, isLoading } = useExploreRows();

  // Use API rows if available, otherwise use fallback
  const hasApiData = apiRows.length > 0;

  // Local expand state for fallback rows
  const [fallbackExpanded, setFallbackExpanded] = useState<Record<number, boolean>>({});
  const fallbackToggle = useCallback((i: number) => {
    setFallbackExpanded((prev) => ({ ...prev, [i]: !(prev[i] ?? false) }));
  }, []);
  const fallbackExpandAll = useCallback(() => {
    setFallbackExpanded(Object.fromEntries(FALLBACK_ROWS.map((_, i) => [i, true])));
  }, []);
  const fallbackCollapseAll = useCallback(() => {
    setFallbackExpanded(Object.fromEntries(FALLBACK_ROWS.map((_, i) => [i, false])));
  }, []);

  const rows = hasApiData
    ? apiRows
    : FALLBACK_ROWS.map((r, i) => ({ ...r, isExpanded: fallbackExpanded[i] ?? false }));

  const handleToggle = hasApiData ? toggleRow : fallbackToggle;
  const handleExpandAll = hasApiData ? expandAll : fallbackExpandAll;
  const handleCollapseAll = hasApiData ? collapseAll : fallbackCollapseAll;
  const isAllExpanded = hasApiData
    ? allExpanded
    : rows.length > 0 && rows.every((r) => r.isExpanded);

  if (isLoading) {
    return (
      <section className="py-4 px-2">
        <div className="max-w-6xl mx-auto space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 rounded-xl bg-[#1e3a5f]/15 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 px-2">
      <div className="max-w-6xl mx-auto">
        {/* Collapse/Expand All toggle */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#1e3a5f]">Explore</h2>
          <button
            onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
            className="text-xs font-medium text-[#1e3a5f] hover:text-[#2d4a6f] transition-colors px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-2.5">
          {rows.map((row, i) => (
            <ExploreSection
              key={row.title}
              title={row.title}
              gradient={row.gradient}
              isExpanded={row.isExpanded}
              onToggle={() => handleToggle(i)}
              items={row.items}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

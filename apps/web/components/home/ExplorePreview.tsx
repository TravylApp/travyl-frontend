'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useExploreRows } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { PlaceCard } from '@/components/PlaceCard';

// ─── Section Header ──────────────────────────────────────────
function SectionHeader({
  title,
  isExpanded,
  onToggle,
}: {
  title: string;
  gradient?: { from: string; to: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border bg-white dark:bg-[var(--muted)] border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.08] shadow-sm"
      style={{ color: 'var(--magazine-heading, var(--foreground))' }}
    >
      <span className="tracking-wide">{title}</span>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ color: 'var(--magazine-text, var(--muted-foreground))' }}
      >
        <ChevronDown size={16} />
      </motion.div>
    </button>
  );
}

// ─── Scrollable Container ────────────────────────────────────
function ExploreContainer({
  items,
  onItemClick,
}: {
  items: PlaceItem[];
  onItemClick?: (item: PlaceItem) => void;
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
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                id: item.id,
                name: item.name,
                title: item.name,
                category: item.type,
                location: item.tagline || '',
                image: item.images?.[0] || item.image || '',
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <PlaceCard
              place={item}
              size="compact"
              isFav={false}
              onToggleFav={() => {}}
              onClick={() => onItemClick?.(item)}
            />
          </div>
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
  onItemClick,
}: {
  title: string;
  gradient: { from: string; to: string };
  isExpanded: boolean;
  onToggle: () => void;
  items: PlaceItem[];
  onItemClick?: (item: PlaceItem) => void;
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2">
              <ExploreContainer items={items} onItemClick={onItemClick} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function ExplorePreview({ onItemClick }: { onItemClick?: (item: PlaceItem) => void } = {}) {
  const { rows, toggleRow, collapseAll, expandAll, allExpanded, isLoading } = useExploreRows();

  if (isLoading) {
    return (
      <section className="py-6 px-6">
        <div className="max-w-6xl mx-auto space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 rounded-xl bg-gray-300 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 px-6">
      <div className="max-w-6xl mx-auto bg-white dark:bg-[var(--background)] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
        {/* Collapse/Expand All toggle */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--magazine-heading, var(--foreground))' }}>Explore</h2>
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-xs font-medium transition-colors px-3 py-1 rounded-lg border border-gray-200 dark:border-white/[0.1] hover:bg-gray-50 dark:hover:bg-white/[0.06]"
            style={{ color: 'var(--magazine-text, var(--muted-foreground))' }}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-2.5 px-4 pb-4">
          {rows.map((row, i) => (
            <ExploreSection
              key={row.title}
              title={row.title}
              gradient={row.gradient}
              isExpanded={row.isExpanded}
              onToggle={() => toggleRow(i)}
              items={row.items}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

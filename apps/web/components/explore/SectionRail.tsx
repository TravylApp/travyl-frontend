'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SectionRailProps {
  title: string;
  eyebrow?: string;
  seeAllHref?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export function SectionRail({
  title, eyebrow, seeAllHref, isLoading, isEmpty, emptyText, children,
}: SectionRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [children]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  // Hide section entirely only when empty AND no empty-state copy provided.
  if (isEmpty && !isLoading && !emptyText) {
    return null;
  }

  return (
    <section className="mb-10 sm:mb-14">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-1">{eyebrow}</p>
          )}
          <h2 className="font-serif text-[22px] sm:text-[26px] font-normal text-gray-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 dark:border-white/[0.08] items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 dark:border-white/[0.08] items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            <ChevronRight size={16} />
          </button>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-[12px] font-semibold text-[#1e3a5f] dark:text-white hover:underline ml-1"
            >
              See all →
            </Link>
          )}
        </div>
      </div>

      {isEmpty && !isLoading && emptyText ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.015] py-10 px-6 text-center">
          <p className="text-sm text-gray-500 dark:text-white/50">{emptyText}</p>
        </div>
      ) : (
        <div
          ref={trackRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 snap-start w-[260px] sm:w-[280px] h-[300px] rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse"
              />
            ))
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}

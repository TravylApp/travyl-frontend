'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  X, ChevronLeft, ChevronRight, Search, SlidersHorizontal,
  Heart, Share2, Star, MapPin, Clock, Check, XCircle,
  Users, Globe, AlertTriangle, Accessibility, Phone,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import type { DiscoverItem } from '@travyl/shared';

// ─── Types ─────────────────────────────────────────────────────

type ModalTab = 'overview' | 'highlights' | 'instructions' | 'details' | 'explore';

interface FilterState {
  category: string;
  maxPrice: string;
  maxDuration: string;
  minRating: number;
}

interface SplitScreenModalProps {
  items: DiscoverItem[];
  initialIndex: number;
  accentColor: string;
  favorites: string[];
  onClose: () => void;
  onFavorite: (id: string) => void;
  onNavigate?: (index: number) => void;
}

// ─── Filter Section ─────────────────────────────────────────────

function FilterBar({
  items,
  filters,
  setFilters,
  filteredCount,
  totalCount,
  accentColor,
}: {
  items: DiscoverItem[];
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  filteredCount: number;
  totalCount: number;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [items]);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={12} />
          <span>{filteredCount} of {totalCount} results</span>
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 rounded-b-xl" style={{ backgroundColor: '#1e293b' }}>
          {/* Category */}
          <div>
            <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters({ ...filters, category: cat === 'All' ? '' : cat! })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                    (cat === 'All' && !filters.category) || filters.category === cat
                      ? 'text-white shadow-sm'
                      : 'text-white/70 bg-white/10 hover:bg-white/15'
                  }`}
                  style={
                    (cat === 'All' && !filters.category) || filters.category === cat
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1.5">Min Rating</p>
            <div className="flex gap-1.5">
              {[0, 3.5, 4.0, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilters({ ...filters, minRating: r })}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all ${
                    filters.minRating === r ? 'text-white' : 'text-white/70 bg-white/10'
                  }`}
                  style={filters.minRating === r ? { backgroundColor: accentColor } : undefined}
                >
                  {r === 0 ? 'Any' : <><Star size={9} fill="#fff" className="text-white" />{r}+</>}
                </button>
              ))}
            </div>
          </div>

          {filters.category || filters.minRating > 0 ? (
            <button
              onClick={() => setFilters({ category: '', maxPrice: '', maxDuration: '', minRating: 0 })}
              className="text-[11px] text-white/60 hover:text-white/80 flex items-center gap-1"
            >
              <X size={10} /> Clear filters
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Image Carousel ─────────────────────────────────────────────

function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [imgError, setImgError] = useState(false);

  if (!images.length || imgError) {
    return (
      <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-xl">
        <MapPin size={32} className="text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden group">
      <img
        src={images[current]}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((i) => (i === 0 ? images.length - 1 : i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent((i) => (i === images.length - 1 ? 0 : i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab Content ────────────────────────────────────────────────

function OverviewTab({ item, accentColor }: { item: DiscoverItem; accentColor: string }) {
  return (
    <div className="space-y-4">
      <ImageCarousel images={item.images} name={item.name} />

      <div>
        <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
          <MapPin size={13} className="text-gray-400" />
          <span>{item.location}</span>
        </div>
      </div>

      {/* Rating + Info row */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-400" fill="#fbbf24" />
          <span className="font-semibold text-gray-900">{item.rating.toFixed(1)}</span>
          {(item.reviewCount || item.reviews) && (
            <span className="text-gray-500">({(item.reviewCount || item.reviews)!.toLocaleString()} reviews)</span>
          )}
        </div>
        {item.duration && (
          <div className="flex items-center gap-1 text-gray-500">
            <Clock size={13} />
            <span>{item.duration}</span>
          </div>
        )}
        {item.price && (
          <span className="font-semibold" style={{ color: accentColor }}>
            {item.dealPrice ? (
              <><span className="line-through text-gray-400 font-normal mr-1">{item.originalPrice}</span>{item.dealPrice}</>
            ) : item.price}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>

      {/* Highlights chips */}
      {item.highlights && item.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.highlights.map((h, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs border"
              style={{ backgroundColor: accentColor + '08', borderColor: accentColor + '20', color: accentColor }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {item.tags.map((tag, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function HighlightsTab({ item, accentColor }: { item: DiscoverItem; accentColor: string }) {
  const highlights = item.highlights || [];
  if (!highlights.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No highlights available</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-gray-900">Highlights</h3>
      <ul className="space-y-2.5">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: accentColor + '15' }}
            >
              <Check size={12} style={{ color: accentColor }} />
            </div>
            <span className="text-sm text-gray-700">{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstructionsTab({ item, accentColor }: { item: DiscoverItem; accentColor: string }) {
  const steps = item.phoneSteps || [];
  if (!steps.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No step-by-step instructions available</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">How It Works</h3>
      <p className="text-sm text-gray-500">Follow these steps on your phone at the venue</p>
      <div className="space-y-5">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            {/* Step number + connecting line */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: accentColor + '30' }} />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h4>
              <p className="text-xs text-gray-600 mb-3">{step.description}</p>

              {/* Phone mockup frame */}
              {step.screenshot && (
                <div className="flex justify-center">
                  <div className="relative w-[180px]">
                    {/* Phone frame */}
                    <div className="rounded-[24px] border-[3px] border-gray-800 bg-gray-800 overflow-hidden shadow-xl">
                      {/* Notch */}
                      <div className="h-5 bg-gray-800 flex items-center justify-center">
                        <div className="w-16 h-2.5 bg-gray-900 rounded-full" />
                      </div>
                      {/* Screen */}
                      <div className="bg-white">
                        <img
                          src={step.screenshot}
                          alt={step.title}
                          className="w-full h-[280px] object-cover"
                        />
                      </div>
                      {/* Home bar */}
                      <div className="h-4 bg-gray-800 flex items-center justify-center">
                        <div className="w-12 h-1 bg-gray-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsTab({ item, accentColor }: { item: DiscoverItem; accentColor: string }) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900">Details</h3>

      {/* Included */}
      {item.included && item.included.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Check size={14} className="text-emerald-500" /> What&apos;s Included
          </h4>
          <ul className="space-y-1.5">
            {item.included.map((inc, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={11} className="text-emerald-500 shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Not Included */}
      {item.notIncluded && item.notIncluded.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <XCircle size={14} className="text-red-400" /> Not Included
          </h4>
          <ul className="space-y-1.5">
            {item.notIncluded.map((exc, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <X size={11} className="text-red-400 shrink-0" />
                {exc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {item.meetingPoint && (
          <InfoItem icon={<MapPin size={13} />} label="Meeting Point" value={item.meetingPoint} />
        )}
        {item.cancellationPolicy && (
          <InfoItem icon={<AlertTriangle size={13} />} label="Cancellation" value={item.cancellationPolicy} />
        )}
        {item.languages && item.languages.length > 0 && (
          <InfoItem icon={<Globe size={13} />} label="Languages" value={item.languages.join(', ')} />
        )}
        {item.difficulty && (
          <InfoItem icon={<Phone size={13} />} label="Difficulty" value={item.difficulty} />
        )}
        {(item.minParticipants || item.maxParticipants) && (
          <InfoItem icon={<Users size={13} />} label="Group Size" value={`${item.minParticipants || 1}–${item.maxParticipants || '∞'} people`} />
        )}
        {item.accessibility && (
          <InfoItem icon={<Accessibility size={13} />} label="Accessibility" value={item.accessibility} />
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xs text-gray-700">{value}</p>
    </div>
  );
}

function ExploreTab({ items, currentId, accentColor, onSelect }: { items: DiscoverItem[]; currentId: string; accentColor: string; onSelect: (item: DiscoverItem) => void }) {
  const currentItem = items.find((i) => i.id === currentId);
  const sameCategory = items.filter((i) => i.id !== currentId && i.category === currentItem?.category).slice(0, 4);
  const popular = items
    .filter((i) => i.id !== currentId && !sameCategory.some((s) => s.id === i.id))
    .sort((a, b) => (b.popularityScore ?? b.rating * 1000) - (a.popularityScore ?? a.rating * 1000))
    .slice(0, 4);

  // Trending = high reviews + deal available
  const trending = items
    .filter((i) => i.id !== currentId && i.dealPrice && (i.reviewCount || i.reviews || 0) > 2000)
    .slice(0, 3);

  if (!sameCategory.length && !popular.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No similar items to explore</p>;
  }

  return (
    <div className="space-y-6">
      {sameCategory.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Similar Activities</h3>
          <div className="grid grid-cols-2 gap-3">
            {sameCategory.map((item) => (
              <ExploreCard key={item.id} item={item} accentColor={accentColor} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {trending.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Trending Now
            <span className="ml-2 text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Hot</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {trending.map((item) => (
              <div key={item.id} className="w-[180px] shrink-0">
                <ExploreCard item={item} accentColor={accentColor} onSelect={onSelect} showTrending />
              </div>
            ))}
          </div>
        </div>
      )}

      {popular.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Popular Nearby</h3>
          <div className="grid grid-cols-2 gap-3">
            {popular.map((item) => (
              <ExploreCard key={item.id} item={item} accentColor={accentColor} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExploreCard({ item, accentColor, onSelect, showTrending }: { item: DiscoverItem; accentColor: string; onSelect: (item: DiscoverItem) => void; showTrending?: boolean }) {
  return (
    <button
      onClick={() => onSelect(item)}
      className="text-left rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all bg-white"
    >
      <div className="h-28 bg-gray-100 overflow-hidden relative">
        {item.images[0] ? (
          <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin size={16} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {item.category && (
          <span className="absolute top-2 left-2 text-[9px] bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-gray-700 font-medium">
            {item.category}
          </span>
        )}
        {showTrending && (
          <span className="absolute top-2 right-2 text-[9px] bg-gradient-to-r from-red-500 to-orange-500 px-1.5 py-0.5 rounded text-white font-medium animate-pulse">
            Trending
          </span>
        )}
        {!showTrending && item.dealPrice && (
          <span className="absolute top-2 right-2 text-[9px] bg-red-500 px-1.5 py-0.5 rounded text-white font-medium">
            Deal
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
        <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{item.location}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Star size={9} className="text-amber-400" fill="#fbbf24" />
          <span className="text-[10px] text-gray-600">{item.rating.toFixed(1)}</span>
          {(item.reviewCount || item.reviews) && (
            <span className="text-[9px] text-gray-400">({((item.reviewCount || item.reviews)! / 1000).toFixed(1)}k)</span>
          )}
          {item.price && (
            <span className="text-[10px] font-medium ml-auto" style={{ color: accentColor }}>
              {item.dealPrice || item.price}
            </span>
          )}
        </div>
        {item.popularityScore && (
          <div className="flex items-center gap-1 mt-1">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(item.popularityScore, 100)}%`, backgroundColor: accentColor }} />
            </div>
            <span className="text-[9px] text-gray-400">{item.popularityScore}%</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Map Panel ──────────────────────────────────────────────────

function MapPanel({ item }: { item: DiscoverItem }) {
  const mapQuery = item.lat && item.lng
    ? `${item.lat},${item.lng}`
    : encodeURIComponent(item.location);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-100">
      <iframe
        title="Map"
        className="w-full h-full border-0"
        src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
        allowFullScreen
        loading="lazy"
      />
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md max-w-[200px]">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-gray-500 shrink-0" />
          <span className="text-xs text-gray-700 line-clamp-2">{item.location}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function SplitScreenModal({
  items,
  initialIndex,
  accentColor,
  favorites,
  onClose,
  onFavorite,
}: SplitScreenModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    maxPrice: '',
    maxDuration: '',
    minRating: 0,
  });

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (filters.category) {
      result = result.filter((i) => i.category === filters.category);
    }
    if (filters.minRating > 0) {
      result = result.filter((i) => i.rating >= filters.minRating);
    }
    return result;
  }, [items, searchQuery, filters]);

  const currentItem = filteredItems[currentIndex] || filteredItems[0] || items[0];

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % filteredItems.length);
    setActiveTab('overview');
  }, [filteredItems.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i === 0 ? filteredItems.length - 1 : i - 1));
    setActiveTab('overview');
  }, [filteredItems.length]);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!currentItem) return null;

  const isFavorited = favorites.includes(currentItem.id);
  const hasPhoneSteps = (currentItem.phoneSteps?.length ?? 0) > 0;
  const hasHighlights = (currentItem.highlights?.length ?? 0) > 0;
  const hasDetails = !!(currentItem.included?.length || currentItem.notIncluded?.length || currentItem.meetingPoint || currentItem.cancellationPolicy);

  const tabs: { key: ModalTab; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'highlights', label: 'Highlights', show: hasHighlights },
    { key: 'instructions', label: 'Instructions', show: hasPhoneSteps },
    { key: 'details', label: 'Details', show: hasDetails },
    { key: 'explore', label: 'Explore', show: filteredItems.length > 1 },
  ];

  const handleExploreSelect = (item: DiscoverItem) => {
    const idx = filteredItems.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setActiveTab('overview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full md:w-[90vw] md:max-w-7xl md:h-[90vh] md:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* ── Left Panel: Content ── */}
        <motion.div
          initial={{ opacity: 0, x: -120, rotate: -2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
        >

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0">
            {/* Prev / Next */}
            {filteredItems.length > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button onClick={goPrev} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <span className="text-xs text-gray-500 tabular-nums min-w-[40px] text-center">
                  {currentIndex + 1} / {filteredItems.length}
                </span>
                <button onClick={goNext} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            )}

            {/* Search */}
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:bg-white border border-transparent focus:border-gray-200"
                style={{ '--tw-ring-color': accentColor + '40' } as React.CSSProperties}
              />
            </div>

            {/* Close */}
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors ml-2">
              <X size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Filter bar */}
          <FilterBar
            items={items}
            filters={filters}
            setFilters={(f) => { setFilters(f); setCurrentIndex(0); }}
            filteredCount={filteredItems.length}
            totalCount={items.length}
            accentColor={accentColor}
          />

          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-gray-200 shrink-0 overflow-x-auto scrollbar-hide">
            {tabs
              .filter((t) => t.show)
              .map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-current'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === tab.key ? { color: accentColor } : undefined}
                >
                  {tab.label}
                </button>
              ))}
          </div>

          {/* Tab Content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'overview' && <OverviewTab item={currentItem} accentColor={accentColor} />}
            {activeTab === 'highlights' && <HighlightsTab item={currentItem} accentColor={accentColor} />}
            {activeTab === 'instructions' && <InstructionsTab item={currentItem} accentColor={accentColor} />}
            {activeTab === 'details' && <DetailsTab item={currentItem} accentColor={accentColor} />}
            {activeTab === 'explore' && (
              <ExploreTab
                items={filteredItems}
                currentId={currentItem.id}
                accentColor={accentColor}
                onSelect={handleExploreSelect}
              />
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 bg-white shrink-0">
            <button
              onClick={() => onFavorite(currentItem.id)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Heart
                size={16}
                className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-500'}
              />
            </button>
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Share2 size={16} className="text-gray-500" />
            </button>
            <div className="flex-1" />
            <button
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              {currentItem.isBooked ? 'View Booking' : 'Book Now'}
            </button>
          </div>
        </motion.div>

        {/* ── Right Panel: Map (desktop only) ── */}
        <motion.div
          initial={{ opacity: 0, x: 120, rotate: 2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:block w-[380px] shrink-0 border-l border-gray-200 p-3"
        >
          <MapPanel item={currentItem} />
        </motion.div>
      </div>
    </div>
  );
}

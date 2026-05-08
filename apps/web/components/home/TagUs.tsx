"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { CATEGORY_GRADIENT_CYCLE, usePlaceImages } from "@travyl/shared";

const FALLBACK_DESTINATIONS = [
  "Santorini", "Bali", "Tokyo", "Barcelona",
  "Amalfi Coast", "Paris", "Dubai", "Maldives",
  "New York", "Kyoto", "Lisbon", "Reykjavik",
];

const MOCK_POSTERS = [
  { handle: "@jessexplores", avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@marcoromano", avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@sophieinparis", avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@nomad.nick", avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@lena.travels", avatar: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@theadventuresofkai", avatar: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@_oliviaexplores", avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
  { handle: "@dani.vagabond", avatar: "https://images.pexels.com/photos/428364/pexels-photo-428364.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop" },
];

const MOCK_CAPTIONS = [
  "Paradise found. Can't believe this is real!",
  "Take me back already. Best trip ever.",
  "Every corner here feels like a postcard.",
  "When the view is this good, no filter needed.",
  "Chasing sunsets and memories with the best crew.",
  "This place has my whole heart.",
  "Day 3 and I never want to leave.",
  "Bucket-list moment checked off the list.",
];

type CardData = {
  dest: string;
  imgUrl: string | undefined;
  grad: { from: string; to: string };
  poster: { handle: string; avatar: string };
  caption: string;
  likes: number;
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function TagUs() {
  // Live trending destinations, fall back to curated list
  const { data: trendingNames } = useQuery({
    queryKey: ['tag-us-destinations'],
    queryFn: async () => {
      const res = await fetch('/api/trending-destinations');
      if (!res.ok) return FALLBACK_DESTINATIONS;
      const data = await res.json() as { name: string }[];
      const names = data.map((d) => d.name);
      return names.length >= 8 ? names : FALLBACK_DESTINATIONS;
    },
    staleTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: 2000,
  });

  const TAG_US_DESTINATIONS = trendingNames ?? FALLBACK_DESTINATIONS;

  const imageQueries = usePlaceImages(TAG_US_DESTINATIONS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cards: CardData[] = useMemo(() => {
    return TAG_US_DESTINATIONS.map((dest, idx) => ({
      dest,
      imgUrl: imageQueries[idx]?.data?.url,
      grad: CATEGORY_GRADIENT_CYCLE[idx % CATEGORY_GRADIENT_CYCLE.length],
      poster: MOCK_POSTERS[idx % MOCK_POSTERS.length],
      caption: MOCK_CAPTIONS[idx % MOCK_CAPTIONS.length],
      likes: Math.floor(seededRandom(idx * 137 + 42) * 800) + 50,
    }));
  }, [imageQueries]);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 300;
    const gap = 16;
    el.scrollBy({ left: dir === "left" ? -(cardWidth + gap) : cardWidth + gap, behavior: "smooth" });
  };

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-foreground text-center mb-8 tracking-wide">
          Tag us <span className="italic">on your Next Trip</span>
        </h2>

        {/* Horizontally scrollable feed with overlaid arrow buttons */}
        <div className="relative group/row">
          {/* Left arrow — overlaid, flashes on hover */}
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className={`absolute lg:-left-5 left-1 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-white/[0.08] flex items-center justify-center transition-all duration-200 ${
              canScrollLeft
                ? "opacity-0 group-hover/row:opacity-100 hover:bg-gray-50 dark:hover:bg-white/10"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-magazine-text" />
          </button>

          {/* Scroll track */}
          <div
            ref={scrollRef}
            onScroll={() => requestAnimationFrame(updateArrows)}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {cards.map((card, i) => (
              <div
                key={`${card.dest}-${i}`}
                className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start"
              >
                {/* Pure square — image with everything overlaid */}
                <div className="aspect-square rounded-3xl relative group overflow-hidden">
                  {/* Image layer — handles clipping + rounded corners */}
                  <div
                    className="absolute inset-0 rounded-3xl overflow-hidden"
                    style={{
                      background: card.imgUrl
                        ? undefined
                        : `linear-gradient(135deg, ${card.grad.from}, ${card.grad.to})`,
                    }}
                  >
                    {card.imgUrl && (
                      <img
                        src={card.imgUrl}
                        alt={card.dest}
                        loading="lazy"
                        decoding="async"
                        width={640}
                        height={640}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>

                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

                  {/* Top bar: profile photo + handle */}
                  <div className="absolute top-0 left-0 right-0 p-3 flex items-center gap-2.5 z-10">
                    <img
                      src={card.poster.avatar}
                      alt={card.poster.handle}
                      width={32}
                      height={32}
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%231e3a5f"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="14">?</text></svg>'; }}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/30 shrink-0"
                    />
                    <span className="text-white text-xs font-semibold drop-shadow-md">
                      {card.poster.handle}
                    </span>
                  </div>

                  {/* Bottom: location + caption + likes */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <p className="text-white text-lg font-serif font-normal tracking-wide drop-shadow-md mb-1">
                      {card.dest}
                    </p>
                    <p className="text-white/80 text-xs leading-snug drop-shadow-md mb-1.5 line-clamp-2">
                      <span className="font-semibold mr-1">{card.poster.handle}</span>
                      {card.caption}
                    </p>
                    <p className="text-white/60 text-[11px] font-medium drop-shadow-md">
                      {card.likes.toLocaleString()} likes
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right arrow — overlaid, flashes on hover */}
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className={`absolute lg:-right-5 right-1 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-white/[0.08] flex items-center justify-center transition-all duration-200 ${
              canScrollRight
                ? "opacity-0 group-hover/row:opacity-100 hover:bg-gray-50 dark:hover:bg-white/10"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-magazine-text" />
          </button>
        </div>

      </div>
    </section>
  );
}

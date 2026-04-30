"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import { motion } from "motion/react";
import {
  TILE_CATEGORY_GRADIENTS,
  EASE_OUT_EXPO,
} from "@travyl/shared";
import type { TileCategory, MosaicTile } from "@travyl/shared";
import { useQuery } from "@tanstack/react-query";

const ALL_MOSAIC_CITIES = [
  { lat: '48.8566', lng: '2.3522' },   // Paris
  { lat: '35.6762', lng: '139.6503' }, // Tokyo
  { lat: '41.9028', lng: '12.4964' },  // Rome
  { lat: '-8.4095', lng: '115.1889' }, // Bali
  { lat: '40.7128', lng: '-74.0060' }, // New York
  { lat: '41.3874', lng: '2.1686' },   // Barcelona
  { lat: '51.5074', lng: '-0.1278' },  // London
  { lat: '25.2048', lng: '55.2708' },  // Dubai
  { lat: '-33.8688', lng: '151.2093' }, // Sydney
  { lat: '37.9838', lng: '23.7275' },  // Athens
  { lat: '13.7563', lng: '100.5018' }, // Bangkok
  { lat: '38.7223', lng: '-9.1393' },  // Lisbon
  { lat: '-22.9068', lng: '-43.1729' }, // Rio
  { lat: '52.3676', lng: '4.9041' },   // Amsterdam
  { lat: '37.7749', lng: '-122.4194' }, // San Francisco
  { lat: '31.6295', lng: '-7.9811' },  // Marrakech
  { lat: '19.4326', lng: '-99.1332' }, // Mexico City
  { lat: '1.3521', lng: '103.8198' },  // Singapore
];

const MOSAIC_CATEGORIES = ['sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'landmark', 'shopping'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchMosaicTiles(): Promise<MosaicTile[]> {
  // Pick 6 random cities × random categories
  const cities = shuffle(ALL_MOSAIC_CITIES).slice(0, 6);
  const cats = shuffle(MOSAIC_CATEGORIES);

  const results = await Promise.all(
    cities.map(async (city, i) => {
      const cat = cats[i % cats.length];
      const res = await fetch(`/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=3`);
      if (!res.ok) return [];
      return res.json();
    })
  );

  const typeMap: Record<string, TileCategory> = {
    destination: 'destination', attraction: 'attraction',
    restaurant: 'dining', experience: 'experience',
  };

  // Flatten, deduplicate, filter for images
  const seen = new Set<string>();
  const tiles = results.flat()
    .filter((p: any) => {
      if (!p.name || !p.image || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .map((p: any, i: number) => ({
      id: p.id,
      name: p.name,
      category: typeMap[p.type] ?? 'destination',
      tagline: p.tagline ?? '',
      image_url: p.image,
      gridSpan: [i < 2 ? 3 : 2, i < 2 ? 2 : 1] as [number, number],
      placeData: p, // keep full PlaceItem for detail overlay
    }));

  return shuffle(tiles).slice(0, 12);
}

function useInView(rootMargin = "200px"): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, inView];
}

// Mobile: 7 tiles, hero + pairs
const MOBILE_SPANS =   [12, 7, 5, 5, 7, 6, 6];
const MOBILE_HEIGHTS = [240, 200, 200, 200, 200, 200, 200];

// Desktop: 10 tiles, hero + varied rows including a 3-col row
const DESKTOP_SPANS =   [12, 7, 5, 4, 4, 4, 5, 7, 6, 6];
const DESKTOP_HEIGHTS = [320, 260, 260, 200, 200, 200, 260, 260, 220, 220];

export function TravelMosaic({ onTileClick }: { onTileClick?: (place: any) => void }) {
  const [sectionRef, inView] = useInView();
  const { data: fetchedTiles = [] } = useQuery({
    queryKey: ['mosaic-tiles'],
    queryFn: fetchMosaicTiles,
    staleTime: 10 * 60 * 1000,
    enabled: inView,
  });
  const tiles = fetchedTiles;
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (tiles.length === 0) return null;

  const spanMap = isDesktop ? DESKTOP_SPANS : MOBILE_SPANS;
  const heightMap = isDesktop ? DESKTOP_HEIGHTS : MOBILE_HEIGHTS;
  const tileCount = isDesktop ? 10 : 7;

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-foreground text-center mb-10 tracking-wide">
          Moments That <span className="italic">Move You</span>
        </h2>

        <div className="grid grid-cols-12 gap-2.5">
          {tiles.slice(0, tileCount).map((tile, i) => {
            const grad = TILE_CATEGORY_GRADIENTS[tile.category as TileCategory];
            const colSpan = spanMap[i] ?? 6;
            const height = heightMap[i] ?? 200;
            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: EASE_OUT_EXPO }}
                whileHover={{ scale: 1.02 }}
                onClick={() => onTileClick?.((tile as any).placeData)}
                className="rounded-2xl overflow-hidden relative cursor-pointer group"
                style={{
                  gridColumn: `span ${colSpan}`,
                  height,
                  background: tile.image_url
                    ? undefined
                    : `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                }}
              >
                {tile.image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={tile.image_url}
                    alt={tile.name}
                    loading="lazy"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="relative h-full flex flex-col justify-end p-3 sm:p-4">
                  <h3 className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow-md">{tile.name}</h3>
                  {tile.tagline && (
                    <p className="text-white/60 text-xs mt-0.5 truncate">{tile.tagline}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

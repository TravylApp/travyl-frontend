"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useMosaicTiles,
  usePlaceImages,
  TILE_CATEGORY_GRADIENTS,
} from "@travyl/shared";
import type { TileCategory, MosaicTile } from "@travyl/shared";

const PLACEHOLDER_TILES: MosaicTile[] = [
  { id: 'p-1', name: 'Santorini', category: 'destination', tagline: '', image_url: null, gridSpan: [3, 2] },
  { id: 'p-2', name: 'Kyoto', category: 'destination', tagline: '', image_url: null, gridSpan: [3, 2] },
  { id: 'p-3', name: 'Machu Picchu', category: 'attraction', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-4', name: 'Northern Lights', category: 'experience', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-5', name: 'Marrakech Food Tour', category: 'dining', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-6', name: 'Amalfi Coast', category: 'destination', tagline: '', image_url: null, gridSpan: [2, 2] },
  { id: 'p-7', name: 'Angkor Wat', category: 'attraction', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-8', name: 'Safari Kenya', category: 'experience', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-9', name: 'Bangkok Street Food', category: 'dining', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-10', name: 'Patagonia', category: 'destination', tagline: '', image_url: null, gridSpan: [2, 1] },
];

const MOBILE_SPANS =   [12, 7, 5, 5, 7, 6, 6];
const MOBILE_HEIGHTS = [240, 200, 200, 200, 200, 200, 200];
const DESKTOP_SPANS =   [12, 7, 5, 4, 4, 4, 5, 7, 6, 6];
const DESKTOP_HEIGHTS = [320, 260, 260, 200, 200, 200, 260, 260, 220, 220];

// Daily seed — same shuffle for all users for the day, changes at midnight
function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(((seed * 2654435761 + i * 1597334677) >>> 0) / 4294967296 * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function TravelMosaic() {
  const { data: dbTiles } = useMosaicTiles();
  const tiles = dbTiles?.length ? dbTiles : PLACEHOLDER_TILES;
  const [isDesktop, setIsDesktop] = useState(false);

  const tileNames = useMemo(() => tiles.map((t) => t.name).filter(Boolean), [tiles]);
  const imageQueries = usePlaceImages(tileNames);

  const imageMap = useMemo(() => {
    const map = new Map<string, string>();
    tileNames.forEach((name, i) => {
      const url = imageQueries[i]?.data?.url;
      if (url) map.set(name, url);
    });
    return map;
  }, [tileNames, imageQueries]);

  const shuffled = useMemo(() => seededShuffle(tiles, dailySeed()), [tiles]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const spanMap = isDesktop ? DESKTOP_SPANS : MOBILE_SPANS;
  const heightMap = isDesktop ? DESKTOP_HEIGHTS : MOBILE_HEIGHTS;
  const tileCount = isDesktop ? 10 : 7;

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-foreground text-center mb-10 tracking-wide">
          Moments That <span className="italic">Move You</span>
        </h2>

        <div className="grid grid-cols-12 gap-2.5">
          {shuffled.slice(0, tileCount).map((tile, i) => {
            const grad = TILE_CATEGORY_GRADIENTS[tile.category as TileCategory];
            const colSpan = spanMap[i] ?? 6;
            const height = heightMap[i] ?? 200;
            const imgUrl = tile.image_url || imageMap.get(tile.name);
            return (
              <div
                key={tile.id}
                className="rounded-2xl overflow-hidden relative cursor-pointer group"
                style={{
                  gridColumn: `span ${colSpan}`,
                  height,
                  background: imgUrl
                    ? undefined
                    : `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                }}
              >
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={tile.name}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                    className="absolute inset-0 w-full h-full object-cover will-change-transform group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />
                <div className="absolute inset-0 group-hover:bg-black/10 transition-colors duration-300" />
                <div className="relative h-full flex flex-col justify-end p-3 sm:p-4">
                  <h3 className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow-md">{tile.name}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

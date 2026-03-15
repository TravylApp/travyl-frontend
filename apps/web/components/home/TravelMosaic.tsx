"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  useMosaicTiles,
  TILE_CATEGORY_GRADIENTS,
  EASE_OUT_EXPO,
} from "@travyl/shared";
import type { TileCategory, MosaicTile } from "@travyl/shared";

const PLACEHOLDER_TILES: MosaicTile[] = [
  { id: 'p-1', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [3, 2] },
  { id: 'p-2', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [3, 2] },
  { id: 'p-3', name: '', category: 'attraction', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-4', name: '', category: 'experience', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-5', name: '', category: 'dining', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-6', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [2, 2] },
  { id: 'p-7', name: '', category: 'attraction', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-8', name: '', category: 'experience', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-9', name: '', category: 'dining', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-10', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [2, 1] },
];

// Mobile: 7 tiles, hero + pairs
const MOBILE_SPANS =   [12, 7, 5, 5, 7, 6, 6];
const MOBILE_HEIGHTS = [240, 200, 200, 200, 200, 200, 200];

// Desktop: 10 tiles, hero + varied rows including a 3-col row
const DESKTOP_SPANS =   [12, 7, 5, 4, 4, 4, 5, 7, 6, 6];
const DESKTOP_HEIGHTS = [320, 260, 260, 200, 200, 200, 260, 260, 220, 220];

export function TravelMosaic() {
  const { data: dbTiles } = useMosaicTiles();
  const tiles = dbTiles?.length ? dbTiles : PLACEHOLDER_TILES;
  const [isDesktop, setIsDesktop] = useState(false);

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
        <h2 className="text-2xl md:text-3xl text-foreground text-center mb-10">
          <span className="font-extrabold">Moments That</span>{" "}
          <span className="font-normal italic">Move You</span>
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
                  <img
                    src={tile.image_url}
                    alt={tile.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="relative h-full flex flex-col justify-end p-3 sm:p-4">
                  <h3 className="text-white font-bold text-sm sm:text-base leading-tight">{tile.name}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

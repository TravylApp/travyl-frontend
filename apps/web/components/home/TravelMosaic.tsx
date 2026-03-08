"use client";

import { motion } from "motion/react";
import {
  useMosaicTiles,
  TILE_CATEGORY_GRADIENTS,
  TILE_CATEGORY_COLORS,
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

export function TravelMosaic() {
  const { data: dbTiles, isLoading } = useMosaicTiles();
  const tiles = dbTiles?.length ? dbTiles : PLACEHOLDER_TILES;

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
          Moments That <em>Move You</em>
        </h2>

        {/* Desktop: 6-col grid */}
        <div
          className="hidden md:grid grid-cols-6 auto-rows-[120px] gap-3"
          style={{ gridAutoFlow: "dense" }}
        >
          {tiles.map((tile, i) => {
            const grad = TILE_CATEGORY_GRADIENTS[tile.category as TileCategory];
            const color = TILE_CATEGORY_COLORS[tile.category as TileCategory];
            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: EASE_OUT_EXPO }}
                whileHover={{ scale: 1.03 }}
                className="rounded-xl overflow-hidden relative cursor-pointer group"
                style={{
                  gridColumn: `span ${tile.gridSpan[0]}`,
                  gridRow: `span ${tile.gridSpan[1]}`,
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="relative h-full flex flex-col justify-end p-4 group-hover:-translate-y-0.5 transition-transform duration-300">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-white/70 text-xs">{color.label}</span>
                  </div>
                  <h3 className="text-white font-bold text-base leading-tight">
                    {tile.name}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile: 2-col grid */}
        <div className="grid md:hidden grid-cols-2 gap-3">
          {tiles.slice(0, 8).map((tile, i) => {
            const grad = TILE_CATEGORY_GRADIENTS[tile.category as TileCategory];
            const color = TILE_CATEGORY_COLORS[tile.category as TileCategory];
            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: EASE_OUT_EXPO }}
                className={`rounded-xl overflow-hidden relative ${
                  i === 0 ? "col-span-2 h-48" : "h-36"
                }`}
                style={{
                  background: tile.image_url
                    ? undefined
                    : `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                }}
              >
                {tile.image_url && (
                  <img
                    src={tile.image_url}
                    alt={tile.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="h-full flex flex-col justify-end p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-white/70 text-xs">{color.label}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm">{tile.name}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

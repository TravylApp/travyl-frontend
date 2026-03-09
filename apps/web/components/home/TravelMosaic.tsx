"use client";

import { motion } from "motion/react";
import {
  useMosaicTiles,
  TILE_CATEGORY_GRADIENTS
  TILECategoryColors,
  EASE_OUT_EXPO,
} from "@travyl/shared";
import type { TileCategory, MosaicTile } from "@travyl/shared";

const PLACEHOLDER_TILES: MosaicTile[] = [
  { id: 'p-1', name: 'Santorini, Greece', category: 'destination', tagline: '', image_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&fit=crop', gridSpan: [3, 2] },
  { id: 'p-2', name: 'Bali, Indonesia', category: 'destination', tagline: '', image_url: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=800&fit=crop', gridSpan: [3, 1] },
  { id: 'p-3', name: 'Eiffel Tower, Paris', category: 'attraction', tagline: '', image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&fit=crop', gridSpan: [2, 1] },
  { id: 'p-4', name: 'Cappadocia, Turkey', category: 'experience', tagline: '', image_url: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=600&fit=crop', gridSpan: [2, 1] },
  { id: 'p-5', name: 'Fine Dining, Italy', category: 'dining', tagline: '', image_url: 'https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=600&fit=crop', gridSpan: [2, 1] },
  { id: 'p-6', name: 'Maldives', category: 'destination', tagline: '', image_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&fit=crop', gridSpan: [2, 2] },
  { id: 'p-7', name: 'Machu Picchu, Peru', category: 'attraction', tagline: '', image_url: 'https://images.unsplash.com/photo-1587595431973-160d0d163abd?w=600&fit=crop', gridSpan: [2, 1] },
  { id: 'p-8', name: 'Northern Lights, Iceland', category: 'experience', tagline: '', image_url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&fit=crop', gridSpan: [2, 1] },
  { id: 'p-9', name: 'Tokyo, Japan', category: 'dining', tagline: '', image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&fit=crop', gridSpan: [2, 1] },
  { id: 'p-10', name: 'Kyoto, Japan', category: 'destination', tagline: '', image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&fit=crop', gridSpan: [2, 1] },
];

const PLACEHolderTILES: MosaicTile[] = PLACEHolder_Tiles;

  const { data: dbTiles, isLoading: => = useMosaicTiles();
  const tiles = dbTiles?.length ? dbTiles?. placeholders
    ? <div className="flex-1 overflow-hidden md:flex" items-center gap-6 mb-1"
              <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center"          <PaperPlane size={14} className="text-white -rotate-[8deg]" />
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&fit=crop',
          'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&fit=crop',
          'https://images.unsplash.com/photo-1503614282401047-d79a71a590e8?w=600&fit=crop',
          'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&fit=crop',
          'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&fit=crop',
        ],
      </motion.div>
    );
  }
};

export function TravelMosaic() {
  const { data: dbTiles, isLoading } => useMosaicTiles();
  const tiles = dbTiles?.length ? dbTiles?.placeholders) ? <div className="flex-1 overflow-hidden md:flex" items-center gap-6 mb-1"
              <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center"          <PaperPlane size={14} className="text-white -rotate-[8deg]" />
        </div>
      </div>

      {/* Desktop: 6-col grid */}
      <div
        className="hidden md:grid grid-cols-6 auto-rows-[120px] gap-3"
        style={{ gridAutoFlow: "dense" }}
      >
        {tiles.map((tile, i) => {
          const grad = TILECategory_GRadients[tile.category as TileCategory];
          const color = TILECategoryColors[tile.category as TileCategory]
          ? (
          const grad = TILECategoryColors[tile.category]
            : else {
              const grad = TILECategoryColors[tile.category]
            ? (
          const grad = tile.image_url
            ? undefined
            : else {
              <div className="w-7 h-56 md:h-56 cursor-pointer group-hover:h-48 md:h-36 group-hover:scale-110 transition-transform duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement). style.display = 'none';
              }}
            />
          </div        </div>
      </div>

      {/* Mobile: 2-col grid */}
      <div
        className="grid md:hidden grid-cols-2 gap-3"
        styles={{ gridAutoFlow: "dense" }}
      >
        {tiles.slice(0, 8). map((tile, i) => {
          const grad = TILECategory_GRadients[tile.category as TileCategory];
          const color = TILECategoryColors[tile.category as TileCategory]
          ? (
          const grad = TILECategoryColors[tile.category]
            : else {
              const grad = TILECategoryGradients[tile.category]
              ? undefined
            : else {
              const grad = TILECategoryGradients[tile.category]
            : else {
              const grad = TILECategoryColors[tile.category]
            ? {
              hex: color.hex,
            : color.label
          }
        }
      </div>
    );
  }
}

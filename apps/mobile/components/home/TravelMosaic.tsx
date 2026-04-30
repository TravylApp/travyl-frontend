import React, { useState, useMemo } from 'react';
import { View, Text, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import {
  TILE_CATEGORY_GRADIENTS,
  TILE_CATEGORY_COLORS,
  getWebApiBase,
  useTrendingDestinations,
} from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import type { MosaicTile, TileCategory } from '@travyl/shared';
import { TileFadeIn } from './TileFadeIn';
import { filterAndUpscalePlaces } from './globalDedup';
import { MosaicTile as Tile } from './MosaicTile';
import { SectionHeader } from './SectionHeader';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';

const GAP = 10;
const PADDING = 24;

const ROW_LAYOUT: [number, number, number][] = [
  [0.58, 0.42, 160],
  [0.42, 0.58, 140],
  [0.5, 0.5, 150],
];

const PLACEHOLDER_TILES: MosaicTile[] = [
  { id: 'p-1', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [3, 2] },
  { id: 'p-2', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [3, 2] },
  { id: 'p-3', name: '', category: 'attraction', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-4', name: '', category: 'experience', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-5', name: '', category: 'dining', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-6', name: '', category: 'destination', tagline: '', image_url: null, gridSpan: [2, 2] },
  { id: 'p-7', name: '', category: 'attraction', tagline: '', image_url: null, gridSpan: [2, 1] },
  { id: 'p-8', name: '', category: 'experience', tagline: '', image_url: null, gridSpan: [2, 1] },
];

interface MosaicProps {
  scrollY?: SharedValue<number>;
}

export function TravelMosaic({ scrollY }: MosaicProps) {
  const colors = useThemeColors();
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip();
  const { width, height: screenH } = useWindowDimensions();
  const contentWidth = width - PADDING * 2;
  const containerY = useSharedValue(99999);
  const WEB_API = getWebApiBase();
  const { data: trending } = useTrendingDestinations();
  const trendingNames = trending?.map(d => d.name) ?? [];
  const { data: fetchedData } = useQuery({
    queryKey: ['mobile-mosaic', trendingNames.join(',')],
    enabled: trending !== undefined, // wait for trending to load
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ tiles: MosaicTile[]; places: PlaceItem[] }> => {
      // Pick 3 random trending cities (offset 10 to avoid overlap with other sections)
      const searchTerms = trendingNames.length > 0
        ? [...trendingNames].sort(() => Math.random() - 0.5).slice(0, 3)
        : ['things to do'];

      const results = await Promise.all(
        searchTerms.map(async (city) => {
          // Try ?q= first, fall back to geocode + lat/lng
          try {
            const qRes = await fetch(`${WEB_API}/api/places?q=${encodeURIComponent(city)}&limit=3`);
            if (qRes.ok) {
              const data = await qRes.json();
              if (Array.isArray(data) && data.length > 0) return data as PlaceItem[];
            }
          } catch {}
          // Geocode fallback
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
              { headers: { 'User-Agent': 'TravylApp/1.0' } }
            );
            if (geoRes.ok) {
              const geo = await geoRes.json();
              if (geo.length > 0) {
                const res = await fetch(`${WEB_API}/api/places?lat=${geo[0].lat}&lng=${geo[0].lon}&category=sightseeing&limit=3`);
                if (res.ok) return (await res.json()) as PlaceItem[];
              }
            }
          } catch {}
          return [] as PlaceItem[];
        })
      );
      const places = filterAndUpscalePlaces(results.flat());
      const tiles = places.map((p) => ({
        id: p.id, name: p.name, category: 'destination' as const,
        tagline: p.tagline || '', image_url: p.image, gridSpan: [2, 1] as [number, number],
      }));
      return { tiles, places };
    },
  });
  const fetchedTiles = fetchedData?.tiles;
  const fetchedPlaces = fetchedData?.places ?? [];
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const allTiles = fetchedTiles?.length ? fetchedTiles : PLACEHOLDER_TILES;

  const tiles = allTiles.slice(0, 8);
  const featured = tiles[0];
  const rest = tiles.slice(1);

  // Full PlaceItem data for CardStackCarousel (has address, hours, website, etc.)
  const tilePlaces = useMemo<PlaceItem[]>(() => {
    const tileIds = tiles.map(t => t.id);
    return tileIds
      .map(id => fetchedPlaces.find(p => p.id === id))
      .filter((p): p is PlaceItem => !!p);
  }, [tiles, fetchedPlaces]);

  const rows: MosaicTile[][] = [];
  for (let i = 0; i < rest.length; i += 2) {
    if (i + 1 < rest.length) {
      rows.push([rest[i], rest[i + 1]]);
    } else {
      rows.push([rest[i]]);
    }
  }

  const featuredGrad = TILE_CATEGORY_GRADIENTS[featured.category as TileCategory];
  const featuredColor = TILE_CATEGORY_COLORS[featured.category as TileCategory];

  const onContainerLayout = (e: LayoutChangeEvent) => {
    containerY.value = e.nativeEvent.layout.y;
  };

  return (
    <View
      style={{ paddingVertical: 40, paddingHorizontal: PADDING }}
      onLayout={onContainerLayout}
    >
      <View style={{ marginBottom: 24 }}>
        <SectionHeader eyebrow="Highlights" title="Moments That Move You" />
      </View>

      <TileFadeIn scrollY={scrollY} containerY={containerY} screenH={screenH} index={0}>
        <Tile
          tile={featured}
          grad={featuredGrad}
          color={featuredColor}
          width={contentWidth}
          height={190}
          nameSize={18}
          padInner={20}
          isFeature
          onPress={() => setSelectedIdx(0)}
        />
      </TileFadeIn>

      <View style={{ height: GAP }} />

      {rows.map((row, ri) => {
        const layout = ROW_LAYOUT[ri % ROW_LAYOUT.length];
        const isFullWidth = row.length === 1;
        const baseIndex = ri * 2 + 1;

        return (
          <View key={ri}>
            <View style={{ flexDirection: 'row' }}>
              {row.map((tile, ti) => {
                const grad = TILE_CATEGORY_GRADIENTS[tile.category as TileCategory];
                const color = TILE_CATEGORY_COLORS[tile.category as TileCategory];
                const tileWidth = isFullWidth
                  ? contentWidth
                  : (contentWidth - GAP) * (ti === 0 ? layout[0] : layout[1]);

                return (
                  <View key={tile.id} style={{ flexDirection: 'row' }}>
                    {ti === 1 && <View style={{ width: GAP }} />}
                    <TileFadeIn
                      scrollY={scrollY}
                      containerY={containerY}
                      screenH={screenH}
                      index={baseIndex + ti}
                    >
                      <Tile
                        tile={tile}
                        grad={grad}
                        color={color}
                        width={tileWidth}
                        height={isFullWidth ? 120 : layout[2]}
                        onPress={() => setSelectedIdx(baseIndex + ti)}
                      />
                    </TileFadeIn>
                  </View>
                );
              })}
            </View>
            {ri < rows.length - 1 && <View style={{ height: GAP }} />}
          </View>
        );
      })}

      {/* Card detail overlay */}
      {selectedIdx >= 0 && tilePlaces.length > 0 && (
        <CardStackCarousel
          places={tilePlaces}
          initialIndex={Math.min(selectedIdx, tilePlaces.length - 1)}
          favorites={[]}
          onToggleFav={() => {}}
          onAddToTrip={addToTrip}
          tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
          overlay
          onClose={() => setSelectedIdx(-1)}
        />
      )}
    </View>
  );
}

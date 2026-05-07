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
} from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';
import { ICONIC_DESTINATIONS } from '@/hooks/usePlacesBatch';
import { cached } from '@/hooks/persistentCache';

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

// Curated iconic-destination tiles shown while the SerpAPI fetch is in-flight
// (and as a graceful fallback if the API is unreachable). Real names + 4K
// Pexels imagery so the section never looks empty.
const FALLBACK_TILES: MosaicTile[] = [
  {
    id: 'fb-santorini',
    name: 'Santorini',
    category: 'destination',
    tagline: 'White-washed cliffs over the Aegean',
    image_url: 'https://images.pexels.com/photos/29081769/pexels-photo-29081769.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [3, 2],
  },
  {
    id: 'fb-tokyo',
    name: 'Tokyo',
    category: 'destination',
    tagline: 'Neon nights and quiet shrines',
    image_url: 'https://images.pexels.com/photos/427747/pexels-photo-427747.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 1],
  },
  {
    id: 'fb-bali',
    name: 'Bali',
    category: 'experience',
    tagline: 'Rice terraces and temple sunrises',
    image_url: 'https://images.pexels.com/photos/24995221/pexels-photo-24995221.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 1],
  },
  {
    id: 'fb-barcelona',
    name: 'Barcelona',
    category: 'attraction',
    tagline: 'Gaudí, tapas, and Mediterranean light',
    image_url: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 1],
  },
  {
    id: 'fb-paris',
    name: 'Paris',
    category: 'destination',
    tagline: 'Boulevards, bakeries, and the Tower',
    image_url: 'https://images.pexels.com/photos/33800139/pexels-photo-33800139.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 2],
  },
  {
    id: 'fb-kyoto',
    name: 'Kyoto',
    category: 'experience',
    tagline: 'Bamboo groves and golden pavilions',
    image_url: 'https://images.pexels.com/photos/35134885/pexels-photo-35134885.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 1],
  },
  {
    id: 'fb-marrakech',
    name: 'Marrakech',
    category: 'attraction',
    tagline: 'Spice markets and riad courtyards',
    image_url: 'https://images.pexels.com/photos/30978583/pexels-photo-30978583.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 1],
  },
  {
    id: 'fb-cape-town',
    name: 'Cape Town',
    category: 'destination',
    tagline: 'Where Table Mountain meets two oceans',
    image_url: 'https://images.pexels.com/photos/29213215/pexels-photo-29213215.jpeg?auto=compress&cs=tinysrgb&w=2400',
    gridSpan: [2, 1],
  },
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
  // Pick a stable rotation of 3 iconic destinations per session — Santorini,
  // Tokyo, Bali, Barcelona, etc. Each call uses a 24h persistent cache so we
  // don't hammer SerpAPI on every cold start.
  const mosaicCities = useMemo(
    () => [...ICONIC_DESTINATIONS].sort(() => Math.random() - 0.5).slice(0, 3),
    []
  );
  const { data: fetchedData } = useQuery({
    queryKey: ['mobile-mosaic', mosaicCities.join(',')],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<{ tiles: MosaicTile[]; places: PlaceItem[] }> => {
      const TTL = 24 * 60 * 60 * 1000;
      const results = await Promise.all(
        mosaicCities.map((city) =>
          cached(`mosaic-places:${city}`, TTL, async () => {
            try {
              const qRes = await fetch(`${WEB_API}/api/places?q=${encodeURIComponent(city)}&limit=3`);
              if (qRes.ok) {
                const data = await qRes.json();
                if (Array.isArray(data) && data.length > 0) return data as PlaceItem[];
              }
            } catch {}
            // Geocode fallback for endpoints that don't take ?q=
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
        )
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

  const allTiles = fetchedTiles?.length ? fetchedTiles : FALLBACK_TILES;

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

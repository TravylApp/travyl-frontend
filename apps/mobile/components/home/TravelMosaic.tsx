import React from 'react';
import { View, Text, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  useMosaicTiles,
  TILE_CATEGORY_GRADIENTS,
  TILE_CATEGORY_COLORS,
  Gray,
} from '@travyl/shared';
import type { MosaicTile, TileCategory } from '@travyl/shared';
import { TileFadeIn } from './TileFadeIn';
import { MosaicTile as Tile } from './MosaicTile';

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
  const { width, height: screenH } = useWindowDimensions();
  const contentWidth = width - PADDING * 2;
  const containerY = useSharedValue(99999);
  const { data: dbTiles } = useMosaicTiles();
  const allTiles = dbTiles?.length ? dbTiles : PLACEHOLDER_TILES;

  const tiles = allTiles.slice(0, 8);
  const featured = tiles[0];
  const rest = tiles.slice(1);

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
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: Gray[900],
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        Moments That{' '}
        <Text style={{ fontStyle: 'italic' }}>Move You</Text>
      </Text>

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
    </View>
  );
}

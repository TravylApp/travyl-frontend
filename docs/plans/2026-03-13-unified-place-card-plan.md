# Unified PlaceCard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a single PlaceCard component (mobile + web) with three fixed sizes that replaces all card variants, powered by `PlaceItem` data, and retire the `ExploreItem` type.

**Architecture:** The PlaceCard wraps image, badges, overlay text, and optional flip-to-back into one component per platform. Compact cards don't flip (they trigger `onPress`). Standard/full cards flip to reveal QuickFacts, GettingThere, and PlaceActions. The Explore section switches from `ExploreItem[]` to `PlaceItem[]`, with `MOCK_PLACES` providing fallback data grouped by type.

**Tech Stack:** React Native + Reanimated (mobile), React + Tailwind + motion/react (web), PlaceItem from @travyl/shared

---

### Task 1: Update Shared Types — Replace ExploreItem with PlaceItem

**Files:**
- Modify: `packages/shared/src/types/index.ts:85-94`

**Step 1: Replace ExploreItem and ExploreRow types**

Replace lines 85-94:

```typescript
// OLD — remove these:
// export interface ExploreItem { id: string; name: string; image_url: string | null; }
// export interface ExploreRow { title: string; items: ExploreItem[]; }

// NEW:
export interface ExplorePlaceRow {
  title: string;
  items: PlaceItem[];
}
```

Keep `ExploreItem` temporarily as a deprecated alias so we don't break everything at once:

```typescript
/** @deprecated Use PlaceItem instead */
export type ExploreItem = PlaceItem;
/** @deprecated Use ExplorePlaceRow instead */
export type ExploreRow = ExplorePlaceRow;
```

**Step 2: Verify shared package builds**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: PASS (no type errors)

---

### Task 2: Create PlaceCard Size Config in Shared Package

**Files:**
- Create: `packages/shared/src/config/placeCardSizes.ts`
- Modify: `packages/shared/src/config/index.ts` (add export)

**Step 1: Create the size config**

```typescript
// packages/shared/src/config/placeCardSizes.ts

export const PLACE_CARD_SIZES = {
  compact: { width: 150, height: 200 },
  standard: { width: 280, height: 380 },
  full: { width: 0, height: 420 }, // width = parent
} as const;

export type PlaceCardSize = keyof typeof PLACE_CARD_SIZES;
```

**Step 2: Export from config barrel**

Add to `packages/shared/src/config/index.ts`:

```typescript
export * from './placeCardSizes';
```

---

### Task 3: Build Mobile PlaceCard Component

**Files:**
- Create: `apps/mobile/components/PlaceCard.tsx`

This is the core component. It renders the card front for all sizes, and wraps in FlipCard for standard/full.

**Step 1: Create the component**

```tsx
// apps/mobile/components/PlaceCard.tsx

import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, type PlaceItem, PLACE_CARD_SIZES, type PlaceCardSize } from '@travyl/shared';

// ─── Size helpers ──────────────────────────────────────────────
function getDimensions(size: PlaceCardSize, overrideWidth?: number, overrideHeight?: number) {
  const preset = PLACE_CARD_SIZES[size];
  return {
    width: overrideWidth ?? preset.width,
    height: overrideHeight ?? preset.height,
  };
}

// ─── Price Level Display ───────────────────────────────────────
function PriceLevel({ level }: { level: number }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', marginLeft: 6 }}>
      {'$'.repeat(level)}
      <Text style={{ color: 'rgba(255,255,255,0.3)' }}>{'$'.repeat(4 - level)}</Text>
    </Text>
  );
}

// ─── Card Front ────────────────────────────────────────────────
interface CardFrontInternalProps {
  place: PlaceItem;
  size: PlaceCardSize;
  isFav: boolean;
  onToggleFav: () => void;
  onPress?: () => void;
  imageIndex?: number;
  width: number;
  height: number;
}

function CardFrontInternal({
  place,
  size,
  isFav,
  onToggleFav,
  onPress,
  imageIndex = 0,
  width,
  height,
}: CardFrontInternalProps) {
  const images = place.images?.length ? place.images : [place.image];
  const isCompact = size === 'compact';
  const isFull = size === 'full';

  // ── Crossfade ──
  const safeIdx = imageIndex % images.length;
  const [imgA, setImgA] = useState(images[safeIdx]);
  const [imgB, setImgB] = useState(images[(safeIdx + 1) % images.length]);
  const opacityA = useSharedValue(1);
  const opacityB = useSharedValue(0);
  const showingA = useRef(true);
  const prevIdx = useRef(safeIdx);
  const prevPlaceId = useRef(place.id);

  useEffect(() => {
    if (place.id === prevPlaceId.current) return;
    prevPlaceId.current = place.id;
    const idx = imageIndex % images.length;
    setImgA(images[idx]);
    setImgB(images[(idx + 1) % images.length]);
    opacityA.value = 1;
    opacityB.value = 0;
    showingA.current = true;
    prevIdx.current = idx;
  }, [place.id]);

  useEffect(() => {
    if (safeIdx === prevIdx.current) return;
    prevIdx.current = safeIdx;
    if (showingA.current) {
      setImgB(images[safeIdx]);
      opacityB.value = withTiming(1, { duration: 600 });
      opacityA.value = withTiming(0, { duration: 600 });
    } else {
      setImgA(images[safeIdx]);
      opacityA.value = withTiming(1, { duration: 600 });
      opacityB.value = withTiming(0, { duration: 600 });
    }
    showingA.current = !showingA.current;
  }, [safeIdx]);

  const animStyleA = useAnimatedStyle(() => ({ opacity: opacityA.value }));
  const animStyleB = useAnimatedStyle(() => ({ opacity: opacityB.value }));

  return (
    <Pressable onPress={onPress} style={{ width, height, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
      {/* Background images */}
      {images.length > 1 ? (
        <>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, animStyleA]}>
            <Image source={{ uri: imgA }} style={{ width, height }} resizeMode="cover" />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, animStyleB]}>
            <Image source={{ uri: imgB }} style={{ width, height }} resizeMode="cover" />
          </Animated.View>
        </>
      ) : (
        <Image source={{ uri: images[0] }} style={{ position: 'absolute', width, height }} resizeMode="cover" />
      )}

      {/* Gradient overlay */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.6, backgroundColor: 'transparent' }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: 0.9 }} />
      </View>

      {/* Category badge — top-left */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: isCompact ? 8 : 10,
          left: isCompact ? 8 : 10,
          backgroundColor: 'rgba(255,255,255,0.9)',
          paddingHorizontal: isCompact ? 6 : 10,
          paddingVertical: isCompact ? 2 : 4,
          borderRadius: 12,
        }}
      >
        <Text style={{ fontSize: isCompact ? 8 : 10, fontWeight: '700', color: Navy.DEFAULT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {place.category}
        </Text>
      </View>

      {/* Heart button — top-right */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }}
        style={{
          position: 'absolute',
          top: isCompact ? 8 : 10,
          right: isCompact ? 8 : 10,
          width: isCompact ? 26 : 32,
          height: isCompact ? 26 : 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.9)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={isCompact ? 10 : 14} color={isFav ? '#ef4444' : '#9ca3af'} />
      </Pressable>

      {/* Text overlay — bottom */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: isCompact ? 10 : 14,
          paddingBottom: isCompact ? 10 : 14,
          paddingTop: 40,
        }}
      >
        {/* Type label */}
        <Text style={{
          fontSize: isCompact ? 8 : 10,
          fontWeight: '700',
          color: '#7dd3fc',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: isCompact ? 2 : 4,
          textShadowColor: 'rgba(0,0,0,0.75)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          {place.type}
        </Text>

        {/* Name + rating row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isCompact ? 0 : 4 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: isCompact ? 13 : isFull ? 20 : 16,
              fontWeight: '800',
              color: '#fff',
              flexShrink: 1,
              marginRight: 8,
              textShadowColor: 'rgba(0,0,0,0.75)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {place.name}
          </Text>

          {!isCompact && place.rating != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
              <FontAwesome name="star" size={10} color="#facc15" style={{ marginRight: 3 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{place.rating.toFixed(1)}</Text>
              {isFull && place.reviewCount && (
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginLeft: 3 }}>({place.reviewCount.toLocaleString()})</Text>
              )}
            </View>
          )}

          {!isCompact && place.type === 'restaurant' && place.priceLevel && (
            <PriceLevel level={place.priceLevel} />
          )}
        </View>

        {/* Location / tagline — not compact */}
        {!isCompact && place.tagline ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <FontAwesome name="map-marker" size={11} color="rgba(255,255,255,0.65)" style={{ marginRight: 4 }} />
            <Text numberOfLines={1} style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              {place.tagline}
            </Text>
          </View>
        ) : null}

        {/* Duration for experiences */}
        {!isCompact && (place.type === 'experience' || place.type === 'event') && place.duration ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <FontAwesome name="clock-o" size={11} color="rgba(255,255,255,0.65)" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{place.duration}</Text>
          </View>
        ) : null}

        {/* Hours / Open now — full only */}
        {isFull && place.hours ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <FontAwesome name="clock-o" size={11} color="rgba(255,255,255,0.65)" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{place.hours}</Text>
          </View>
        ) : null}

        {/* Description */}
        {!isCompact && place.description ? (
          <Text numberOfLines={isFull ? 2 : 1} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
            {place.description}
          </Text>
        ) : null}
      </View>

      {/* Flip hint — standard/full only */}
      {!isCompact && (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, right: 12 }}>
          <FontAwesome name="repeat" size={12} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </Pressable>
  );
}

// ─── Card Back (reuses existing components) ────────────────────
// Import from existing places components
import CardBack from './places/CardBack';

// ─── Main PlaceCard Component ──────────────────────────────────
interface PlaceCardProps {
  place: PlaceItem;
  size: PlaceCardSize;
  isFav: boolean;
  onToggleFav: () => void;
  onPress?: () => void;
  imageIndex?: number;
  width?: number;
  height?: number;
}

export function PlaceCard({
  place,
  size,
  isFav,
  onToggleFav,
  onPress,
  imageIndex = 0,
  width: overrideW,
  height: overrideH,
}: PlaceCardProps) {
  const { width, height } = getDimensions(size, overrideW, overrideH);
  const [isFlipped, setIsFlipped] = useState(false);

  // Compact cards don't flip
  if (size === 'compact') {
    return (
      <CardFrontInternal
        place={place}
        size={size}
        isFav={isFav}
        onToggleFav={onToggleFav}
        onPress={onPress}
        imageIndex={imageIndex}
        width={width}
        height={height}
      />
    );
  }

  // Standard/Full cards flip
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isFlipped ? 180 : 0, { damping: 15, stiffness: 100 });
  }, [isFlipped]);

  const isPastHalf = useDerivedValue(() => rotation.value > 90);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 180], [0, 180])}deg` }],
    opacity: isPastHalf.value ? 0 : 1,
    zIndex: isPastHalf.value ? 0 : 1,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` }],
    opacity: isPastHalf.value ? 1 : 0,
    zIndex: isPastHalf.value ? 1 : 0,
  }));

  const handleFlip = () => setIsFlipped(!isFlipped);

  return (
    <View style={{ width, height, borderRadius: 16, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', width, height }, frontStyle]}>
        <CardFrontInternal
          place={place}
          size={size}
          isFav={isFav}
          onToggleFav={onToggleFav}
          onPress={handleFlip}
          imageIndex={imageIndex}
          width={width}
          height={height}
        />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', width, height }, backStyle]}>
        <CardBack
          place={place}
          isFav={isFav}
          onToggleFav={onToggleFav}
          onFlip={handleFlip}
          onSearchTag={() => {}}
          width={width}
          height={height}
        />
      </Animated.View>
    </View>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to PlaceCard

---

### Task 4: Build Web PlaceCard Component

**Files:**
- Create: `apps/web/components/PlaceCard.tsx`

**Step 1: Create the web component**

Port of the mobile component using Tailwind + motion/react. Same visual layout, same three sizes.

```tsx
// apps/web/components/PlaceCard.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MapPin, Star, Clock, Repeat } from 'lucide-react';
import { Navy, type PlaceItem, PLACE_CARD_SIZES, type PlaceCardSize } from '@travyl/shared';

function getDimensions(size: PlaceCardSize, overrideW?: number, overrideH?: number) {
  const preset = PLACE_CARD_SIZES[size];
  return { width: overrideW ?? preset.width, height: overrideH ?? preset.height };
}

function PriceLevel({ level }: { level: number }) {
  return (
    <span className="text-[11px] font-bold text-white ml-1.5">
      {'$'.repeat(level)}
      <span className="text-white/30">{'$'.repeat(4 - level)}</span>
    </span>
  );
}

// ─── Card Front ──────────────────────────────────────────────
function CardFrontInternal({
  place, size, isFav, onToggleFav, onClick, imageIndex = 0, width, height,
}: {
  place: PlaceItem; size: PlaceCardSize; isFav: boolean; onToggleFav: () => void;
  onClick?: () => void; imageIndex?: number; width: number; height: number;
}) {
  const images = place.images?.length ? place.images : [place.image];
  const isCompact = size === 'compact';
  const isFull = size === 'full';
  const [currentImg, setCurrentImg] = useState(images[imageIndex % images.length]);

  useEffect(() => {
    setCurrentImg(images[imageIndex % images.length]);
  }, [imageIndex, images]);

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-black group ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width, height, borderRadius: 16 }}
    >
      {/* Background image */}
      <Image
        src={currentImg}
        alt={place.name}
        fill
        className="object-cover transition-opacity duration-700 group-hover:scale-105 transition-transform"
        sizes={`${width}px`}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Category badge */}
      <div
        className="absolute bg-white/90 rounded-xl"
        style={{ top: isCompact ? 8 : 10, left: isCompact ? 8 : 10, padding: isCompact ? '2px 6px' : '4px 10px' }}
      >
        <span className="font-bold uppercase tracking-wide" style={{ fontSize: isCompact ? 8 : 10, color: Navy.DEFAULT }}>
          {place.category}
        </span>
      </div>

      {/* Heart button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className={`absolute rounded-full flex items-center justify-center transition-all z-10 ${
          isFav ? 'bg-red-500 shadow-lg' : 'bg-white/90 hover:bg-white shadow-sm'
        }`}
        style={{
          top: isCompact ? 8 : 10, right: isCompact ? 8 : 10,
          width: isCompact ? 26 : 32, height: isCompact ? 26 : 32,
        }}
      >
        <Heart size={isCompact ? 10 : 14} className={isFav ? 'text-white fill-white' : 'text-gray-400'} />
      </button>

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0" style={{ padding: isCompact ? 10 : 14, paddingTop: 40 }}>
        {/* Type */}
        <p className="font-bold uppercase tracking-wider text-[#7dd3fc] drop-shadow-md" style={{ fontSize: isCompact ? 8 : 10, marginBottom: isCompact ? 2 : 4 }}>
          {place.type}
        </p>

        {/* Name + Rating */}
        <div className="flex items-center gap-2" style={{ marginBottom: isCompact ? 0 : 4 }}>
          <h3 className="font-extrabold text-white truncate drop-shadow-md" style={{ fontSize: isCompact ? 13 : isFull ? 20 : 16 }}>
            {place.name}
          </h3>
          {!isCompact && place.rating != null && (
            <span className="flex items-center gap-1 bg-black/45 text-white rounded-lg px-2 py-0.5 shrink-0">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[11px] font-bold">{place.rating.toFixed(1)}</span>
              {isFull && place.reviewCount && (
                <span className="text-[9px] text-white/60">({place.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {!isCompact && place.type === 'restaurant' && place.priceLevel && (
            <PriceLevel level={place.priceLevel} />
          )}
        </div>

        {/* Location */}
        {!isCompact && place.tagline && (
          <div className="flex items-center gap-1 mb-1">
            <MapPin size={11} className="text-white/65 shrink-0" />
            <span className="text-xs text-white/65 truncate drop-shadow-md">{place.tagline}</span>
          </div>
        )}

        {/* Duration for experiences */}
        {!isCompact && (place.type === 'experience' || place.type === 'event') && place.duration && (
          <div className="flex items-center gap-1 mb-1">
            <Clock size={11} className="text-white/65" />
            <span className="text-xs text-white/65">{place.duration}</span>
          </div>
        )}

        {/* Hours — full only */}
        {isFull && place.hours && (
          <div className="flex items-center gap-1 mb-1">
            <Clock size={11} className="text-white/65" />
            <span className="text-xs text-white/65">{place.hours}</span>
          </div>
        )}

        {/* Description */}
        {!isCompact && place.description && (
          <p className="text-[13px] text-white/70 leading-snug drop-shadow-md" style={{ display: '-webkit-box', WebkitLineClamp: isFull ? 2 : 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {place.description}
          </p>
        )}
      </div>

      {/* Flip hint */}
      {!isCompact && (
        <div className="absolute bottom-3 right-3">
          <Repeat size={12} className="text-white/40" />
        </div>
      )}
    </div>
  );
}

// ─── Card Back (web version) ─────────────────────────────────
function CardBackWeb({ place, onFlip, width, height }: { place: PlaceItem; onFlip: () => void; width: number; height: number }) {
  return (
    <div
      onClick={onFlip}
      className="cursor-pointer overflow-hidden text-white"
      style={{ width, height, borderRadius: 16, backgroundColor: Navy.DEFAULT }}
    >
      <div className="h-full overflow-y-auto p-4">
        {/* Header */}
        <h3 className="text-lg font-bold mb-1">{place.name}</h3>
        <p className="text-xs text-white/60 uppercase tracking-wider mb-4">{place.category} · {place.type}</p>

        <div className="border-t border-white/10 pt-3 space-y-3">
          {/* Quick Facts */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {place.rating != null && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Rating</span>
                <span className="font-bold flex items-center gap-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  {place.rating.toFixed(1)}
                  {place.reviewCount && <span className="text-white/50 font-normal">({place.reviewCount.toLocaleString()})</span>}
                </span>
              </div>
            )}
            {place.priceLevel && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Price</span>
                <span className="font-bold">{'$'.repeat(place.priceLevel)}<span className="text-white/30">{'$'.repeat(4 - place.priceLevel)}</span></span>
              </div>
            )}
            {place.duration && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Duration</span>
                <span className="font-bold">{place.duration}</span>
              </div>
            )}
            {place.hours && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Hours</span>
                <span className="font-bold text-[10px]">{place.hours}</span>
              </div>
            )}
            {place.admissionFee && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Admission</span>
                <span className="font-bold">{place.admissionFee}</span>
              </div>
            )}
            {place.bestTimeToVisit && (
              <div className="bg-white/10 rounded-lg p-2">
                <span className="text-white/50 block mb-0.5">Best Time</span>
                <span className="font-bold text-[10px]">{place.bestTimeToVisit}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {place.address && (
            <div className="text-xs">
              <span className="text-white/50 block mb-0.5">Address</span>
              <span>{place.address}</span>
            </div>
          )}

          {/* Tips */}
          {place.tips?.length ? (
            <div className="text-xs">
              <span className="text-white/50 block mb-1">Tips</span>
              {place.tips.map((tip, i) => (
                <p key={i} className="text-white/80 italic mb-1 text-[11px]">💡 {tip}</p>
              ))}
            </div>
          ) : null}
        </div>

        {/* Flip hint */}
        <div className="text-center mt-4">
          <Repeat size={12} className="text-white/40 inline-block" />
          <span className="text-white/40 text-[10px] ml-1">Tap to flip</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main PlaceCard Component ────────────────────────────────
interface PlaceCardProps {
  place: PlaceItem;
  size: PlaceCardSize;
  isFav: boolean;
  onToggleFav: () => void;
  onClick?: () => void;
  imageIndex?: number;
  width?: number;
  height?: number;
}

export function PlaceCard({
  place, size, isFav, onToggleFav, onClick, imageIndex = 0, width: overrideW, height: overrideH,
}: PlaceCardProps) {
  const { width, height } = getDimensions(size, overrideW, overrideH);
  const [isFlipped, setIsFlipped] = useState(false);

  if (size === 'compact') {
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <CardFrontInternal
          place={place} size={size} isFav={isFav} onToggleFav={onToggleFav}
          onClick={onClick} imageIndex={imageIndex} width={width} height={height}
        />
      </motion.div>
    );
  }

  return (
    <div className="relative" style={{ width, height, perspective: 1000 }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', damping: 15, stiffness: 100 }}
        style={{ width, height, transformStyle: 'preserve-3d', position: 'relative' }}
      >
        {/* Front */}
        <div style={{ position: 'absolute', width, height, backfaceVisibility: 'hidden' }}>
          <CardFrontInternal
            place={place} size={size} isFav={isFav} onToggleFav={onToggleFav}
            onClick={() => setIsFlipped(true)} imageIndex={imageIndex} width={width} height={height}
          />
        </div>
        {/* Back */}
        <div style={{ position: 'absolute', width, height, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <CardBackWeb place={place} onFlip={() => setIsFlipped(false)} width={width} height={height} />
        </div>
      </motion.div>
    </div>
  );
}
```

---

### Task 5: Update Explore Data Layer to Use PlaceItem

**Files:**
- Modify: `packages/shared/src/hooks/useExploreRows.ts`
- Modify: `packages/shared/src/hooks/useExploreData.ts`
- Modify: `packages/shared/src/services/api.ts:52-58`

**Step 1: Update useExploreRows return type**

The hook currently returns `ExploreItem[]` per row. It needs to return `PlaceItem[]`. For now, when the API returns basic `ExploreItem` data, we map it to `PlaceItem` with defaults. The fallback data uses `MOCK_PLACES` directly.

Update `useExploreRows.ts`:

```typescript
import { useState, useCallback, useMemo } from 'react';
import { getCyclicGradient } from '../config/homeData';
import { useExploreData } from './useExploreData';
import { MOCK_PLACES } from '../config/mockPlacesData';
import type { PlaceItem } from '../types';

// Group MOCK_PLACES by type for fallback rows
const FALLBACK_ROWS = [
  { title: 'Popular Destinations', items: MOCK_PLACES.filter(p => p.type === 'destination').slice(0, 8) },
  { title: 'Famous Attractions', items: MOCK_PLACES.filter(p => p.type === 'attraction').slice(0, 8) },
  { title: 'Top Restaurants', items: MOCK_PLACES.filter(p => p.type === 'restaurant').slice(0, 8) },
  { title: 'Hot Experiences', items: MOCK_PLACES.filter(p => p.type === 'experience').slice(0, 8) },
  { title: 'Upcoming Events', items: MOCK_PLACES.filter(p => p.type === 'event').slice(0, 8) },
];

export function useExploreRows() {
  const { data: rawRows, isLoading } = useExploreData();
  const hasApiData = (rawRows ?? []).length > 0;

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const sourceRows = hasApiData ? rawRows! : FALLBACK_ROWS;

  const effectiveExpanded = useMemo(() => {
    if (Object.keys(expandedRows).length > 0) return expandedRows;
    return Object.fromEntries(sourceRows.map((_, i) => [i, false]));
  }, [expandedRows, sourceRows]);

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !(prev[index] ?? false) }));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(sourceRows.map((_, i) => [i, false])));
  }, [sourceRows]);

  const expandAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(sourceRows.map((_, i) => [i, true])));
  }, [sourceRows]);

  const rows = sourceRows.map((row, i) => ({
    title: row.title,
    items: row.items as PlaceItem[],
    gradient: getCyclicGradient(i),
    isExpanded: effectiveExpanded[i] ?? false,
  }));

  const allExpanded = useMemo(
    () => sourceRows.length > 0 && sourceRows.every((_, i) => effectiveExpanded[i] ?? false),
    [effectiveExpanded, sourceRows],
  );

  return { rows, toggleRow, collapseAll, expandAll, allExpanded, isLoading };
}
```

---

### Task 6: Update Mobile ExplorePreview + ExploreRow to Use PlaceCard

**Files:**
- Modify: `apps/mobile/components/home/ExplorePreview.tsx`
- Modify: `apps/mobile/components/home/ExploreRow.tsx`

**Step 1: Update ExploreRow to render PlaceCard compact**

Replace the current solid-blue 150x150 squares with `PlaceCard` compact cards:

```tsx
// In ExploreRow.tsx — replace the card rendering inside the horizontal ScrollView:
import { PlaceCard } from '@/components/PlaceCard';

// Replace the current Pressable card with:
{row.items.map((place, i) => (
  <PlaceCard
    key={place.id}
    place={place}
    size="compact"
    isFav={false}
    onToggleFav={() => {}}
    onPress={() => {/* open modal */}}
  />
))}
```

**Step 2: Update ExplorePreview imports**

Replace `ExploreItem` imports with `PlaceItem`:

```tsx
import type { PlaceItem } from '@travyl/shared';
```

Remove the `placesToExploreItems` helper function since data is already `PlaceItem`.

---

### Task 7: Update Web ExplorePreview to Use PlaceCard

**Files:**
- Modify: `apps/web/components/home/ExplorePreview.tsx`

**Step 1: Replace ExploreCard with PlaceCard**

```tsx
import { PlaceCard } from '@/components/PlaceCard';
import type { PlaceItem } from '@travyl/shared';

// Replace ExploreCard usage with:
{items.map((place) => (
  <PlaceCard
    key={place.id}
    place={place}
    size="compact"
    isFav={false}
    onToggleFav={() => {}}
    onClick={() => onItemClick?.(place)}
  />
))}
```

Remove the inline `ExploreCard` component. Remove FALLBACK_ROWS (now handled by hook). Remove `ExploreItem` import.

---

### Task 8: Update GetInspired to Use PlaceCard (Standard Size)

**Files:**
- Modify: `apps/web/components/home/GetInspired.tsx`
- Modify: `apps/mobile/components/home/GetInspired.tsx`

**Step 1: Web GetInspired**

Replace the inline card markup with PlaceCard standard. The data source needs to be `PlaceItem[]` — use a subset of `MOCK_PLACES` as fallback.

```tsx
import { PlaceCard } from '@/components/PlaceCard';
import { MOCK_PLACES } from '@travyl/shared';

// Replace PLACEHOLDER_CARDS with:
const PLACEHOLDER_CARDS = MOCK_PLACES.slice(0, 8);

// Replace the motion.div card markup with:
<PlaceCard
  place={card}
  size="standard"
  isFav={false}
  onToggleFav={() => {}}
  onClick={() => {}}
/>
```

**Step 2: Mobile GetInspired**

Same approach — replace InspiredCard with PlaceCard compact or standard based on layout.

---

### Task 9: Clean Up — Remove Deprecated Types and Old Card Components

**Files:**
- Modify: `packages/shared/src/types/index.ts` — remove ExploreItem/ExploreRow aliases
- Modify: `apps/web/components/home/ExplorePreview.tsx` — remove old ExploreCard, ExploreItem refs
- Modify: `apps/mobile/components/home/ExploreRow.tsx` — remove old card code

**Step 1: Remove deprecated type aliases**

Once all consumers are migrated, remove:
```typescript
// DELETE these lines from types/index.ts:
export type ExploreItem = PlaceItem;
export type ExploreRow = ExplorePlaceRow;
```

**Step 2: Verify everything builds**

Run: `npx tsc --noEmit` in both `apps/web` and `apps/mobile`
Expected: PASS

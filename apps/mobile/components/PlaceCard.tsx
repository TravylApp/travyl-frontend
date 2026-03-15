import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Navy, type PlaceItem, PLACE_CARD_SIZES, type PlaceCardSize } from '@travyl/shared';
import CardBack from './places/CardBack';

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
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        locations={[0, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isCompact ? height * 0.5 : height * 0.55 }}
      />

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
    rotation.value = withSpring(isFlipped ? 180 : 0, { damping: 18, stiffness: 180, mass: 0.6 });
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

import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, type PlaceItem } from '@travyl/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardFrontProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
  onFlip: () => void;
  width: number;
  height: number;
  /** Controlled image index — parent owns the cycling logic */
  imageIndex?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardFront({
  place,
  isFav,
  onToggleFav,
  onFlip,
  width,
  height,
  imageIndex = 0,
}: CardFrontProps) {
  const images: string[] =
    place.images && place.images.length > 0 ? place.images : [place.image];

  const hasMultiple = images.length > 1;

  // ── Crossfade on imageIndex change ──────────────────────────────────────
  const safeIdx = imageIndex % images.length;
  const [imgA, setImgA] = useState(images[safeIdx]);
  const [imgB, setImgB] = useState(images[(safeIdx + 1) % images.length]);
  const opacityA = useSharedValue(1);
  const opacityB = useSharedValue(0);
  const showingA = useRef(true);
  const prevIdx = useRef(safeIdx);
  const prevPlaceId = useRef(place.id);

  // Reset crossfade state when place changes (new card in deck)
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

  // Crossfade when imageIndex changes within the same place
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Pressable
      onPress={onFlip}
      style={{
        width,
        height,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      {/* ── Background images ─────────────────────────────────────────── */}
      {hasMultiple ? (
        <>
          <Animated.View
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              animStyleA,
            ]}
          >
            <Image
              source={imgA}
              style={{ width, height }}
              contentFit="cover" cachePolicy="memory-disk"
            />
          </Animated.View>
          <Animated.View
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              animStyleB,
            ]}
          >
            <Image
              source={imgB}
              style={{ width, height }}
              contentFit="cover" cachePolicy="memory-disk"
            />
          </Animated.View>
        </>
      ) : (
        <Image
          source={images[0]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
          }}
          contentFit="cover" cachePolicy="memory-disk"
        />
      )}

      {/* ── Category badge — top-left ─────────────────────────────────── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(255,255,255,0.9)',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: Navy.DEFAULT,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {place.category}
        </Text>
      </View>

      {/* ── Heart button — top-right ──────────────────────────────────── */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          onToggleFav();
        }}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.9)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome
          name={isFav ? 'heart' : 'heart-o'}
          size={14}
          color={isFav ? '#ef4444' : '#9ca3af'}
        />
      </Pressable>

      {/* ── Text overlay — bottom ─────────────────────────────────────── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 14,
          paddingBottom: 14,
          paddingTop: 40,
        }}
      >
        {/* Type label */}
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: '#7dd3fc',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
            textShadowColor: 'rgba(0,0,0,0.75)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {place.type}
        </Text>

        {/* Name + rating row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#fff',
              flexShrink: 1,
              marginRight: 10,
              textShadowColor: 'rgba(0,0,0,0.75)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {place.name}
          </Text>

          {place.rating != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.45)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <FontAwesome
                name="star"
                size={10}
                color="#facc15"
                style={{ marginRight: 3 }}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#fff',
                  textShadowColor: 'rgba(0,0,0,0.75)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {place.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Location / tagline */}
        {place.tagline ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <FontAwesome
              name="map-marker"
              size={11}
              color="rgba(255,255,255,0.65)"
              style={{ marginRight: 4 }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                textShadowColor: 'rgba(0,0,0,0.75)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {place.tagline}
            </Text>
          </View>
        ) : null}

        {/* Description */}
        {place.description ? (
          <Text
            numberOfLines={2}
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 19,
              textShadowColor: 'rgba(0,0,0,0.75)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {place.description}
          </Text>
        ) : null}
      </View>

      {/* ── Flip hint — bottom-right ──────────────────────────────────── */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 12, right: 12 }}
      >
        <FontAwesome name="repeat" size={12} color="rgba(255,255,255,0.4)" />
      </View>
    </Pressable>
  );
}

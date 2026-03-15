import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useDerivedValue,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import type { PlaceItem } from '@travyl/shared';
import CardBack from './CardBack';
import { MagazineCurtain } from './MagazineCurtain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const MAGAZINE_DELAY = 5000;

const SPRING_IN = { damping: 28, stiffness: 400, mass: 0.5 };
const FLIP_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

/* ═══════════════ Types ═══════════════ */

export interface CardStackCarouselProps {
  places: PlaceItem[];
  initialIndex?: number;
  favorites: string[];
  onToggleFav: (id: string) => void;
  cardWidth?: number;
  cardHeight?: number;
  overlay?: boolean;
  onClose?: () => void;
  navColor?: string;
  enableMagazine?: boolean;
  /** When provided, tapping a card calls this instead of flipping */
  onCardPress?: (place: PlaceItem, index: number) => void;
}

/* ═══════════════ Component ═══════════════ */

export function CardStackCarousel({
  places,
  initialIndex = 0,
  favorites,
  onToggleFav,
  cardWidth,
  cardHeight,
  overlay = false,
  onClose,
  navColor,
  enableMagazine = false,
  onCardPress,
}: CardStackCarouselProps) {
  const CARD_W = cardWidth ?? SCREEN_WIDTH - 48;
  const CARD_H = cardHeight ?? CARD_W * 1.3;

  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [imgIdx, setImgIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [phase, setPhase] = useState<'card' | 'magazine'>('card');
  const isAnimating = useRef(false);
  const clearAnimating = useCallback(() => { isAnimating.current = false; }, []);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefetch all place images with expo-image caching
  useEffect(() => {
    const urls = places.flatMap((p) => [p.image, ...(p.images ?? [])]);
    Image.prefetch(urls);
  }, [places]);

  // Magazine phase timer — after 5s idle, switch to magazine
  const resetPhaseTimer = useCallback(() => {
    if (!enableMagazine) return;
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    setPhase('card');
    phaseTimer.current = setTimeout(() => setPhase('magazine'), MAGAZINE_DELAY);
  }, [enableMagazine]);

  useEffect(() => {
    if (enableMagazine) {
      resetPhaseTimer();
    }
    return () => { if (phaseTimer.current) clearTimeout(phaseTimer.current); };
  }, [enableMagazine]);

  // ── Shuffle animation values ──
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  // ── Flip animation ──
  const flipRotation = useSharedValue(0);
  const isPastHalf = useDerivedValue(() => flipRotation.value > 90);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipRotation.value, [0, 180], [0, 180])}deg` }],
    opacity: isPastHalf.value ? 0 : 1,
    zIndex: isPastHalf.value ? 0 : 1,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipRotation.value, [0, 180], [180, 360])}deg` }],
    opacity: isPastHalf.value ? 1 : 0,
    zIndex: isPastHalf.value ? 1 : 0,
  }));

  const toggleFlip = useCallback(() => {
    const next = !isFlipped;
    setIsFlipped(next);
    flipRotation.value = withSpring(next ? 180 : 0, FLIP_SPRING);
  }, [isFlipped]);

  const resetFlip = useCallback(() => {
    setIsFlipped(false);
    flipRotation.value = withTiming(0, { duration: 0 });
  }, []);

  // ── Shuffle transition ──
  const animateTransition = useCallback((direction: number, callback: () => void) => {
    isAnimating.current = true;
    resetFlip();

    translateX.value = withTiming(direction > 0 ? -180 : 180, { duration: 150, easing: Easing.in(Easing.quad) });
    translateY.value = withTiming(-30, { duration: 150, easing: Easing.in(Easing.quad) });
    rotate.value = withTiming(direction > 0 ? -10 : 10, { duration: 150, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(0.88, { duration: 150, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) }, () => {
      translateX.value = direction > 0 ? 150 : -150;
      translateY.value = -15;
      rotate.value = direction > 0 ? 8 : -8;
      scale.value = 0.92;
      opacity.value = 0;

      runOnJS(callback)();

      opacity.value = withTiming(1, { duration: 100 });
      translateX.value = withSpring(0, SPRING_IN);
      translateY.value = withSpring(0, SPRING_IN);
      rotate.value = withSpring(0, SPRING_IN);
      scale.value = withSpring(1, SPRING_IN, () => {
        runOnJS(clearAnimating)();
      });
    });
  }, [resetFlip]);

  const place = places[currentIdx];
  const prevIdx = currentIdx === 0 ? places.length - 1 : currentIdx - 1;
  const nextIdx = (currentIdx + 1) % places.length;
  const isFav = place ? favorites.includes(place.id) : false;
  const images = place?.images?.length ? place.images : [place?.image];

  // Peek cards — positioned from screen edges so they're always visible
  const PEEK_W = CARD_W * 0.55;
  const PEEK_H = CARD_H * 0.8;
  const PEEK_EDGE = 8; // px from screen edge

  const goNext = useCallback(() => {
    resetPhaseTimer();
    animateTransition(1, () => {
      setCurrentIdx((i) => (i + 1) % places.length);
      setImgIdx(0);
    });
  }, [places.length, animateTransition, resetPhaseTimer]);

  const goPrev = useCallback(() => {
    resetPhaseTimer();
    animateTransition(-1, () => {
      setCurrentIdx((i) => (i === 0 ? places.length - 1 : i - 1));
      setImgIdx(0);
    });
  }, [places.length, animateTransition, resetPhaseTimer]);

  // Swipe gesture — disabled when flipped
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD) goNext();
        else if (gs.dx > SWIPE_THRESHOLD) goPrev();
      },
    })
  ).current;

  if (!place) return null;

  const navTextColor = overlay ? 'rgba(255,255,255,0.7)' : (navColor ?? '#6b7280');
  const navBtnBg = overlay ? 'rgba(255,255,255,0.9)' : '#fff';
  const navBtnBorder = overlay ? 'transparent' : '#e5e7eb';
  const navIconColor = '#333';

  // Magazine width — slightly wider than card for editorial feel
  const magW = Math.min(SCREEN_WIDTH - 32, CARD_W * 1.15);
  const magH = CARD_H;

  const content = (
    <View style={{ alignItems: 'center', paddingTop: 12 }}>
      {phase === 'card' ? (
        /* ── Card phase — tinder stack ── */
        <View style={{ width: SCREEN_WIDTH, height: CARD_H, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          {/* Left peek card */}
          <Pressable
            onPress={goPrev}
            style={{
              position: 'absolute',
              left: PEEK_EDGE,
              top: (CARD_H - PEEK_H) / 2,
              width: PEEK_W, height: PEEK_H,
              borderRadius: 20, overflow: 'hidden',
              opacity: 0.35, zIndex: 1,
              transform: [{ rotate: '-6deg' }],
            }}
          >
            <Image source={places[prevIdx]?.image} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
          </Pressable>

          {/* Right peek card */}
          <Pressable
            onPress={goNext}
            style={{
              position: 'absolute',
              right: PEEK_EDGE,
              top: (CARD_H - PEEK_H) / 2,
              width: PEEK_W, height: PEEK_H,
              borderRadius: 20, overflow: 'hidden',
              opacity: 0.35, zIndex: 1,
              transform: [{ rotate: '6deg' }],
            }}
          >
            <Image source={places[nextIdx]?.image} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
          </Pressable>

          {/* Active card — shuffle + flip */}
          <Animated.View
            {...(isFlipped ? {} : panResponder.panHandlers)}
            style={[
              {
                width: CARD_W, height: CARD_H,
                borderRadius: 20, overflow: 'hidden',
                zIndex: 5,
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
              },
              animatedCardStyle,
            ]}
          >
            {/* Heart button — always above flip */}
            <Pressable
              onPress={() => onToggleFav(place.id)}
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 30,
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.9)',
                borderWidth: isFav ? 1 : 0, borderColor: 'rgba(239,68,68,0.5)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={16} color={isFav ? '#ef4444' : '#9ca3af'} />
            </Pressable>

            {/* Front face */}
            <Animated.View style={[{ position: 'absolute', width: CARD_W, height: CARD_H }, frontStyle]}>
              <Pressable onPress={onCardPress ? () => onCardPress(place, currentIdx) : toggleFlip} style={{ flex: 1 }}>
                <Image
                  source={images[imgIdx]}
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  locations={[0.35, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }}
                />

                {/* Tap zones for image nav */}
                {images.length > 1 && (
                  <>
                    <Pressable
                      onPress={() => setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1))}
                      style={{ position: 'absolute', left: 0, top: 0, width: '33%', height: '66%', zIndex: 15 }}
                    />
                    <Pressable
                      onPress={() => setImgIdx((i) => (i + 1) % images.length)}
                      style={{ position: 'absolute', right: 0, top: 0, width: '33%', height: '66%', zIndex: 15 }}
                    />
                  </>
                )}

                {/* Bottom content */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
                  <Text style={{
                    fontSize: 9, fontWeight: '700', color: '#7dd3fc',
                    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6,
                  }}>
                    {place.type}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', flex: 1 }} numberOfLines={1}>
                      {place.name}
                    </Text>
                    {place.rating != null && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
                      }}>
                        <FontAwesome name="star" size={11} color="#facc15" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{place.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                  {place.tagline && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <FontAwesome name="map-marker" size={12} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>{place.tagline}</Text>
                    </View>
                  )}
                  {place.description && (
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 }} numberOfLines={2}>
                      {place.description}
                    </Text>
                  )}

                  {/* Image dots */}
                  {images.length > 1 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      {images.slice(0, 5).map((_, i) => (
                        <Pressable
                          key={i}
                          onPress={() => setImgIdx(i)}
                          style={{
                            width: i === imgIdx ? 18 : 6, height: 6, borderRadius: 3,
                            backgroundColor: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Flip hint */}
                <View style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 25 }}>
                  <FontAwesome name="repeat" size={12} color="rgba(255,255,255,0.4)" />
                </View>
              </Pressable>
            </Animated.View>

            {/* Back face */}
            <Animated.View style={[{ position: 'absolute', width: CARD_W, height: CARD_H }, backStyle]}>
              <CardBack
                place={place}
                isFav={isFav}
                onToggleFav={() => onToggleFav(place.id)}
                onFlip={toggleFlip}
                onSearchTag={() => {}}
                width={CARD_W}
                height={CARD_H}
              />
            </Animated.View>
          </Animated.View>
        </View>
      ) : (
        /* ── Magazine phase — editorial curtain ── */
        <View style={{ width: SCREEN_WIDTH, height: magH, alignItems: 'center', justifyContent: 'center' }}>
          <MagazineCurtain
            place={place}
            totalCount={places.length}
            placeIndex={currentIdx}
            isFav={isFav}
            onToggleFav={() => onToggleFav(place.id)}
            width={magW}
            height={magH}
          />
        </View>
      )}

      {/* Navigation row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 20, marginTop: 16,
      }}>
        <Pressable
          onPress={goPrev}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: navBtnBg,
            borderWidth: overlay ? 0 : 1, borderColor: navBtnBorder,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
          }}
        >
          <FontAwesome name="chevron-left" size={14} color={navIconColor} />
        </Pressable>
        <Text style={{ fontSize: 14, color: navTextColor, fontVariant: ['tabular-nums'] }}>
          {currentIdx + 1} / {places.length}
        </Text>
        <Pressable
          onPress={goNext}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: navBtnBg,
            borderWidth: overlay ? 0 : 1, borderColor: navBtnBorder,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
          }}
        >
          <FontAwesome name="chevron-right" size={14} color={navIconColor} />
        </Pressable>
      </View>
    </View>
  );

  if (!overlay) return content;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100,
        justifyContent: 'center', alignItems: 'center',
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute', top: 56, right: 20, zIndex: 110,
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.9)',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
        }}
      >
        <FontAwesome name="times" size={16} color="#333" />
      </Pressable>

      {content}
    </Animated.View>
  );
}

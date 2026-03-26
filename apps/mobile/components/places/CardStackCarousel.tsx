import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, Dimensions, PanResponder, Modal,
  Animated as RNAnimated, Platform, UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PlaceItem } from '@travyl/shared';
import { MagazineCurtain } from './MagazineCurtain';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const MAP_DEFAULT = 200;
const MAP_MIN = 120;

const SPRING_IN = { damping: 28, stiffness: 400, mass: 0.5 };

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
}: CardStackCarouselProps) {
  const insets = useSafeAreaInsets();
  const CARD_W = cardWidth ?? SCREEN_WIDTH - 48;
  const CARD_H = cardHeight ?? CARD_W * 1.3;

  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [showMap, setShowMap] = useState(false);
  const [selfOverlay, setSelfOverlay] = useState(false); // promote to overlay for map
  const mapRef = useRef<MapView>(null);
  const isAnimating = useRef(false);
  const clearAnimating = useCallback(() => { isAnimating.current = false; }, []);
  const showMapRef = useRef(showMap);
  showMapRef.current = showMap;

  // Magazine dimensions
  const magW = Math.min(SCREEN_WIDTH - 32, CARD_W * 1.15);
  const magH = CARD_H;

  // ── Map height animation ──
  const mapHeight = useRef(new RNAnimated.Value(0)).current;
  const mapHRef = useRef(0);
  const isMapAnimating = useRef(false);

  // Max map height — in overlay, allow full screen (just handle visible)
  const mapMax = overlay
    ? SCREEN_H - insets.top - insets.bottom - 80
    : Math.min(SCREEN_H * 0.5, 400);
  const mapMaxRef = useRef(mapMax);
  mapMaxRef.current = mapMax;

  const toggleMap = useCallback(() => {
    if (isMapAnimating.current) return;
    isMapAnimating.current = true;

    if (showMapRef.current) {
      // Closing — shrink then unmount
      RNAnimated.timing(mapHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        setShowMap(false);
        mapHRef.current = 0;
        isMapAnimating.current = false;
      });
    } else {
      // Opening — mount then spring open
      setShowMap(true);
      mapHRef.current = MAP_DEFAULT;
      mapHeight.setValue(0);
      RNAnimated.spring(mapHeight, {
        toValue: MAP_DEFAULT,
        tension: 50, friction: 10,
        useNativeDriver: false,
      }).start(() => {
        isMapAnimating.current = false;
      });
    }
  }, []);

  // Center map on current place when card changes or map opens
  useEffect(() => {
    const p = places[currentIdx];
    const shouldCenter = showMap
      ? p?.latitude != null && p?.longitude != null
      : showMapRef.current && p?.latitude != null && p?.longitude != null;
    if (!shouldCenter) return;
    const delay = showMap ? 400 : 200;
    const id = setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude: p!.latitude!, longitude: p!.longitude!,
        latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 400);
    }, delay);
    return () => clearTimeout(id);
  }, [currentIdx, showMap]);

  // Prefetch images
  useEffect(() => {
    const urls = places.flatMap((p) => [p.image, ...(p.images ?? [])]);
    Image.prefetch(urls);
  }, [places]);

  // ── Shuffle animation ──
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

  const animateTransition = useCallback((direction: number, callback: () => void) => {
    isAnimating.current = true;
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
  }, []);

  const place = places[currentIdx];
  const isFav = place ? favorites.includes(place.id) : false;

  const goNext = useCallback(() => {
    animateTransition(1, () => setCurrentIdx((i) => (i + 1) % places.length));
  }, [places.length, animateTransition]);

  const goPrev = useCallback(() => {
    animateTransition(-1, () => setCurrentIdx((i) => (i === 0 ? places.length - 1 : i - 1)));
  }, [places.length, animateTransition]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goPrevRef = useRef(goPrev);
  goPrevRef.current = goPrev;

  // Combined pan: horizontal swipe (navigate) + vertical drag (resize map)
  const gestureDir = useRef<'h' | 'v' | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy)) {
          gestureDir.current = 'h';
          return true;
        }
        if (showMapRef.current && Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5) {
          gestureDir.current = 'v';
          return true;
        }
        return false;
      },
      onPanResponderMove: (_, gs) => {
        if (gestureDir.current === 'v') {
          const newH = Math.max(MAP_MIN, Math.min(mapMaxRef.current, mapHRef.current + gs.dy));
          mapHeight.setValue(newH);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gestureDir.current === 'v') {
          const clamped = Math.max(MAP_MIN, Math.min(mapMaxRef.current, mapHRef.current + gs.dy));
          const max = mapMaxRef.current;
          const wasFullScreen = mapHRef.current >= max * 0.95;
          const isFastDown = gs.vy > 0.5 && gs.dy > 20;
          const isFastUp = gs.vy < -0.5 && gs.dy < -20;

          let snapTo = clamped;
          if (clamped > max * 0.75 || isFastDown) {
            snapTo = max;
          } else if (isFastUp && wasFullScreen) {
            snapTo = MAP_DEFAULT;
          }

          RNAnimated.spring(mapHeight, {
            toValue: snapTo,
            tension: 65, friction: 11,
            useNativeDriver: false,
          }).start();
          mapHRef.current = snapTo;
        } else if (gestureDir.current === 'h') {
          if (gs.dx < -SWIPE_THRESHOLD) goNextRef.current();
          else if (gs.dx > SWIPE_THRESHOLD) goPrevRef.current();
        }
        gestureDir.current = null;
      },
    })
  ).current;

  if (!place) return null;

  const navTextColor = overlay ? 'rgba(255,255,255,0.7)' : (navColor ?? '#6b7280');
  const navBtnBg = overlay ? 'rgba(255,255,255,0.9)' : '#fff';
  const navBtnBorder = overlay ? 'transparent' : '#e5e7eb';
  const navIconColor = '#333';
  const hasCoords = place.latitude != null && place.longitude != null;

  /* ── Shared sub-views ── */

  const navRow = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 20, marginTop: 12, paddingBottom: 4,
    }}>
      <Pressable onPress={goPrev} style={{
        width: 40, height: 40, borderRadius: 20, backgroundColor: navBtnBg,
        borderWidth: overlay ? 0 : 1, borderColor: navBtnBorder,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
      }}>
        <FontAwesome name="chevron-left" size={14} color={navIconColor} />
      </Pressable>
      <Text style={{ fontSize: 14, color: navTextColor, fontVariant: ['tabular-nums'] }}>
        {currentIdx + 1} / {places.length}
      </Text>
      <Pressable onPress={goNext} style={{
        width: 40, height: 40, borderRadius: 20, backgroundColor: navBtnBg,
        borderWidth: overlay ? 0 : 1, borderColor: navBtnBorder,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
      }}>
        <FontAwesome name="chevron-right" size={14} color={navIconColor} />
      </Pressable>
    </View>
  );

  const magazineCard = (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        { width: SCREEN_WIDTH, height: magH, alignItems: 'center', justifyContent: 'center' },
        animatedCardStyle,
      ]}
    >
      <MagazineCurtain
        place={place}
        isFav={isFav}
        onToggleFav={() => onToggleFav(place.id)}
        onMapPress={!showMap && hasCoords ? (overlay ? toggleMap : () => setSelfOverlay(true)) : undefined}
        width={magW}
        height={magH}
      />
    </Animated.View>
  );

  const mapSection = showMap && hasCoords && (
    <>
      <RNAnimated.View style={{
        height: mapHeight,
        marginHorizontal: 0,
        borderRadius: 0, overflow: 'hidden',
      }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: place.latitude!, longitude: place.longitude!,
            latitudeDelta: 0.02, longitudeDelta: 0.02,
          }}
          scrollEnabled zoomEnabled rotateEnabled={false} pitchEnabled={false}
        >
          <Marker coordinate={{ latitude: place.latitude!, longitude: place.longitude! }} title={place.name} />
        </MapView>

        {/* Place info pill */}
        <View style={{
          position: 'absolute', bottom: 10, left: 10, right: 10,
          backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>{place.name}</Text>
          {place.tagline ? <Text style={{ fontSize: 11, color: '#666', marginTop: 1 }}>{place.tagline}</Text> : null}
          {/* Rating + reviews */}
          {place.rating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <FontAwesome name="star" size={10} color="#fbbf24" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#333' }}>{place.rating.toFixed(1)}</Text>
              {place.reviewCount ? <Text style={{ fontSize: 10, color: '#999' }}>({place.reviewCount.toLocaleString()})</Text> : null}
              {place.hours ? <Text style={{ fontSize: 10, color: '#10b981', marginLeft: 6 }}>{place.hours}</Text> : null}
            </View>
          )}
          {/* Address */}
          {place.address ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <FontAwesome name="map-marker" size={10} color="#999" />
              <Text style={{ fontSize: 10, color: '#666', flex: 1 }} numberOfLines={1}>{place.address}</Text>
            </View>
          ) : null}
          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {place.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#555' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </RNAnimated.View>

      {/* Map toolbar — between map and card */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 12, paddingVertical: 8, marginHorizontal: 16,
      }}>
        <Pressable onPress={() => {
          if (place.latitude != null && place.longitude != null) {
            mapRef.current?.animateToRegion({
              latitude: place.latitude, longitude: place.longitude,
              latitudeDelta: 0.02, longitudeDelta: 0.02,
            }, 400);
          }
        }} style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: overlay ? 'rgba(255,255,255,0.15)' : '#f3f4f6',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <FontAwesome name="crosshairs" size={13} color={overlay ? '#fff' : '#666'} />
        </Pressable>

        <Pressable onPress={toggleMap} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
          backgroundColor: overlay ? 'rgba(255,255,255,0.15)' : '#f3f4f6',
        }}>
          <FontAwesome name="map" size={11} color={overlay ? '#fff' : '#666'} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: overlay ? '#fff' : '#666' }}>{showMap ? 'Hide Map' : 'Show Map'}</Text>
        </Pressable>
      </View>
    </>
  );

  /* ── Non-overlay: inline ── */
  if (!overlay) {
    return (
      <>
        <View style={{ alignItems: 'center', paddingTop: 12 }}>
          {magazineCard}
          {navRow}
        </View>
        {/* When map is requested from inline, open full-screen overlay */}
        <Modal visible={selfOverlay} transparent animationType="fade" statusBarTranslucent>
          <CardStackCarousel
            places={places}
            initialIndex={currentIdx}
            favorites={favorites}
            onToggleFav={onToggleFav}
            overlay
            onClose={() => setSelfOverlay(false)}
          />
        </Modal>
      </>
    );
  }

  /* ── Overlay: full screen, card flush at bottom ── */
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
    >
      {/* Tap dark area to close */}
      <Pressable onPress={onClose} style={{ height: insets.top + 20 }} />

      {/* Content — map flush at top, card below */}
      <View style={{
        flex: 1,
        paddingBottom: insets.bottom,
        overflow: 'hidden',
      }}>
        {showMap ? (
          <>
            {mapSection}
            {magazineCard}
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            {magazineCard}
            {navRow}
          </View>
        )}
      </View>
    </Animated.View>
    </Modal>
  );
}

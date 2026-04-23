import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, Dimensions, PanResponder, Modal,
  Animated as RNAnimated, Platform, UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
// Conditionally import react-native-maps (crashes on web)
let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {}
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PlaceItem } from '@travyl/shared';
import { MagazineCurtain } from './MagazineCurtain';
import { AddToTripSheet } from '@/components/AddToTripSheet';

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
  onAddToTrip?: (place: PlaceItem) => void;
  /** Pass the full sheet state + actions to render inside the modal */
  tripSheet?: {
    state: any;
    selectTrip: (id: string) => void;
    selectDay: (label: string, index: number) => void;
    dismiss: () => void;
    createTrip: () => void;
  };
  onIndexChange?: (index: number) => void;
  cardWidth?: number;
  cardHeight?: number;
  overlay?: boolean;
  onClose?: () => void;
  navColor?: string;
  hideArrows?: boolean;
  showMapBg?: boolean;
}

/* ═══════════════ Component ═══════════════ */

export function CardStackCarousel({
  places,
  initialIndex = 0,
  favorites,
  onToggleFav,
  onAddToTrip,
  tripSheet,
  onIndexChange,
  cardWidth,
  cardHeight,
  overlay = false,
  onClose,
  navColor,
  hideArrows = false,
  showMapBg = false,
}: CardStackCarouselProps) {
  const insets = useSafeAreaInsets();
  const CARD_W = cardWidth ?? SCREEN_WIDTH - 24;
  const CARD_H = cardHeight ?? CARD_W * 1.25;

  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [showMap, setShowMap] = useState(showMapBg);
  const [selfOverlay, setSelfOverlay] = useState(false); // promote to overlay for map
  const mapRef = useRef<any>(null);
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
    const hasCoords = p?.latitude != null && p?.longitude != null;
    if (!hasCoords) return;
    // In overlay mode, map is always visible; in inline mode, only when showMap is true
    const shouldCenter = overlay || showMap || showMapRef.current;
    if (!shouldCenter) return;
    const delay = showMap ? 400 : 200;
    const id = setTimeout(() => {
      // Offset center south so pin appears in top 25% (above the card)
      const latDelta = 0.025;
      mapRef.current?.animateToRegion({
        latitude: p!.latitude! - latDelta * 0.35, longitude: p!.longitude!,
        latitudeDelta: latDelta, longitudeDelta: latDelta,
      }, 400);
    }, delay);
    return () => clearTimeout(id);
  }, [currentIdx, showMap, overlay]);

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
    animateTransition(1, () => {
      setCurrentIdx((i) => {
        const next = (i + 1) % places.length;
        setTimeout(() => onIndexChange?.(next), 0);
        return next;
      });
    });
  }, [places.length, animateTransition, onIndexChange]);

  const goPrev = useCallback(() => {
    animateTransition(-1, () => {
      setCurrentIdx((i) => {
        const next = i === 0 ? places.length - 1 : i - 1;
        setTimeout(() => onIndexChange?.(next), 0);
        return next;
      });
    });
  }, [places.length, animateTransition, onIndexChange]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goPrevRef = useRef(goPrev);
  goPrevRef.current = goPrev;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
      gap: 14, marginTop: 8, paddingBottom: 0,
    }}>
      {/* Map toggle — only in overlay mode */}
      {overlay && hasCoords && (
        <Pressable onPress={toggleMap} style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: showMap ? 'rgba(255,255,255,0.3)' : navBtnBg,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
        }}>
          <FontAwesome name="map" size={13} color={showMap ? '#fff' : navIconColor} />
        </Pressable>
      )}

      {!hideArrows && (
        <Pressable onPress={goPrev} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: navBtnBg,
          borderWidth: overlay ? 0 : 1, borderColor: navBtnBorder,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
        }}>
          <FontAwesome name="chevron-left" size={14} color={navIconColor} />
        </Pressable>
      )}
      <Text style={{ fontSize: 14, color: navTextColor, fontVariant: ['tabular-nums'] }}>
        {currentIdx + 1} / {places.length}
      </Text>
      {!hideArrows && (
        <Pressable onPress={goNext} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: navBtnBg,
          borderWidth: overlay ? 0 : 1, borderColor: navBtnBorder,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
        }}>
          <FontAwesome name="chevron-right" size={14} color={navIconColor} />
        </Pressable>
      )}

      {/* Close */}
      {overlay && onClose && (
        <Pressable onPress={onClose} hitSlop={12} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4,
        }}>
          <FontAwesome name="times" size={16} color="#fff" />
        </Pressable>
      )}
    </View>
  );

  const magazineCard = (
    <Animated.View
      {...(showMap ? {} : panResponder.panHandlers)}
      style={[
        { width: SCREEN_WIDTH, height: showMap ? magH * 0.6 : magH, alignItems: 'center', justifyContent: 'center' },
        showMap ? {} : animatedCardStyle,
      ]}
    >
      <MagazineCurtain
        place={place}
        isFav={isFav}
        onToggleFav={() => onToggleFav(place.id)}
        onAddToTrip={onAddToTrip}
        onMapPress={!showMap && hasCoords ? (overlay ? toggleMap : () => setSelfOverlay(true)) : undefined}
        width={magW}
        height={magH}
      />
    </Animated.View>
  );

  // Old mapSection removed — map is now full-screen background in overlay mode

  /* ── Non-overlay: inline ── */
  if (!overlay) {
    return (
      <>
        <View style={{ alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
          {magazineCard}
          {navRow}
        </View>
        {/* When map is requested from inline, open full-screen overlay.
            No outer Modal needed — the overlay CardStackCarousel renders its own. */}
        {selfOverlay && (
          <CardStackCarousel
            places={places}
            initialIndex={currentIdx}
            favorites={favorites}
            onToggleFav={onToggleFav}
            onAddToTrip={onAddToTrip}
            tripSheet={tripSheet}
            onIndexChange={onIndexChange}
            overlay
            onClose={() => setSelfOverlay(false)}
          />
        )}
      </>
    );
  }

  /* ── Overlay: Apple Maps-style — map behind, card as bottom sheet ── */

  // Sheet position — lower Y = card shorter (more map), higher Y = card taller (more content)
  const SHEET_TOP = insets.top + 50;           // card almost full screen
  const SHEET_MID = SCREEN_H * 0.25;         // mid — large card
  const SHEET_BOTTOM = SCREEN_H * 0.40;      // default start — card fills bottom 60%
  const sheetY = useRef(new RNAnimated.Value(SHEET_BOTTOM)).current;
  const sheetYRef = useRef(SHEET_BOTTOM);

  // Combined gesture: vertical drags on the handle/header resize the sheet,
  // horizontal swipes on the card navigate between places
  const gestureDirRef = useRef<'v' | 'h' | null>(null);
  const combinedPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (Math.abs(gs.dy) > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2) {
          gestureDirRef.current = 'v';
          return true;
        }
        if (Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2) {
          gestureDirRef.current = 'h';
          return true;
        }
        return false;
      },
      onPanResponderMove: (_, gs) => {
        if (gestureDirRef.current === 'v') {
          // Allow dragging from SHEET_TOP all the way to off-screen (SCREEN_H)
          const newY = Math.max(SHEET_TOP, sheetYRef.current + gs.dy);
          sheetY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gestureDirRef.current === 'v') {
          const newY = Math.max(SHEET_TOP, sheetYRef.current + gs.dy);

          // Dismiss: dragged past 75% of screen or fast flick down
          if (newY > SCREEN_H * 0.75 || (gs.vy > 1.5 && newY > SHEET_BOTTOM)) {
            RNAnimated.timing(sheetY, {
              toValue: SCREEN_H, duration: 200, useNativeDriver: false,
            }).start(() => onCloseRef.current?.());
            return;
          }

          // Snap to nearest position
          let snapTo = SHEET_MID;
          if (gs.vy < -0.5 || newY < (SHEET_TOP + SHEET_MID) / 2) snapTo = SHEET_TOP;
          else if (gs.vy > 0.5 || newY > (SHEET_MID + SHEET_BOTTOM) / 2) snapTo = SHEET_BOTTOM;

          RNAnimated.spring(sheetY, {
            toValue: snapTo, tension: 65, friction: 11, useNativeDriver: false,
          }).start();
          sheetYRef.current = snapTo;
        } else if (gestureDirRef.current === 'h') {
          if (gs.dx < -SWIPE_THRESHOLD) goNextRef.current();
          else if (gs.dx > SWIPE_THRESHOLD) goPrevRef.current();
        }
        gestureDirRef.current = null;
      },
    })
  ).current;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* ── Map background (fills entire screen) ── */}
        {hasCoords && Platform.OS !== 'web' ? (
          <MapView
            ref={mapRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            initialRegion={{
              latitude: place.latitude! - 0.018, longitude: place.longitude!,
              latitudeDelta: 0.03, longitudeDelta: 0.03,
            }}
            scrollEnabled zoomEnabled rotateEnabled={false} pitchEnabled={false}
          >
            <Marker coordinate={{ latitude: place.latitude!, longitude: place.longitude! }} title={place.name} />
          </MapView>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />
        )}

        {/* Close button floating on map */}
        {onClose && (
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              position: 'absolute', top: insets.top + 10, left: 16, zIndex: 20,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
            }}
          >
            <FontAwesome name="arrow-left" size={16} color="#fff" />
          </Pressable>
        )}

        {/* ── Bottom sheet — drags up/down to show/hide map ── */}
        <RNAnimated.View
          {...combinedPan.panHandlers}
          style={{
            position: 'absolute',
            top: sheetY,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
          }}
        >
          {/* Drag handle */}
          <View style={{
            alignItems: 'center', paddingTop: 10, paddingBottom: 6,
          }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          </View>

          {/* Card fills remaining space below handle */}
          <View style={{ flex: 1, alignItems: 'center', paddingTop: 2 }}>
            <Animated.View style={[
              { width: SCREEN_WIDTH - 8, flex: 1 },
              animatedCardStyle,
            ]}>
              <View style={{ flex: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
                <MagazineCurtain
                  place={place}
                  isFav={isFav}
                  onToggleFav={() => onToggleFav(place.id)}
                  onAddToTrip={onAddToTrip}
                  onClose={onClose}
                  onMapPress={hasCoords ? toggleMap : undefined}
                  width={SCREEN_WIDTH - 8}
                  height={SCREEN_H - sheetYRef.current - insets.bottom - 20}
                />
              </View>
            </Animated.View>
          </View>
        </RNAnimated.View>

        {/* AddToTrip sheet — rendered inside modal so it appears on top */}
        {tripSheet && (
          <AddToTripSheet
            state={tripSheet.state}
            onSelectTrip={tripSheet.selectTrip}
            onSelectDay={tripSheet.selectDay}
            onDismiss={tripSheet.dismiss}
            onCreateTrip={tripSheet.createTrip}
          />
        )}
      </View>
    </Modal>
  );
}

import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MapView, { Marker } from 'react-native-maps';
import { Navy, type PlaceItem, useSimilarPlaces } from '@travyl/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import FlipCard from './FlipCard';
import CardFront from './CardFront';
import CardBack from './CardBack';
import SwipeableDeck from './SwipeableDeck';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_H_FRONT = 400;
const CARD_H_BACK = 540;

interface PlaceDetailModalProps {
  place: PlaceItem | null;
  allPlaces: PlaceItem[];
  onClose: () => void;
  favorites: string[];
  onToggleFav: (id: string) => void;
  onSearchTag?: (query: string) => void;
  renderFooter?: (currentPlace: PlaceItem) => React.ReactNode;
}

const PlaceDetailModal = memo(function PlaceDetailModal({
  place,
  allPlaces,
  onClose,
  favorites,
  onToggleFav,
  onSearchTag,
  renderFooter,
}: PlaceDetailModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const SCREEN_H = Dimensions.get('window').height;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || (gs.dy > 30 && gs.vy > 0.5)) {
          onCloseRef.current();
        }
      },
    }),
  ).current;

  const similarPlaces = useSimilarPlaces(place, allPlaces);
  const deckPlaces = useMemo(
    () => (place ? [place, ...similarPlaces] : []),
    [place, similarPlaces],
  );
  const currentPlace = deckPlaces[deckIndex] ?? place;

  const currentImages = useMemo(() => {
    if (!currentPlace) return [''];
    return currentPlace.images && currentPlace.images.length > 0
      ? currentPlace.images
      : [currentPlace.image];
  }, [currentPlace?.id]);

  // Auto-advance images (only when showing front)
  useEffect(() => {
    if (isFlipped || currentImages.length <= 1) return;
    const timer = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % currentImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isFlipped, currentImages.length, deckIndex]);

  // Reset image index when deck card changes
  useEffect(() => { setImageIndex(0); }, [deckIndex]);

  // Map ref — recenter when place changes
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    if (currentPlace?.latitude != null && currentPlace?.longitude != null) {
      mapRef.current?.animateToRegion({
        latitude: currentPlace.latitude,
        longitude: currentPlace.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 400);
    }
  }, [currentPlace?.id]);

  // Dynamic card height — expand when flipped
  const cardH = isFlipped ? CARD_H_BACK : CARD_H_FRONT;

  const flipCard = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFlipped((v) => !v);
  }, []);

  // Animations: map from top, card from bottom
  const mapSlide = useRef(new Animated.Value(-250)).current;
  const contentSlide = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsFlipped(false);
    setDeckIndex(0);
    setImageIndex(0);
    mapSlide.setValue(-250);
    contentSlide.setValue(600);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(mapSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(contentSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [place?.id]);

  // Reset flip when swiping to a new card
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFlipped(false);
  }, [deckIndex]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(mapSlide, { toValue: -250, duration: 200, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 600, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  if (!place) return null;

  const hasLocation = currentPlace?.latitude != null && currentPlace?.longitude != null;
  const cardW = SCREEN_WIDTH - 32;
  const [showMap, setShowMap] = useState(false);
  const mapPanelSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const toggleMap = useCallback(() => {
    const opening = !showMap;
    setShowMap(opening);
    Animated.spring(mapPanelSlide, {
      toValue: opening ? 0 : SCREEN_WIDTH,
      tension: 65, friction: 11, useNativeDriver: true,
    }).start();
    if (opening && currentPlace?.latitude != null && currentPlace?.longitude != null) {
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: currentPlace.latitude!,
          longitude: currentPlace.longitude!,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 400);
      }, 300);
    }
  }, [showMap, currentPlace]);

  // Reset map panel when place changes
  useEffect(() => {
    setShowMap(false);
    mapPanelSlide.setValue(SCREEN_WIDTH);
  }, [place?.id]);

  return (
    <Modal visible animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Backdrop */}
        <Pressable onPress={handleClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />

        {/* ── Map panel — slides in from the right ── */}
        {hasLocation && (
          <Animated.View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            transform: [{ translateX: mapPanelSlide }],
            zIndex: 15,
          }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: currentPlace.latitude!,
                longitude: currentPlace.longitude!,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{ latitude: currentPlace.latitude!, longitude: currentPlace.longitude! }}
                title={currentPlace.name}
              />
            </MapView>
            {/* Close map button */}
            <Pressable
              onPress={toggleMap}
              style={{
                position: 'absolute', top: insets.top + 8, right: 16,
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.9)',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
              }}
            >
              <FontAwesome name="times" size={15} color="#333" />
            </Pressable>
            {/* Recenter */}
            <Pressable
              onPress={() => {
                if (currentPlace?.latitude != null && currentPlace?.longitude != null) {
                  mapRef.current?.animateToRegion({
                    latitude: currentPlace.latitude,
                    longitude: currentPlace.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }, 400);
                }
              }}
              style={{
                position: 'absolute', top: insets.top + 8, left: 16,
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.9)',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
              }}
            >
              <FontAwesome name="crosshairs" size={15} color="#333" />
            </Pressable>
            {/* Place name pill at bottom */}
            <View style={{
              position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16,
              backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
              paddingHorizontal: 16, paddingVertical: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#333' }}>{currentPlace.name}</Text>
              {currentPlace.tagline ? <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{currentPlace.tagline}</Text> : null}
            </View>
          </Animated.View>
        )}

        {/* ── Card sheet — slides up from bottom ── */}
        <Animated.View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          maxHeight: SCREEN_H - insets.top - 20,
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          transform: [{ translateY: contentSlide }],
          overflow: 'hidden',
        }}>
          {/* Drag handle + map button row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 6, paddingHorizontal: 16 }}>
            <View style={{ flex: 1 }} />
            <View
              {...sheetPanResponder.panHandlers}
              style={{ paddingHorizontal: 20, paddingVertical: 4 }}
            >
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {hasLocation && (
                <Pressable onPress={toggleMap} hitSlop={8} style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <FontAwesome name="map" size={13} color={Navy.DEFAULT} />
                </Pressable>
              )}
            </View>
          </View>
          {/* Close button */}
          <Pressable onPress={handleClose} style={{
            position: 'absolute', top: 10, left: 16, zIndex: 10,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesome name="times" size={13} color={colors.textSecondary} />
          </Pressable>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
            {/* ── Swipeable Flip Card Deck ── */}
            <View style={{ marginHorizontal: 16 }}>
              <SwipeableDeck
                places={deckPlaces}
                initialIndex={0}
                onIndexChange={setDeckIndex}
                cardHeight={cardH}
                renderCard={(p) => (
                  <FlipCard
                    front={
                      <CardFront
                        place={p}
                        isFav={favorites.includes(p.id)}
                        onToggleFav={() => onToggleFav(p.id)}
                        onFlip={flipCard}
                        onMapPress={hasLocation ? toggleMap : undefined}
                        width={cardW}
                        height={CARD_H_FRONT}
                        imageIndex={p.id === currentPlace?.id ? imageIndex : 0}
                      />
                    }
                    back={
                      <CardBack
                        place={p}
                        isFav={favorites.includes(p.id)}
                        onToggleFav={() => onToggleFav(p.id)}
                        onFlip={flipCard}
                        onSearchTag={onSearchTag ?? (() => {})}
                        width={cardW}
                        height={CARD_H_BACK}
                      />
                    }
                    isFlipped={isFlipped}
                    onFlip={flipCard}
                    width={cardW}
                    height={cardH}
                  />
                )}
              />
            </View>

            {/* ── Image navigation — dots + arrows ── */}
            {!isFlipped && currentImages.length > 1 && (
              <View style={{
                flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                paddingTop: 14, paddingBottom: 4, gap: 16,
              }}>
                <Pressable
                  onPress={() => setImageIndex((prev) => prev > 0 ? prev - 1 : currentImages.length - 1)}
                  hitSlop={12}
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: colors.surface,
                    borderWidth: 1, borderColor: colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="chevron-left" size={10} color={colors.textSecondary} />
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {currentImages.map((_, i) => (
                    <Pressable key={i} onPress={() => setImageIndex(i)}>
                      <View style={{
                        width: i === imageIndex ? 16 : 6, height: 6, borderRadius: 3,
                        backgroundColor: i === imageIndex ? Navy.DEFAULT : colors.border,
                      }} />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => setImageIndex((prev) => (prev + 1) % currentImages.length)}
                  hitSlop={12}
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: colors.surface,
                    borderWidth: 1, borderColor: colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="chevron-right" size={10} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* ── Optional footer content ── */}
            {renderFooter && currentPlace && renderFooter(currentPlace)}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

export default PlaceDetailModal;

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dimensions, View, Text, StyleSheet, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { PlaceItem } from '@travyl/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.4;
const FLING_DURATION = 250;

interface SwipeableDeckProps {
  places: PlaceItem[];
  initialIndex?: number;
  renderCard: (place: PlaceItem, index: number) => React.ReactNode;
  onIndexChange?: (index: number) => void;
  cardHeight?: number;
}

export default function SwipeableDeck({
  places,
  initialIndex = 0,
  renderCard,
  onIndexChange,
  cardHeight = 400,
}: SwipeableDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const translateX = useSharedValue(0);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const placesLenRef = useRef(places.length);
  placesLenRef.current = places.length;

  // Notify parent of index changes outside of render
  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  const advanceIndex = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    translateX.value = 0;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only capture clearly horizontal drags (2:1 ratio, 15px+) — lets taps through
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 15,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        const idx = currentIndexRef.current;
        const len = placesLenRef.current;
        // Forward-only deck: only allow swiping left (gs.dx < 0)
        if (gs.dx > 0) return;
        if (idx >= len - 1) return;
        translateX.value = gs.dx;
      },
      onPanResponderRelease: (_, gs) => {
        const idx = currentIndexRef.current;
        const len = placesLenRef.current;

        // Block: right swipe or at the end
        if (gs.dx >= 0 || idx >= len - 1) {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          return;
        }

        const absX = Math.abs(gs.dx);
        const absVx = Math.abs(gs.vx);

        // Trigger swipe: enough distance OR enough velocity
        if (absX > SWIPE_THRESHOLD || absVx > VELOCITY_THRESHOLD) {
          translateX.value = withTiming(
            -SCREEN_WIDTH * 1.5,
            { duration: FLING_DURATION },
            () => {
              runOnJS(advanceIndex)();
            },
          );
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      },
      onPanResponderTerminationRequest: () => false, // Don't let children steal the gesture
    }),
  ).current;

  // Animated style for the top card
  const topCardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-200, 0, 200],
      [-8, 0, 8],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  // Animated style for the next card (behind)
  const nextCardStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);

    const scale = interpolate(
      absX,
      [0, SWIPE_THRESHOLD],
      [0.95, 1],
      Extrapolation.CLAMP,
    );

    const translateYOffset = interpolate(
      absX,
      [0, SWIPE_THRESHOLD],
      [8, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }, { translateY: translateYOffset }],
    };
  });

  if (!places || places.length === 0) {
    return null;
  }

  const hasNextCard = currentIndex + 1 < places.length;

  return (
    <View style={styles.container}>
      {/* Counter pill */}
      <Text style={styles.counterPill}>
        {currentIndex + 1} of {places.length}
      </Text>

      {/* Card stack */}
      <View style={[styles.deckContainer, { height: cardHeight }]}>
        {/* Next card (behind) */}
        {hasNextCard && (
          <Animated.View
            style={[styles.cardWrapper, styles.nextCard, nextCardStyle]}
          >
            {renderCard(places[currentIndex + 1], currentIndex + 1)}
          </Animated.View>
        )}

        {/* Current card (on top) */}
        {currentIndex < places.length && (
          <Animated.View
            style={[styles.cardWrapper, topCardStyle]}
            {...panResponder.panHandlers}
          >
            {renderCard(places[currentIndex], currentIndex)}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  counterPill: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  deckContainer: {
    flex: 1,
    position: 'relative',
  },
  cardWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  nextCard: {
    zIndex: 0,
  },
});

import React, { useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useInspirationCards, getCyclicGradient, Gray } from '@travyl/shared';
import type { InspirationCard } from '@travyl/shared';

const GAP = 10;
const PADDING = 24;

const PLACEHOLDER_CARDS: InspirationCard[] = [
  { id: 'pi-1', title: '', destination: '', image_url: null },
  { id: 'pi-2', title: '', destination: '', image_url: null },
  { id: 'pi-3', title: '', destination: '', image_url: null },
  { id: 'pi-4', title: '', destination: '', image_url: null },
  { id: 'pi-5', title: '', destination: '', image_url: null },
  { id: 'pi-6', title: '', destination: '', image_url: null },
  { id: 'pi-7', title: '', destination: '', image_url: null },
  { id: 'pi-8', title: '', destination: '', image_url: null },
];

interface GetInspiredProps {
  scrollY?: SharedValue<number>;
}

export function GetInspired({ scrollY }: GetInspiredProps) {
  const { width, height: screenH } = useWindowDimensions();
  const cardWidth = (width - PADDING * 2 - GAP) / 2;
  const { data: dbCards } = useInspirationCards();
  const cards = dbCards?.length ? dbCards : PLACEHOLDER_CARDS;

  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: PADDING }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: Gray[900],
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Get{' '}
        <Text style={{ fontStyle: 'italic' }}>Inspired</Text>
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: Gray[500],
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        Explore popular destinations and start travyling.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {cards.map((card, i) => (
          <InspiredCard
            key={card.id}
            card={card}
            index={i}
            cardWidth={cardWidth}
            scrollY={scrollY}
            screenH={screenH}
          />
        ))}
      </View>
    </View>
  );
}

function InspiredCard({
  card,
  index,
  cardWidth,
  scrollY,
  screenH,
}: {
  card: InspirationCard;
  index: number;
  cardWidth: number;
  scrollY?: SharedValue<number>;
  screenH: number;
}) {
  const viewRef = useRef<Animated.View>(null);
  const absoluteY = useSharedValue(99999);
  const pressed = useSharedValue(0);

  const onPressIn = () => {
    pressed.value = withSpring(1, { damping: 12, stiffness: 180 });
  };
  const onPressOut = () => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 200 });
  };

  const onLayout = () => {
    if (!scrollY) return;
    (viewRef.current as any)?.measureInWindow?.(
      (_x: number, y: number) => {
        if (y !== undefined && y !== null) {
          absoluteY.value = y + scrollY.value;
        }
      }
    );
  };

  const animStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1 };

    const trigger = absoluteY.value - screenH + 40 + index * 30;
    const progress = interpolate(
      scrollY.value,
      [trigger, trigger + 120],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: progress,
      transform: [
        { translateY: (1 - progress) * 20 },
        { scale: (0.95 + progress * 0.05) * (1 + pressed.value * 0.06) },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${pressed.value * 0.2})`,
  }));

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        ref={viewRef}
        onLayout={onLayout}
        style={[
          animStyle,
          {
            backgroundColor: getCyclicGradient(index).from,
            width: cardWidth,
            height: 150,
            borderRadius: 14,
            overflow: 'hidden',
            justifyContent: 'flex-end',
            padding: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          },
        ]}
      >
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14 },
            overlayStyle,
          ]}
        />
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
          {card.destination}
        </Text>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, lineHeight: 18 }}>
          {card.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

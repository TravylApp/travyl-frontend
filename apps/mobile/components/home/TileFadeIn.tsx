import React, { useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

interface TileFadeInProps {
  scrollY?: SharedValue<number>;
  containerY: SharedValue<number>;
  screenH: number;
  index: number;
  children: React.ReactNode;
}

export function TileFadeIn({
  scrollY,
  containerY: _containerY,
  screenH,
  index,
  children,
}: TileFadeInProps) {
  const viewRef = useRef<Animated.View>(null);
  const absoluteY = useSharedValue(99999);

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

    const trigger = absoluteY.value - screenH + 80 + index * 40;
    const progress = interpolate(
      scrollY.value,
      [trigger, trigger + 120],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: progress,
      transform: [
        { translateY: (1 - progress) * 24 },
        { scale: 0.94 + progress * 0.06 },
      ],
    };
  });

  return (
    <Animated.View ref={viewRef} style={animStyle} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}

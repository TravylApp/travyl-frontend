import React, { useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  scrollY: SharedValue<number>;
  children: React.ReactNode;
  /** Extra offset before triggering (default 60) */
  threshold?: number;
}

/**
 * Fades in + slides up its children when scrolled into the viewport.
 * Uses measureInWindow to get accurate screen position on layout.
 */
export function FadeInOnScroll({ scrollY, children, threshold = 60 }: Props) {
  const { height: screenH } = useWindowDimensions();
  const viewRef = useRef<Animated.View>(null);
  const viewTop = useSharedValue(99999);

  const onLayout = () => {
    // measureInWindow gives screen-relative Y, add current scrollY for absolute content position
    (viewRef.current as any)?.measureInWindow?.(
      (_x: number, y: number, _w: number, _h: number) => {
        if (y !== undefined && y !== null) {
          viewTop.value = y + scrollY.value;
        }
      }
    );
  };

  const animatedStyle = useAnimatedStyle(() => {
    const trigger = viewTop.value - screenH + threshold;
    const progress = interpolate(
      scrollY.value,
      [trigger, trigger + 140],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 28 }],
    };
  });

  return (
    <Animated.View ref={viewRef} style={animatedStyle} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}

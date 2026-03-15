import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Blue } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const HEIGHT = 140;

/**
 * Animated ocean-to-sand wave using SVG paths — matches the v2 web version.
 * 4 layers: ocean body, shimmer, sand wash, final sand.
 */
export function OceanWave() {
  const { width } = useWindowDimensions();
  const colors = useThemeColors();

  const sandColor = colors.sandBackground;
  const sandLight = colors.sandBorder;

  // Each wave layer gets its own animation driver (0 → 1 → 0 loop)
  const w1 = useSharedValue(0);
  const w2 = useSharedValue(0);
  const w3 = useSharedValue(0);
  const w4 = useSharedValue(0);

  useEffect(() => {
    w1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    w2.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    ));
    w3.value = withDelay(1000, withRepeat(
      withSequence(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    ));
    w4.value = withDelay(1500, withRepeat(
      withSequence(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    ));
  }, []);

  // Helper: interpolate control point Y values between two wave states
  const vb = `0 0 ${width} ${HEIGHT}`;
  const W = width;
  const H = HEIGHT;

  // Ocean body — wavy top edge, fills to bottom
  const oceanProps = useAnimatedProps(() => {
    const t = w1.value;
    const y1 = 30 + t * -8;
    const y2 = 20 + t * 18;
    const y3 = 40 + t * -15;
    const y4 = 25 + t * 10;
    const y5 = 15 + t * 15;
    const y6 = 35 + t * -8;
    return {
      d: `M0,${y1} C${W * 0.17},${y2} ${W * 0.33},${y3} ${W * 0.5},${y4} C${W * 0.67},${y5} ${W * 0.83},${y6} ${W},${y1 - 5 + t * 10} L${W},${H} L0,${H} Z`,
    };
  });

  // Shimmer — thin wavy highlight
  const shimmerProps = useAnimatedProps(() => {
    const t = w2.value;
    const y1 = 50 + t * -6;
    const y2 = 55 + t * 8;
    const y3 = 48 + t * -4;
    return {
      d: `M${W * 0.1},${y1} Q${W * 0.35},${y2} ${W * 0.5},${y1 + 2} Q${W * 0.65},${y3} ${W * 0.9},${y1 - 2 + t * 5}`,
    };
  });

  // Sand wash — semi-transparent sandy wave
  const sandWashProps = useAnimatedProps(() => {
    const t = w3.value;
    const y1 = 78 + t * -7;
    const y2 = 70 + t * 12;
    const y3 = 85 + t * -10;
    const y4 = 72 + t * 8;
    const y5 = 65 + t * 14;
    const y6 = 80 + t * -6;
    return {
      d: `M0,${y1} C${W * 0.17},${y2} ${W * 0.33},${y3} ${W * 0.5},${y4} C${W * 0.67},${y5} ${W * 0.83},${y6} ${W},${y1 + 3 - t * 5} L${W},${H} L0,${H} Z`,
    };
  });

  // Final sand — solid, blends into footer
  const sandProps = useAnimatedProps(() => {
    const t = w4.value;
    const y1 = 108 + t * -5;
    const y2 = 100 + t * 8;
    const y3 = 112 + t * -6;
    const y4 = 103 + t * 7;
    const y5 = 97 + t * 9;
    const y6 = 110 + t * -4;
    return {
      d: `M0,${y1} C${W * 0.17},${y2} ${W * 0.33},${y3} ${W * 0.5},${y4} C${W * 0.67},${y5} ${W * 0.83},${y6} ${W},${y1 + 2 - t * 4} L${W},${H} L0,${H} Z`,
    };
  });

  return (
    <View style={{ height: HEIGHT, marginBottom: -1 }}>
      <Svg width={width} height={HEIGHT} viewBox={vb}>
        <Defs>
          <LinearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Blue[500]} />
            <Stop offset="1" stopColor={Blue[600]} />
          </LinearGradient>
        </Defs>

        {/* Ocean body */}
        <AnimatedPath animatedProps={oceanProps} fill="url(#oceanGrad)" />

        {/* Shimmer */}
        <AnimatedPath
          animatedProps={shimmerProps}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* Sand wash */}
        <AnimatedPath animatedProps={sandWashProps} fill={sandLight} opacity={0.4} />

        {/* Final sand */}
        <AnimatedPath animatedProps={sandProps} fill={sandColor} />
      </Svg>
    </View>
  );
}

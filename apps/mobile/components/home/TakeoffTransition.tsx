import { useState, useEffect, useCallback } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Blue, TAKEOFF_LOADING_MESSAGES } from '@travyl/shared';
import { PaperPlane } from './PaperPlane';

// ─── Timing ────────────────────────────────────────────────────
const PASS1_DUR = 600;
const GAP_DUR = 200;
const PASS2_DUR = 1600;
const FLIGHT_TOTAL = PASS1_DUR + GAP_DUR + PASS2_DUR; // 2400
const LOADING_START = 2600;
const ANIMATION_END = 4600;
const TRAIL_COUNT = 8;

// Normalized phase boundaries (0-1)
const P1_END = PASS1_DUR / FLIGHT_TOTAL;               // 0.25
const GAP_END = (PASS1_DUR + GAP_DUR) / FLIGHT_TOTAL;  // 0.333

interface TakeoffTransitionProps {
  visible: boolean;
  buttonLayout: { x: number; y: number; width: number; height: number } | null;
  onComplete: () => void;
}

export function TakeoffTransition({
  visible,
  buttonLayout,
  onComplete,
}: TakeoffTransitionProps) {
  const [phase, setPhase] = useState<'fly' | 'loading'>('fly');
  const [msgIndex, setMsgIndex] = useState(0);
  const { width: screenW, height: screenH } = Dimensions.get('window');

  // Single progress value drives the entire flight — animated on UI thread
  const progress = useSharedValue(-1);

  // Origin computed from props — captured in worklet closures on each render
  const oX = buttonLayout
    ? buttonLayout.x + buttonLayout.width / 2
    : screenW * 0.55;
  const oY = buttonLayout
    ? buttonLayout.y + buttonLayout.height / 2
    : screenH * 0.45;

  // Overlay + loading
  const overlayOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(0);
  const spinnerRotate = useSharedValue(0);
  const orbitRotate = useSharedValue(0);
  const dot0 = useSharedValue(0.3);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);

  const stableOnComplete = useCallback(() => onComplete(), [onComplete]);

  // ─── Start animation ─────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    setPhase('fly');
    setMsgIndex(0);

    // Reset & start flight — single withTiming, everything else derived
    progress.value = 0;
    loadingOpacity.value = 0;
    overlayOpacity.value = withTiming(1, { duration: 150 });
    progress.value = withTiming(1, {
      duration: FLIGHT_TOTAL,
      easing: Easing.linear,
    });

    // Loading phase
    const t1 = setTimeout(() => {
      setPhase('loading');
      loadingOpacity.value = withTiming(1, { duration: 500 });
      spinnerRotate.value = 0;
      spinnerRotate.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
      orbitRotate.value = 0;
      orbitRotate.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
      dot0.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1
      );
      dot1.value = withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1
        )
      );
      dot2.value = withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1
        )
      );
    }, LOADING_START);

    const t2 = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => stableOnComplete(), 200);
    }, ANIMATION_END);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  // ─── Plane style — ALL math runs on UI thread ─────────────────
  const planeStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    if (p < 0 || p > 1.01) {
      return { opacity: 0, transform: [{ translateX: -200 }, { translateY: -200 }, { rotate: '0rad' }, { scale: 0 }] };
    }

    const W = screenW;
    const H = screenH;

    const pass1TravelX = W + 60 - oX;
    const liftHeight = H * 0.15;
    const centerY = H * 0.45;
    const amp = H * 0.08;
    const totalTravel = W + 80;
    const omega = Math.PI * 2 * 1.2;

    let x = -200, y = -200, rot = 0, sc = 1, op = 0;

    if (p < P1_END) {
      // Pass 1: takeoff arc — quadratic lift for immediate upward motion
      const pp = p / P1_END;
      x = oX + pp * pp * pass1TravelX;
      y = oY - pp * pp * liftHeight;
      const dxdp = 2 * pp * pass1TravelX + 0.001;
      const dydp = -2 * pp * liftHeight;
      rot = Math.atan2(dydp, dxdp);
      op = 1;
      sc = 0.45 + Math.sqrt(pp) * 0.55;

    } else if (p < GAP_END) {
      op = 0;

    } else {
      // Pass 2: sine wave sweep
      const pp = (p - GAP_END) / (1 - GAP_END);
      const easeP = 1 - (1 - pp) * (1 - pp);
      x = -40 + easeP * totalTravel;
      const ampEnv = 1 - Math.exp(-pp * 10);
      y = centerY - Math.sin(pp * omega) * amp * ampEnv;

      const dxdp = 2 * (1 - pp) * totalTravel + 0.001;
      const dAmpEnv = 10 * Math.exp(-pp * 10);
      const sinVal = Math.sin(pp * omega);
      const cosVal = Math.cos(pp * omega);
      const dydp = -(cosVal * omega * ampEnv + sinVal * dAmpEnv) * amp;
      rot = Math.atan2(dydp, dxdp) * 0.7 - 0.04;

      op = pp > 0.88 ? 1 - (pp - 0.88) / 0.12 : 1;
      sc = pp < 0.05 ? 0.5 + (pp / 0.05) * 0.5
        : pp > 0.85 ? 1 - ((pp - 0.85) / 0.15) * 0.5
        : 1;
    }

    return {
      transform: [
        { translateX: x - 24 },
        { translateY: y - 24 },
        { rotate: `${rot}rad` },
        { scale: sc },
      ],
      opacity: op,
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));
  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotate.value}deg` }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotate.value}deg` }],
  }));
  const dot0Style = useAnimatedStyle(() => ({
    opacity: dot0.value,
    transform: [{ scale: interpolate(dot0.value, [0.3, 1], [1, 1.4]) }],
  }));
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: interpolate(dot1.value, [0.3, 1], [1, 1.4]) }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: interpolate(dot2.value, [0.3, 1], [1, 1.4]) }],
  }));

  useEffect(() => {
    if (phase !== 'loading') return;
    const interval = setInterval(
      () => setMsgIndex((i) => (i + 1) % TAKEOFF_LOADING_MESSAGES.length),
      700
    );
    return () => clearInterval(interval);
  }, [phase]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Blue[600] }]} />

      {/* Trail dots — each computes own position from shared progress */}
      {Array.from({ length: TRAIL_COUNT }, (_, i) => (
        <TrailDot
          key={i}
          index={i}
          progress={progress}
          screenW={screenW}
          screenH={screenH}
        />
      ))}

      {/* Airplane + glow */}
      <Animated.View style={[styles.plane, planeStyle]}>
        {/* Radial gradient glow — smooth falloff, no hard edges */}
        <View style={styles.glowWrap}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Defs>
              <RadialGradient id="planeGlow" cx="70" cy="70" r="70">
                <Stop offset="0%" stopColor="white" stopOpacity="0.45" />
                <Stop offset="40%" stopColor="white" stopOpacity="0.2" />
                <Stop offset="70%" stopColor="white" stopOpacity="0.06" />
                <Stop offset="100%" stopColor="white" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="70" cy="70" r="70" fill="url(#planeGlow)" />
          </Svg>
        </View>
        <PaperPlane size={48} color="white" style={{ transform: [{ rotate: '15deg' }] }} />
      </Animated.View>

      {/* Loading phase */}
      <Animated.View style={[styles.loadingContainer, loadingStyle]}>
        <View style={styles.spinnerWrapper}>
          <Animated.View style={[styles.orbitRing, orbitStyle]}>
            <View style={styles.orbitPlane}>
              <PaperPlane
                size={16}
                color="white"
                style={{ opacity: 0.6, transform: [{ rotate: '82deg' }] }}
              />
            </View>
          </Animated.View>
          <Animated.View style={[styles.spinnerRing, spinnerStyle]} />
        </View>

        <Text style={styles.loadingMessage}>
          {TAKEOFF_LOADING_MESSAGES[msgIndex]}
        </Text>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot0Style]} />
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Trail dot — derives position from shared progress on UI thread ──
function TrailDot({
  index,
  progress,
  screenW,
  screenH,
}: {
  index: number;
  progress: SharedValue<number>;
  screenW: number;
  screenH: number;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    if (p < GAP_END || p > 1) return { opacity: 0 };

    const pp = (p - GAP_END) / (1 - GAP_END);
    const trailDelay = ((index + 1) * 80) / PASS2_DUR;
    const tp = pp - trailDelay;
    if (tp <= 0) return { opacity: 0 };

    // Fade out trail dots earlier so they vanish before progress ends
    const fadeStart = 0.7;
    if (tp >= 0.85 || pp >= 0.85) return { opacity: 0 };

    const totalTravel = screenW + 80;
    const centerY = screenH * 0.45;
    const amp = screenH * 0.08;
    const omega = Math.PI * 2 * 1.2;

    const tEase = 1 - (1 - tp) * (1 - tp);
    const x = -40 + tEase * totalTravel;
    const tAmpEnv = 1 - Math.exp(-tp * 10);
    const y = centerY - Math.sin(tp * omega) * amp * tAmpEnv;
    const op = tp > fadeStart ? (1 - (tp - fadeStart) / 0.15) * 0.45 : 0.45;

    return {
      transform: [{ translateX: x - 3 }, { translateY: y - 3 }],
      opacity: op,
    };
  });

  return <Animated.View style={[styles.trailDot, style]} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    overflow: 'visible',
  },
  plane: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 48,
    height: 48,
    zIndex: 10,
    overflow: 'visible',
  },
  glowWrap: {
    position: 'absolute',
    top: -46,
    left: -46,
    width: 140,
    height: 140,
  },
  trailDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    zIndex: 5,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 24,
  },
  spinnerWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  orbitRing: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitPlane: {
    position: 'absolute',
    top: -8,
  },
  spinnerRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopColor: 'rgba(255,255,255,0.7)',
  },
  loadingMessage: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});

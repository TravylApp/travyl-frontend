import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  width: number;
  height: number;
}

export default function FlipCard({
  front,
  back,
  isFlipped,
  onFlip,
  width,
  height,
}: FlipCardProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isFlipped ? 180 : 0, {
      damping: 15,
      stiffness: 100,
    });
  }, [isFlipped]);

  // Track which face is showing (true when past 90°)
  const isPastHalf = useDerivedValue(() => rotation.value > 90);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity: isPastHalf.value ? 0 : 1,
      zIndex: isPastHalf.value ? 0 : 1,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity: isPastHalf.value ? 1 : 0,
      zIndex: isPastHalf.value ? 1 : 0,
    };
  });

  return (
    <Pressable onPress={onFlip}>
      <View
        style={{
          width,
          height,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* Front face */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width,
              height,
            },
            frontAnimatedStyle,
          ]}
        >
          {front}
        </Animated.View>

        {/* Back face */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width,
              height,
            },
            backAnimatedStyle,
          ]}
        >
          {back}
        </Animated.View>
      </View>
    </Pressable>
  );
}

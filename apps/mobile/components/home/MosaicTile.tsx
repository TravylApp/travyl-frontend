import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { MosaicTile as MosaicTileType } from '@travyl/shared';

interface MosaicTileProps {
  tile: MosaicTileType;
  grad: { from: string; to: string };
  color: { hex: string; label: string };
  width: number;
  height: number;
  nameSize?: number;
  padInner?: number;
  isFeature?: boolean;
}

export function MosaicTile({
  tile,
  grad,
  color,
  width,
  height,
  nameSize = 14,
  padInner = 16,
  isFeature = false,
}: MosaicTileProps) {
  const pressed = useSharedValue(0);

  const onPressIn = () => {
    pressed.value = withSpring(1, { damping: 12, stiffness: 180 });
  };
  const onPressOut = () => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 200 });
  };

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pressed.value * 0.06 }],
    shadowOpacity: 0.15 + pressed.value * 0.2,
    shadowRadius: 4 + pressed.value * 12,
    elevation: pressed.value * 10,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${pressed.value * 0.2})`,
  }));

  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -pressed.value * 4 }],
  }));

  const radius = isFeature ? 20 : 16;

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          {
            backgroundColor: grad.from,
            width,
            height,
            borderRadius: radius,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          },
          tileStyle,
        ]}
      >
        {/* Dark overlay on press */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              borderRadius: radius,
            },
            overlayStyle,
          ]}
        />

        {/* Content */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: padInner,
            paddingBottom: (padInner + 4) * 2,
            paddingTop: 8,
            zIndex: 2,
          }}
        >
          {/* Name */}
          <Animated.View style={nameStyle}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: nameSize }}>
              {tile.name}
            </Text>
          </Animated.View>

          {/* Category label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: color.hex,
                marginRight: 5,
              }}
            />
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              {color.label}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

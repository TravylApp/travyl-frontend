import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useExploreRows, Blue, Gray, hexToRgba } from '@travyl/shared';

interface ExploreRowProps {
  row: ReturnType<typeof useExploreRows>['rows'][number];
  rowIndex: number;
  onToggle: () => void;
}

export function ExploreRow({ row, rowIndex, onToggle }: ExploreRowProps) {
  const chevronRotation = useSharedValue(row.isExpanded ? 180 : 0);
  const pressed = useSharedValue(0);

  // Sync chevron when parent changes isExpanded (e.g. Expand/Collapse All)
  useEffect(() => {
    chevronRotation.value = withTiming(row.isExpanded ? 180 : 0, { duration: 300 });
  }, [row.isExpanded]);

  const handleToggle = () => {
    chevronRotation.value = withTiming(row.isExpanded ? 0 : 180, { duration: 300 });
    onToggle();
  };

  const onPressIn = () => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 200 });
  };
  const onPressOut = () => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 200 });
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  return (
    <Animated.View layout={LinearTransition.duration(300)}>
      {/* Row header — press scales down slightly */}
      <Pressable
        onPress={handleToggle}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: Gray[200],
            },
            buttonStyle,
          ]}
        >
          <Text
            style={{
              fontWeight: '600',
              fontSize: 15,
              color: Gray[800],
            }}
          >
            {row.title}
          </Text>
          <Animated.View style={chevronStyle}>
            <FontAwesome
              name="chevron-down"
              size={13}
              color={Gray[400]}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Expandable cards — wrapper View isolates layout animation from entering/exiting */}
      {row.isExpanded && (
        <View>
          <Animated.View
            entering={FadeInDown.duration(300).springify().damping(18).stiffness(140)}
            exiting={FadeOutUp.duration(200)}
            style={{
              marginTop: 8,
              borderRadius: 14,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: Gray[100],
              padding: 10,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={{ gap: 10 }}
            >
              {row.items.map((item, i) => (
                <View
                  key={item.id ?? item.name}
                  style={{
                    backgroundColor: Blue[600],
                    opacity: 0.9 - i * 0.03,
                    width: 150,
                    height: 150,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: hexToRgba(Blue[400], 0.3),
                    justifyContent: 'flex-end',
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    {item.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

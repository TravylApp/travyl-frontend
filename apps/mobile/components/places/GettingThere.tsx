import { useState } from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { PlaceItem } from '@travyl/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GettingThereProps {
  place: PlaceItem;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  });
  Linking.openURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GettingThere({ place }: GettingThereProps) {
  const [expanded, setExpanded] = useState(false);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: withTiming(expanded ? '180deg' : '0deg', { duration: 250 }) },
    ],
  }));

  const hasContent =
    place.address ||
    place.phone ||
    place.website ||
    place.bestTimeToVisit ||
    (place.accessibility && place.accessibility.length > 0) ||
    (place.tips && place.tips.length > 0);

  if (!hasContent) return null;

  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
          Getting There
        </Text>
        <Animated.View style={chevronStyle}>
          <FontAwesome name="chevron-down" size={12} color="rgba(255,255,255,0.5)" />
        </Animated.View>
      </Pressable>

      {/* ── Expanded content ────────────────────────────────────────── */}
      {expanded && (
        <View style={{ marginTop: 12, gap: 10 }}>
          {/* Address */}
          {place.address && (
            <Pressable
              onPress={() => openMaps(place.address!)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Row icon="map-marker" text={place.address} />
            </Pressable>
          )}

          {/* Phone */}
          {place.phone && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${place.phone}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Row icon="phone" text={place.phone} />
            </Pressable>
          )}

          {/* Website */}
          {place.website && (
            <Pressable
              onPress={() => Linking.openURL(place.website!)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Row icon="globe" text={place.website} />
            </Pressable>
          )}

          {/* Best time to visit */}
          {place.bestTimeToVisit && (
            <Row icon="sun-o" text={place.bestTimeToVisit} />
          )}

          {/* Accessibility */}
          {place.accessibility && place.accessibility.length > 0 && (
            <Row icon="wheelchair" text={place.accessibility.join(', ')} />
          )}

          {/* Tips */}
          {place.tips &&
            place.tips.map((tip, idx) => (
              <Row key={idx} icon="lightbulb-o" text={tip} italic />
            ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

function Row({
  icon,
  text,
  italic,
}: {
  icon: string;
  text: string;
  italic?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <FontAwesome
        name={icon as any}
        size={12}
        color="#7dd3fc"
        style={{ marginTop: 2 }}
      />
      <Text
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.8)',
          flexShrink: 1,
          fontStyle: italic ? 'italic' : 'normal',
        }}
      >
        {text}
      </Text>
    </View>
  );
}

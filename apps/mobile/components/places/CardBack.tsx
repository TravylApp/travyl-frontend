import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, type PlaceItem } from '@travyl/shared';

import QuickFacts from './QuickFacts';
import GettingThere from './GettingThere';
import PlaceActions from './PlaceActions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardBackProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
  onFlip: () => void;
  onSearchTag: (tag: string) => void;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardBack({
  place,
  isFav,
  onToggleFav,
  onFlip,
  onSearchTag,
  width,
  height,
}: CardBackProps) {
  return (
    <Pressable
      onPress={onFlip}
      style={{
        width,
        height,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: Navy.DEFAULT,
      }}
    >
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14 }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#fff',
            marginBottom: 2,
          }}
        >
          {place.name}
        </Text>

        <Text
          style={{
            fontSize: 11,
            color: '#7dd3fc',
            textTransform: 'uppercase',
          }}
        >
          {place.category} {'\u00B7'} {place.type}
        </Text>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
            marginVertical: 10,
          }}
        />

        {/* ── Sections with stagger animation ──────────────────────── */}
        <View style={{ gap: 10 }}>
          <Animated.View
            entering={FadeInDown.delay(0).duration(300).springify()}
            layout={LinearTransition}
          >
            <QuickFacts place={place} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).duration(300).springify()}
            layout={LinearTransition}
          >
            <GettingThere place={place} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(300).springify()}
            layout={LinearTransition}
          >
            <PlaceActions
              place={place}
              isFav={isFav}
              onToggleFav={onToggleFav}
            />
          </Animated.View>
        </View>

        {/* ── Flip hint ─────────────────────────────────────────────── */}
        <View
          style={{
            alignItems: 'center',
            marginTop: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
            Tap to flip
          </Text>
          <FontAwesome
            name="repeat"
            size={10}
            color="rgba(255,255,255,0.35)"
          />
        </View>
      </ScrollView>
    </Pressable>
  );
}

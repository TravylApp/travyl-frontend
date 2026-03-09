import { View, Text, Pressable, Linking } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SOCIAL_HASHTAGS, SOCIAL_LINKS, CATEGORY_GRADIENT_CYCLE, Gray, useTagUsDestinations } from '@travyl/shared';

const PLATFORM_ICONS: Record<string, keyof typeof FontAwesome.glyphMap> = {
  instagram: 'instagram',
};

export function TagUs() {
  const destinations = useTagUsDestinations();

  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
      <Animated.Text
        entering={FadeIn.duration(400)}
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: Gray[900],
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        Tag us on your{' '}
        <Text style={{ fontWeight: '800' }}>Next Trip</Text>
      </Animated.Text>

      <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
        {CATEGORY_GRADIENT_CYCLE.map((g, i) => (
          <Animated.View
            key={i}
            entering={FadeIn.delay(i * 100).duration(400)}
            style={{
              flex: 1,
              aspectRatio: 1,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              backgroundColor: g.from,
            }}
          >
            <FontAwesome name="camera" size={18} color="rgba(255,255,255,0.5)" />
            <Text
              style={{
                color: '#fff',
                fontWeight: '600',
                fontSize: 10,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              {destinations[i]}
            </Text>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              @travyl
            </Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={FadeIn.delay(300).duration(400)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24, marginBottom: 12 }}
      >
        {SOCIAL_LINKS.map((link) => (
          <Pressable
            key={link.platform}
            onPress={() => Linking.openURL(link.url)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Gray[100],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome
              name={PLATFORM_ICONS[link.platform] ?? 'globe'}
              size={18}
              color={Gray[700]}
            />
          </Pressable>
        ))}
      </Animated.View>

      <Animated.Text
        entering={FadeIn.delay(400).duration(400)}
        style={{ fontSize: 12, color: Gray[500], textAlign: 'center', lineHeight: 20 }}
      >
        {SOCIAL_HASHTAGS.join('  ')}
      </Animated.Text>
    </View>
  );
}

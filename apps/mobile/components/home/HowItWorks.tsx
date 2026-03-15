import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { HOW_IT_WORKS_STEPS, Blue } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PhoneFrame, SearchScreen, ItineraryScreen, BookedScreen } from './PhoneFrame';

const STEP_COLORS = ['#059669', '#2563EB', '#9333EA'];
const SCREENS = [SearchScreen, ItineraryScreen, BookedScreen];

interface HowItWorksProps {
  onCtaPress?: () => void;
}

export function HowItWorks({ onCtaPress }: HowItWorksProps) {
  const colors = useThemeColors();

  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 24 }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        How It Works
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        From destination to departure — your perfect trip in 3 simple steps.
      </Text>

      {HOW_IT_WORKS_STEPS.map((step, i) => {
        const accent = STEP_COLORS[i] ?? Blue[600];
        const ScreenContent = SCREENS[i];
        const isEven = i % 2 === 1;

        return (
          <View key={step.step} style={{ marginBottom: 40 }}>
            {/* Step badge — centered */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  backgroundColor: accent,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  Step {step.step}
                </Text>
              </View>
            </View>

            {/* Title — centered */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {step.title}
            </Text>

            {/* Description — centered */}
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 20,
                textAlign: 'center',
                marginBottom: 20,
                paddingHorizontal: 8,
              }}
            >
              {step.description}
            </Text>

            {/* Phone mockup — alternates left / right */}
            <View
              style={{
                alignItems: isEven ? 'flex-start' : 'flex-end',
                paddingHorizontal: 12,
                marginBottom: 20,
              }}
            >
              <PhoneFrame accentColor={accent} floatDelay={i * 400}>
                {ScreenContent ? <ScreenContent /> : null}
              </PhoneFrame>
            </View>

            {/* Features */}
            <View>
              {step.features.map((feature) => (
                <View
                  key={feature}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                >
                  <FontAwesome name="check" size={12} color={accent} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, color: colors.text }}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <Pressable
        onPress={onCtaPress}
        style={{
          backgroundColor: Blue[600],
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
          Start planning your trip
        </Text>
        <FontAwesome name="arrow-right" size={14} color={'#fff'} />
      </Pressable>
    </View>
  );
}

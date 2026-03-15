import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { HOW_IT_WORKS_STEPS, Blue } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

const AUTO_ADVANCE_MS = 5000;
const GAP = 8;
const PADDING = 24;

interface HowItWorksProps {
  onCtaPress?: () => void;
}

function StepCard({
  step,
  index,
  isActive,
  isCompleted,
  onPress,
  colors,
  cardWidth,
}: {
  step: (typeof HOW_IT_WORKS_STEPS)[number];
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  cardWidth: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: AUTO_ADVANCE_MS });
    } else {
      progress.value = 0;
    }
  }, [isActive]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <Pressable onPress={onPress} style={{ width: cardWidth }}>
      <View
        style={{
          borderRadius: 14,
          padding: 12,
          overflow: 'hidden',
          backgroundColor: isActive
            ? '#1e3a5f'
            : isCompleted
              ? 'rgba(30,58,95,0.05)'
              : '#f3f4f6',
          minHeight: isActive ? undefined : undefined,
        }}
      >
        {/* Progress bar */}
        {isActive && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderRadius: 3,
                  transformOrigin: 'left',
                },
                progressStyle,
              ]}
            />
          </View>
        )}

        {/* Step number */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            backgroundColor: isActive
              ? 'rgba(255,255,255,0.2)'
              : isCompleted
                ? '#1e3a5f'
                : '#e5e7eb',
          }}
        >
          {isCompleted ? (
            <FontAwesome name="check" size={10} color="#fff" />
          ) : (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: isActive ? '#fff' : '#6b7280',
              }}
            >
              {index + 1}
            </Text>
          )}
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: isActive ? '#fff' : colors.text,
            lineHeight: 15,
          }}
        >
          {step.title}
        </Text>

      </View>
    </Pressable>
  );
}

export function HowItWorks({ onCtaPress }: HowItWorksProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const [activeStep, setActiveStep] = useState(0);
  const stepCount = HOW_IT_WORKS_STEPS.length;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardWidth = (screenWidth - PADDING * 2 - GAP * (stepCount - 1)) / stepCount;

  const advance = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % stepCount);
  }, [stepCount]);

  useEffect(() => {
    timeoutRef.current = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeStep, advance]);

  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: PADDING }}>
      {/* Header */}
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
          marginBottom: 24,
        }}
      >
        From destination to departure — your perfect trip in 3 simple steps.
      </Text>

      {/* Step cards — 3-column row like web */}
      <View style={{ flexDirection: 'row', gap: GAP, marginBottom: 24, alignItems: 'flex-start' }}>
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <StepCard
            key={i}
            step={step}
            index={i}
            isActive={activeStep === i}
            isCompleted={activeStep > i}
            onPress={() => setActiveStep(i)}
            colors={colors}
            cardWidth={cardWidth}
          />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        onPress={onCtaPress}
        style={{
          backgroundColor: Blue[600],
          borderRadius: 24,
          paddingHorizontal: 24,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
          Plan Your Trip
        </Text>
        <FontAwesome name="arrow-right" size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

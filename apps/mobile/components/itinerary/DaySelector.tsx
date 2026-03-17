import { ScrollView, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

interface DaySelectorProps {
  days: ItineraryDayViewModel[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  accentColor?: string;
}

const GAP = 6;
const PADDING_H = 8;
// Reserve space for the collapse button sitting to the right
const RIGHT_RESERVE = 40;

export function DaySelector({ days, selectedIndex, onSelect, accentColor }: DaySelectorProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const accent = accentColor ?? colors.text;
  // Size pills so 4 fit in the available space
  const available = screenWidth - PADDING_H * 2 - RIGHT_RESERVE;
  const pillWidth = (available - GAP * 3) / 4;

  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 2 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: PADDING_H, gap: GAP }}
      >
        {days.map((day, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={day.id}
              onPress={() => onSelect(index)}
              style={{
                width: pillWidth,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {selected ? (
                <View
                  style={{
                    paddingVertical: 6,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: accent,
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                    {day.dayLabel}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', marginTop: 1 }}>
                    {day.dateLabel}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    paddingVertical: 6,
                    alignItems: 'center',
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 9, color: colors.textTertiary, fontWeight: '500' }}>
                    {day.dayLabel}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 1 }}>
                    {day.dateLabel}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

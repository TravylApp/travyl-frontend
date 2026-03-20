import { ScrollView, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

interface DaySelectorProps {
  days: ItineraryDayViewModel[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  accentColor?: string;
}

const GAP = 4;
const PADDING_H = 6;
const RIGHT_RESERVE = 76;

/** Extract short date like "Mar 10" from full dateLabel like "Tue, Mar 10" */
function shortDate(dateLabel: string): string {
  // Remove weekday prefix (e.g. "Tue, Mar 10" → "Mar 10")
  const parts = dateLabel.split(', ');
  return parts.length > 1 ? parts.slice(1).join(', ') : dateLabel;
}

export function DaySelector({ days, selectedIndex, onSelect, accentColor }: DaySelectorProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const accent = accentColor ?? colors.text;
  const available = screenWidth - PADDING_H * 2 - RIGHT_RESERVE;
  const pillWidth = Math.min((available - GAP * (days.length - 1)) / Math.min(days.length, 6), 58);

  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 2 }}>
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
              style={{ width: pillWidth, borderRadius: 7, overflow: 'hidden' }}
            >
              <View
                style={{
                  paddingVertical: 5,
                  alignItems: 'center',
                  borderRadius: 7,
                  backgroundColor: selected ? accent : colors.cardBackground,
                  borderWidth: selected ? 0 : 1,
                  borderColor: colors.border,
                  ...(selected ? {
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 3,
                  } : {}),
                }}
              >
                <Text style={{
                  fontSize: 8, fontWeight: '600',
                  color: selected ? 'rgba(255,255,255,0.8)' : colors.textTertiary,
                }}>
                  D{day.dayNumber}
                </Text>
                <Text numberOfLines={1} style={{
                  fontSize: 9, fontWeight: '700', marginTop: 1,
                  color: selected ? '#fff' : colors.text,
                }}>
                  {shortDate(day.dateLabel)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

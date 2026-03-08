import { ScrollView, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Navy, ITINERARY_COLORS } from '@travyl/shared';
import type { ItineraryDayViewModel } from '@travyl/shared';

interface DaySelectorProps {
  days: ItineraryDayViewModel[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function DaySelector({ days, selectedIndex, onSelect }: DaySelectorProps) {
  return (
    <View style={{ backgroundColor: ITINERARY_COLORS.containerBg, paddingVertical: 8, paddingHorizontal: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}
      >
        {days.map((day, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={day.id}
              onPress={() => onSelect(index)}
              style={{
                minWidth: 74,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {selected ? (
                <LinearGradient
                  colors={[Navy.DEFAULT, Navy.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderRadius: 10,
                    shadowColor: Navy.DEFAULT,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                    {day.dayLabel}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 2 }}>
                    {day.dateLabel}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: '500' }}>
                    {day.dayLabel}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 }}>
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

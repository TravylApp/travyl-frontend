import { View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { TimeGroupSection } from './TimeGroupSection';

interface DayViewProps {
  day: ItineraryDayViewModel;
}

export function DayView({ day }: DayViewProps) {
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
      {day.theme && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingHorizontal: 4,
        }}>
          <FontAwesome name="flag" size={13} color="#6b7280" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f2937' }}>
            {day.theme}
          </Text>
        </View>
      )}
      {day.timeGroups.map((group) => (
        <TimeGroupSection key={group.timeOfDay} group={group} />
      ))}
      {day.notes && (
        <View style={{
          backgroundColor: '#f9fafb',
          borderRadius: 10,
          padding: 12,
          marginTop: 4,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#f3f4f6',
        }}>
          <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', lineHeight: 18 }}>
            {day.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

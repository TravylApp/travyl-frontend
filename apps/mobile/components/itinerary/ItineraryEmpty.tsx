import { View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy } from '@travyl/shared';

export function ItineraryEmpty() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          backgroundColor: Navy.DEFAULT + '15',
        }}
      >
        <FontAwesome name="calendar" size={24} color={Navy.DEFAULT} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 6, textAlign: 'center' }}>
        No itinerary yet
      </Text>
      <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
        Your AI-generated itinerary will appear here once your trip is planned.
      </Text>
    </View>
  );
}

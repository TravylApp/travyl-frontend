import { View, ScrollView, Text, Pressable, Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, Navy, ITINERARY_COLORS, MOCK_WEATHER_FORECAST } from '@travyl/shared';

const INFO_COLOR = '#0ea5e9';

interface InfoSection {
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  items: { label: string; value: string; icon?: React.ComponentProps<typeof FontAwesome>['name'] }[];
}

const TRANSPORT_INFO: InfoSection = {
  title: 'Getting Around',
  icon: 'bus',
  items: [
    { label: 'Metro', value: 'Lines 1-14, RER A-E', icon: 'subway' },
    { label: 'Bus', value: '350+ routes, 5:30am-12:30am', icon: 'bus' },
    { label: 'Taxi', value: 'G7, Uber, Bolt available', icon: 'taxi' },
    { label: 'Bike Share', value: "Velib' — 1,400+ stations", icon: 'bicycle' },
  ],
};

const EMERGENCY_CONTACTS: InfoSection = {
  title: 'Emergency Contacts',
  icon: 'phone',
  items: [
    { label: 'Emergency (EU)', value: '112', icon: 'exclamation-circle' },
    { label: 'Police', value: '17', icon: 'shield' },
    { label: 'Ambulance (SAMU)', value: '15', icon: 'ambulance' },
    { label: 'Fire Brigade', value: '18', icon: 'fire-extinguisher' },
    { label: 'US Embassy Paris', value: '+33 1 43 12 22 22', icon: 'flag' },
  ],
};

const DESTINATION_TIPS: InfoSection = {
  title: 'Destination Tips',
  icon: 'lightbulb-o',
  items: [
    { label: 'Currency', value: 'Euro (EUR)', icon: 'eur' },
    { label: 'Language', value: 'French (English widely spoken in tourist areas)', icon: 'language' },
    { label: 'Time Zone', value: 'CET (UTC+1) / CEST (UTC+2 summer)', icon: 'clock-o' },
    { label: 'Tipping', value: 'Service included; round up for good service', icon: 'money' },
    { label: 'Power', value: 'Type C/E plugs, 230V', icon: 'plug' },
    { label: 'Water', value: 'Tap water is safe to drink', icon: 'tint' },
  ],
};

function weatherIcon(condition: string): React.ComponentProps<typeof FontAwesome>['name'] {
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return 'sun-o';
  if (c.includes('cloud') && c.includes('sun')) return 'cloud';
  if (c.includes('cloud')) return 'cloud';
  if (c.includes('rain') || c.includes('shower')) return 'umbrella';
  if (c.includes('snow')) return 'snowflake-o';
  return 'cloud';
}

function InfoSectionCard({ section }: { section: InfoSection }) {
  const handlePress = (value: string) => {
    // If it looks like a phone number, offer to call
    if (/^\+?\d[\d\s-]+$/.test(value.trim())) {
      Linking.openURL(`tel:${value.replace(/\s/g, '')}`);
    }
  };

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ backgroundColor: INFO_COLOR, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={section.icon} size={14} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{section.title}</Text>
      </View>
      <View style={{ padding: 14 }}>
        {section.items.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={() => handlePress(item.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: i < section.items.length - 1 ? 1 : 0,
              borderBottomColor: '#f3f4f6',
            }}
          >
            {item.icon && (
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: INFO_COLOR + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <FontAwesome name={item.icon} size={12} color={INFO_COLOR} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{item.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>{item.value}</Text>
            </View>
            {/^\+?\d[\d\s-]+$/.test(item.value.trim()) && (
              <FontAwesome name="phone" size={14} color={INFO_COLOR} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function WeatherForecastCard() {
  const forecast = MOCK_WEATHER_FORECAST;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name="sun-o" size={14} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Weather Forecast</Text>
      </View>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {forecast.map((day) => (
            <View key={day.day} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>{day.day}</Text>
              <FontAwesome name={weatherIcon(day.condition)} size={20} color="#f59e0b" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: Navy.DEFAULT, marginTop: 4 }}>{day.high}°</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>{day.low}°</Text>
              <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, textAlign: 'center' }}>{day.condition}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function QuickLinksCard() {
  const links = [
    { label: 'Google Maps', icon: 'map' as const, url: 'https://maps.google.com/?q=Paris,France' },
    { label: 'Currency Converter', icon: 'exchange' as const, url: 'https://xe.com' },
    { label: 'Translate', icon: 'language' as const, url: 'https://translate.google.com/?sl=en&tl=fr' },
    { label: 'Local Time', icon: 'clock-o' as const, url: 'https://time.is/Paris' },
  ];

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ backgroundColor: Navy.DEFAULT, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name="external-link" size={14} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Quick Links</Text>
      </View>
      <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {links.map((link) => (
          <Pressable
            key={link.label}
            onPress={() => Linking.openURL(link.url)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: Navy.DEFAULT + '10',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <FontAwesome name={link.icon} size={12} color={Navy.DEFAULT} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: Navy.DEFAULT }}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function InfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, isLoading } = useItineraryScreen(id);

  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: '#f3f4f6', borderRadius: 12, height: 120, marginBottom: 12 }} />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Destination header */}
      <View style={{ backgroundColor: INFO_COLOR + '10', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: INFO_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="info-circle" size={20} color={INFO_COLOR} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: Navy.DEFAULT }}>
            {trip?.destination ?? 'Trip'} Info
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Everything you need to know for your trip
          </Text>
        </View>
      </View>

      <WeatherForecastCard />
      <InfoSectionCard section={TRANSPORT_INFO} />
      <InfoSectionCard section={EMERGENCY_CONTACTS} />
      <InfoSectionCard section={DESTINATION_TIPS} />
      <QuickLinksCard />
    </ScrollView>
  );
}

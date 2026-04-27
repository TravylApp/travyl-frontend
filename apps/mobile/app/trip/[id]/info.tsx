import { useContext } from 'react';
import { View, ScrollView, Text, Pressable, Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, TextStyles } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TabCtx, useTabAccent } from './_layout';

const INFO_COLOR = '#0ea5e9';

interface InfoSection {
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  items: { label: string; value: string; icon?: React.ComponentProps<typeof FontAwesome>['name'] }[];
}

// Build info sections dynamically from trip_context
function buildEmergencySection(ctx: any): InfoSection {
  const emergency = ctx?.quick_facts?.emergency || ctx?.country?.emergency || '112';
  return {
    title: 'Emergency Contacts',
    icon: 'phone',
    items: [
      { label: 'Emergency', value: String(emergency), icon: 'exclamation-circle' },
    ],
  };
}

function buildDestinationTips(ctx: any): InfoSection {
  const qf = ctx?.quick_facts;
  const items: InfoSection['items'] = [];
  if (qf?.currency) items.push({ label: 'Currency', value: qf.currency, icon: 'money' });
  if (qf?.language) items.push({ label: 'Language', value: qf.language, icon: 'language' });
  if (qf?.timezone) items.push({ label: 'Time Zone', value: qf.timezone, icon: 'clock-o' });
  if (qf?.power) items.push({ label: 'Power', value: qf.power, icon: 'plug' });
  if (qf?.water) items.push({ label: 'Water', value: qf.water, icon: 'tint' });
  if (qf?.transport) items.push({ label: 'Transport', value: qf.transport, icon: 'bus' });
  if (items.length === 0) items.push({ label: 'Info', value: 'Trip data loading...', icon: 'info-circle' });
  return { title: 'Destination Tips', icon: 'lightbulb-o', items };
}

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
  const colors = useThemeColors();
  const handlePress = (value: string) => {
    // If it looks like a phone number, offer to call
    if (/^\+?\d[\d\s-]+$/.test(value.trim())) {
      Linking.openURL(`tel:${value.replace(/\s/g, '')}`);
    }
  };

  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ backgroundColor: INFO_COLOR, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={section.icon} size={14} color="#fff" />
        <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{section.title}</Text>
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
              borderBottomColor: colors.borderLight,
            }}
          >
            {item.icon && (
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: INFO_COLOR + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <FontAwesome name={item.icon} size={12} color={INFO_COLOR} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginBottom: 2 }}>{item.label}</Text>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>{item.value}</Text>
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

function WeatherForecastCard({ forecast }: {
  forecast: { day: string; high: number; low: number; icon: string; condition: string }[];
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('index');

  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ backgroundColor: colors.warning, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name="sun-o" size={14} color="#fff" />
        <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Weather Forecast</Text>
      </View>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {forecast.map((day: any, idx: number) => (
            <View key={day.date || day.day || idx} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ ...TextStyles.captionEm, color: colors.textSecondary, marginBottom: 6 }}>{day.day}</Text>
              <FontAwesome name={weatherIcon(day.condition)} size={20} color="#f59e0b" />
              <Text style={{ ...TextStyles.subhead, fontSize: 15, fontWeight: '700', color: ACCENT, marginTop: 4 }}>{day.high}°</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>{day.low}°</Text>
              <Text style={{ ...TextStyles.xs, color: colors.textTertiary, marginTop: 2, textAlign: 'center' }}>{day.condition}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function QuickLinksCard({ city = 'Destination', country = '' }: { city?: string; country?: string }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('index');
  const dest = encodeURIComponent(`${city}, ${country}`.replace(/,\s*$/, ''));
  const links = [
    { label: 'Google Maps', icon: 'map' as const, url: `https://maps.google.com/?q=${dest}` },
    { label: 'Currency Converter', icon: 'exchange' as const, url: 'https://xe.com' },
    { label: 'Translate', icon: 'language' as const, url: `https://translate.google.com/?sl=en&tl=auto&text=Hello` },
    { label: 'Local Time', icon: 'clock-o' as const, url: `https://time.is/${encodeURIComponent(city)}` },
  ];

  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name="external-link" size={14} color="#fff" />
        <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Quick Links</Text>
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
              backgroundColor: ACCENT + '10',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <FontAwesome name={link.icon} size={12} color={ACCENT} />
            <Text style={{ ...TextStyles.body, fontWeight: '500', color: ACCENT }}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function InfoScreen() {
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const { trip, isLoading } = useItineraryScreen(id);
  const colors = useThemeColors();
  const ACCENT = useTabAccent('index');

  const ctx = trip?.trip_context as any;
  const forecast = (ctx?.weather?.forecast ?? []).map((d: any) => ({
    ...d,
    day: d.day || (d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : ''),
    condition: d.condition || d.conditions || '',
  }));
  const cityName = trip?.destination?.split(',')[0]?.trim() || 'Destination';
  const countryName = trip?.destination?.split(',').slice(1).join(',').trim() || '';

  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: colors.borderLight, borderRadius: 12, height: 120, marginBottom: 12 }} />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Destination header */}
      <View style={{ backgroundColor: INFO_COLOR + '10', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: INFO_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="info-circle" size={20} color={INFO_COLOR} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...TextStyles.subhead, fontWeight: '700', color: ACCENT }}>
            {trip?.destination ?? 'Trip'} Info
          </Text>
          <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 2 }}>
            Everything you need to know for your trip
          </Text>
        </View>
      </View>

      {forecast.length > 0 && <WeatherForecastCard forecast={forecast} />}
      <InfoSectionCard section={buildDestinationTips(ctx)} />
      <InfoSectionCard section={buildEmergencySection(ctx)} />
      <QuickLinksCard city={cityName} country={countryName} />
    </ScrollView>
  );
}

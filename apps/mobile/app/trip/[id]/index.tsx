import { useState } from 'react';
import { View, ScrollView, Text, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen, Amber, Red, Sky, Violet,
  MOCK_DESTINATION_COORDS, MOCK_WEATHER_FORECAST,
  MOCK_WEATHER, MOCK_NEWS,
} from '@travyl/shared';
import type { NewsItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MapPreview } from '@/components/itinerary';
import { PageTransition, useTabAccent } from './_layout';

function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  const colors = useThemeColors();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, style]} />;
}

// ─── Collapsible Section ─────────────────────────────────
function CollapsibleSection({ title, icon, color, children, defaultOpen = false }: {
  title: string; icon: string; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name={icon as any} size={14} color={color} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 }}>{title}</Text>
        <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={10} color={colors.textTertiary} />
      </Pressable>
      {open && <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>{children}</View>}
    </View>
  );
}

// ─── Info Row ────────────────────────────────────────────
function InfoRow({ icon, iconColor, label, value, onPress }: {
  icon: string; iconColor: string; label: string; value: string; onPress?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
      }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: iconColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <FontAwesome name={icon as any} size={11} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text }}>{value}</Text>
      </View>
      {onPress && <FontAwesome name="chevron-right" size={10} color={colors.border} />}
    </Pressable>
  );
}

// ─── Weather Icon ────────────────────────────────────────
function weatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return 'sun-o';
  if (c.includes('cloud')) return 'cloud';
  if (c.includes('rain') || c.includes('shower')) return 'umbrella';
  if (c.includes('snow')) return 'snowflake-o';
  return 'cloud';
}

// ─── News Category Config ────────────────────────────────
const NEWS_CATEGORY_CONFIG: Record<NewsItem['category'], { icon: string; color: string; bg: string; label: string }> = {
  event:    { icon: 'star',            color: '#7c3aed', bg: '#f5f3ff', label: 'Event' },
  advisory: { icon: 'exclamation-triangle', color: '#d97706', bg: '#fffbeb', label: 'Advisory' },
  news:     { icon: 'newspaper-o',     color: '#2563eb', bg: '#eff6ff', label: 'News' },
  tip:      { icon: 'lightbulb-o',     color: '#059669', bg: '#ecfdf5', label: 'Tip' },
};

// ─── Data ────────────────────────────────────────────────
const TRANSPORT_OPTIONS = [
  { icon: 'subway', iconColor: '#2563eb', name: 'Metro', description: 'Lines 1-14, RER A-E' },
  { icon: 'bus', iconColor: '#16a34a', name: 'Bus & Tram', description: '350+ routes, 5:30am-12:30am' },
  { icon: 'taxi', iconColor: '#7c3aed', name: 'Taxis', description: 'G7, Uber, Bolt available' },
  { icon: 'bicycle', iconColor: '#d97706', name: 'Bike Share', description: "Velib' — 1,400+ stations" },
];

const EMERGENCY_INFO = [
  { label: 'Emergency (EU)', number: '112' },
  { label: 'Police', number: '17' },
  { label: 'Ambulance (SAMU)', number: '15' },
  { label: 'Fire Brigade', number: '18' },
];

const DESTINATION_TIPS = [
  { icon: 'eur', label: 'Currency', value: 'Euro (EUR)' },
  { icon: 'language', label: 'Language', value: 'French (English in tourist areas)' },
  { icon: 'clock-o', label: 'Time Zone', value: 'CET (UTC+1)' },
  { icon: 'money', label: 'Tipping', value: 'Service included; round up' },
  { icon: 'plug', label: 'Power', value: 'Type C/E plugs, 230V' },
  { icon: 'tint', label: 'Water', value: 'Tap water is safe' },
];

const QUICK_LINKS = [
  { label: 'Google Maps', icon: 'map', url: 'https://maps.google.com/?q=Paris,France' },
  { label: 'Currency', icon: 'exchange', url: 'https://xe.com' },
  { label: 'Translate', icon: 'language', url: 'https://translate.google.com/?sl=en&tl=fr' },
  { label: 'Local Time', icon: 'clock-o', url: 'https://time.is/Paris' },
];

// ─── Main Screen ─────────────────────────────────────────
export default function OverviewScreen() {
  const ACCENT = useTabAccent('index');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, days, flights, hotels, isLoading } = useItineraryScreen(id);
  const colors = useThemeColors();

  const allActivities = days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities));
  const forecast = MOCK_WEATHER_FORECAST;

  const stats = [
    { icon: 'plane' as const, label: 'Flights', count: flights.length, color: '#2563eb', bg: '#dbeafe' },
    { icon: 'building' as const, label: 'Hotels', count: hotels.length, color: '#ea580c', bg: '#ffedd5' },
    { icon: 'list' as const, label: 'Activities', count: allActivities.length, color: '#0d9488', bg: '#ccfbf1' },
  ];

  return (
    <PageTransition>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ padding: 16 }}>
        {/* Trip info card */}
        <LinearGradient
          colors={[ACCENT, ACCENT]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 12, padding: 20, marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FontAwesome name="map-marker" size={16} color="#fff" />
            {trip ? (
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{trip.destination}</Text>
            ) : (
              <SkeletonBlock width="50%" height={18} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FontAwesome name="calendar" size={14} color="rgba(255,255,255,0.8)" />
            {trip ? (
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{trip.start_date} – {trip.end_date}</Text>
            ) : (
              <SkeletonBlock width="60%" height={14} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome name="users" size={14} color="rgba(255,255,255,0.8)" />
              {trip ? (
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                  {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
                </Text>
              ) : (
                <SkeletonBlock width={80} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
              )}
            </View>

            {/* Inline stat pills */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {stats.map((stat) => (
                <View key={stat.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <FontAwesome name={stat.icon} size={10} color="rgba(255,255,255,0.8)" />
                  {isLoading ? (
                    <SkeletonBlock width={10} height={10} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{stat.count}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Map */}
        {trip && (
          <View style={{ marginBottom: 16 }}>
            <MapPreview lat={MOCK_DESTINATION_COORDS.lat} lng={MOCK_DESTINATION_COORDS.lng} label={trip.destination} height={160} />
          </View>
        )}

        {/* ─── Current Weather Card ────────────────────────── */}
        <View style={{
          borderRadius: 12, padding: 14, marginBottom: 14,
          borderWidth: 1, borderColor: '#bae6fd',
          backgroundColor: '#f0f9ff',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.8)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <FontAwesome
                  name={weatherIcon(MOCK_WEATHER.conditions) as any}
                  size={20}
                  color={MOCK_WEATHER.conditions.toLowerCase().includes('cloud') ? '#6b7280' : '#f59e0b'}
                />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{MOCK_WEATHER.high}°</Text>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>/ {MOCK_WEATHER.low}°{MOCK_WEATHER.unit === 'celsius' ? 'C' : 'F'}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{MOCK_WEATHER.conditions} in {MOCK_WEATHER.destination}</Text>
              </View>
            </View>
          </View>

          {/* Inline forecast strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 6 }}>
            {forecast.map((day) => (
              <View key={day.day} style={{
                alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.6)', minWidth: 52,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>{day.day}</Text>
                <FontAwesome name={weatherIcon(day.condition) as any} size={14} color={Amber[500]} style={{ marginVertical: 3 }} />
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{day.high}°</Text>
                  <Text style={{ fontSize: 9, color: colors.textTertiary }}>{day.low}°</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ─── Things to Check Out ─────────────────────────── */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Things to Check Out</Text>
        {MOCK_NEWS.map((item) => {
          const config = NEWS_CATEGORY_CONFIG[item.category];
          return (
            <Pressable
              key={item.id}
              onPress={() => item.url && Linking.openURL(item.url)}
              style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, marginBottom: 8,
                borderWidth: 1, borderColor: colors.borderLight,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 8,
                backgroundColor: config.bg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <FontAwesome name={config.icon as any} size={14} color={config.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <View style={{ backgroundColor: config.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: config.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {config.label}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.textTertiary }}>{item.source}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text }} numberOfLines={2}>{item.title}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{item.snippet}</Text>
              </View>
              {item.url && (
                <FontAwesome name="external-link" size={10} color={colors.border} style={{ marginTop: 4 }} />
              )}
            </Pressable>
          );
        })}

        {/* ─── Trip Info ───────────────────────────────────── */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10, marginTop: 8 }}>Trip Info</Text>


        {/* Getting Around */}
        <CollapsibleSection title="Getting Around" icon="bus" color={Sky[500]}>
          {TRANSPORT_OPTIONS.map((t) => (
            <InfoRow key={t.name} icon={t.icon} iconColor={t.iconColor} label={t.name} value={t.description} />
          ))}
        </CollapsibleSection>

        {/* Emergency */}
        <CollapsibleSection title="Emergency Contacts" icon="phone" color={Red[500]}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {EMERGENCY_INFO.map((e) => (
              <Pressable
                key={e.number}
                onPress={() => Linking.openURL(`tel:${e.number}`)}
                style={{ flex: 1, backgroundColor: Red[50], borderRadius: 10, padding: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: Red[600] }}>{e.number}</Text>
                <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>{e.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ backgroundColor: Amber[50], borderRadius: 8, borderWidth: 1, borderColor: Amber[100], padding: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <FontAwesome name="shield" size={10} color={Amber[600]} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 10, color: colors.text, flex: 1, lineHeight: 15 }}>
                Keep valuables in hotel safe. Use front pockets in crowded areas. Watch for pickpockets at tourist hotspots.
              </Text>
            </View>
          </View>
        </CollapsibleSection>

        {/* Destination Tips */}
        <CollapsibleSection title="Destination Tips" icon="lightbulb-o" color={Violet[500]}>
          {DESTINATION_TIPS.map((tip) => (
            <InfoRow key={tip.label} icon={tip.icon} iconColor={Violet[500]} label={tip.label} value={tip.value} />
          ))}
        </CollapsibleSection>

        {/* Quick Links */}
        <CollapsibleSection title="Quick Links" icon="external-link" color={ACCENT}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_LINKS.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => Linking.openURL(link.url)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: ACCENT + '10',
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                }}
              >
                <FontAwesome name={link.icon as any} size={12} color={ACCENT} />
                <Text style={{ fontSize: 12, fontWeight: '500', color: ACCENT }}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </CollapsibleSection>
      </View>
    </ScrollView>
    </PageTransition>
  );
}

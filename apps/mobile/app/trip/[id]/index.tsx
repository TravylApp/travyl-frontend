import { useRef } from 'react';
import {
  View, ScrollView, Text, Pressable, Linking, Image, Share,
  Dimensions, useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  formatDateRange,
  NEWS_COLORS,
} from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_COLOR = '#c8a96a';

// ─── Accent label + serif heading (matches web pattern) ──────
function SectionHeader({ accent, title }: {
  accent: string; title: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{
            fontSize: 9, fontWeight: '700', letterSpacing: 3,
            textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 4,
          }}>{accent}</Text>
          <Text style={{
            fontSize: 22, fontWeight: '700', fontFamily: 'Lustria-Regular',
            color: colors.text,
          }}>{title}</Text>
        </View>
      </View>
    </View>
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


// ─── Data ────────────────────────────────────────────────
const TRANSPORT_INFO = [
  { name: 'Métro', text: 'Lines 1, 4 & 7 cover tourist areas' },
  { name: 'Bus', text: 'Route 69 passes major landmarks' },
  { name: 'Walking', text: 'Best for Le Marais & Montmartre' },
  { name: 'Taxi', text: 'Beige cabs / Uber · Airport €50–70' },
];

const GOOD_TO_KNOW = [
  'Tipping is included — round up for great service',
  'Tap water is safe — ask for "une carafe d\'eau"',
  'Watch for pickpockets at tourist sites and on the Métro',
];

const EMERGENCY_INFO = [
  { label: 'All', number: '112' },
  { label: 'Police', number: '17' },
  { label: 'Medical', number: '15' },
];

const QUICK_FACTS = [
  { bold: 'EUR €', text: '€1 ≈ $1.08' },
  { bold: 'French', text: 'English widely spoken' },
  { bold: 'CET +1', text: '6h ahead of EST' },
  { bold: 'Type C/E', text: '230V adapter' },
];

// ─── Main Screen ─────────────────────────────────────────
export default function OverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip } = useItineraryScreen(id);
  const colors = useThemeColors();
  const isDark = useColorScheme() === 'dark';
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const forecast = trip?.trip_context?.weather?.forecast ?? [];
  const weather = trip?.trip_context?.weather?.current;
  const news = trip?.trip_context?.news ?? [];

  const coverImage = trip?.trip_context?.hero_image_url;
  const destination = trip?.destination || 'Paris, France';
  const cityName = destination.split(',')[0].trim();
  const countryName = destination.split(',').slice(1).join(',').trim();

  const dateStr = trip ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersStr = trip ? `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}` : null;

  const handleShare = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `Check out my trip to ${trip.destination}! ${trip.start_date} – ${trip.end_date}`,
        title: trip.title ?? `Trip to ${trip.destination}`,
      });
    } catch (_) {}
  };

  return (
    <PageTransition>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Background image bleed ───────────────────────── */}
      {coverImage && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }} pointerEvents="none">
          <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.1)',
              'rgba(0,0,0,0.25)',
              isDark ? 'rgba(18,18,20,0.7)' : 'rgba(255,255,255,0.7)',
              isDark ? '#121214' : colors.background,
            ]}
            locations={[0, 0.35, 0.7, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </View>
      )}

      {/* ─── Back + action buttons over bleed ─────────────── */}
      <View style={{
        position: 'absolute', top: 50, left: 14, right: 14, zIndex: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }} pointerEvents="box-none">
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FontAwesome name="chevron-left" size={14} color="#fff" />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={handleShare}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
              borderRadius: 10, width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="share" size={13} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
      {/* ─── Hero text over bleed ─────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 90, paddingBottom: 8 }}>
        <Text style={{
          fontSize: 9, fontWeight: '700', letterSpacing: 3,
          textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 6,
        }}>
          {countryName || 'Your Trip Guide'}
        </Text>
        <Text style={{
          fontSize: 32, fontWeight: '800', fontFamily: 'Lustria-Regular',
          color: '#fff', lineHeight: 36, marginBottom: 8,
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 16,
        }}>
          {cityName.toUpperCase()}
        </Text>

        {/* Date + travelers + weather inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {dateStr && <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{dateStr}</Text>}
          {dateStr && travelersStr && <Text style={{ color: 'rgba(255,255,255,0.2)' }}>·</Text>}
          {travelersStr && <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{travelersStr}</Text>}
          {(dateStr || travelersStr) && weather && <Text style={{ color: 'rgba(255,255,255,0.2)' }}>·</Text>}
          {weather && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <FontAwesome name={weatherIcon(weather.condition ?? '') as any} size={13} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{weather.high}° / {weather.low}°</Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── Lede + Essentials ────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{
          fontSize: 13, lineHeight: 20, fontFamily: 'Lustria-Regular',
          color: isDark ? '#e0d8cc' : '#4a3f35', marginBottom: 12,
          textShadowColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        }}>
          Paris never reveals itself all at once. It unfolds — slowly, generously — in the steam
          rising from a morning café crème, in the light that catches the Seine just before sunset.
        </Text>

        {/* Quick facts — inline text, matches web */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {QUICK_FACTS.map((f) => (
            <Text key={f.bold} style={{ fontSize: 11, color: isDark ? '#9e9689' : '#7a6e63' }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{f.bold}</Text> · {f.text}
            </Text>
          ))}
        </View>

        {/* Forecast strip — editorial style */}
        {(weather || forecast.length > 0) && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}>
            {weather && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome
                    name={weatherIcon(weather.condition ?? '') as any}
                    size={14}
                    color={ACCENT_COLOR}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT_COLOR }}>
                    {weather.high}° / {weather.low}°
                  </Text>
                  <Text style={{ fontSize: 9, color: isDark ? '#7a7268' : '#a39688', marginLeft: -2 }}>Now</Text>
                </View>
                {forecast.length > 0 && <Text style={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}>|</Text>}
              </>
            )}
            {forecast.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {forecast.slice(0, 5).map((day) => (
                  <View key={day.day} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9e9689' : '#7a6e63' }}>{day.day}</Text>
                    <Text style={{ fontSize: 13 }}>{day.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{day.high}°</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* ─── Things to Do — horizontal scroll cards ───────── */}
      {trip?.trip_context?.explore_items && trip.trip_context.explore_items.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader accent="Explore" title="Things to Do" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH - 60}
          >
            {trip.trip_context.explore_items.map((item) => (
              <View key={item.id} style={{
                width: SCREEN_WIDTH - 60, height: 220, borderRadius: 14, overflow: 'hidden',
              }}>
                <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                  locations={[0, 0.4, 1]}
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                />
                {/* Category pill */}
                <View style={{
                  position: 'absolute', top: 10, left: 10,
                  backgroundColor: 'rgba(200,169,106,0.15)', borderWidth: 1,
                  borderColor: 'rgba(200,169,106,0.2)', borderRadius: 12,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{
                    fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
                    textTransform: 'uppercase', color: ACCENT_COLOR,
                  }}>{item.category}</Text>
                </View>
                {/* Bottom text */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                  <Text style={{
                    fontSize: 17, fontWeight: '700', color: '#fff',
                    fontFamily: 'Lustria-Regular', marginBottom: 4,
                  }}>{item.title}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Quote Divider ────────────────────────────────── */}
      <View style={{ paddingHorizontal: 32, paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{
          fontSize: 15, fontStyle: 'italic', fontFamily: 'Lustria-Regular',
          textAlign: 'center', color: isDark ? 'rgba(200,192,182,0.5)' : 'rgba(80,65,50,0.5)',
          lineHeight: 22,
        }}>
          &ldquo;Paris is always a good idea.&rdquo;{' '}
          <Text style={{ fontStyle: 'normal', opacity: 0.5 }}>— Audrey Hepburn</Text>
        </Text>
      </View>

      {/* ─── What's Going On — dark gradient news cards ───── */}
      {news.length > 0 && (() => {
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader accent="What's Happening" title="What's Going On" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH - 60}
            >
              {news.map((item, i) => {
                const grad = NEWS_COLORS[i % NEWS_COLORS.length];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => item.url && Linking.openURL(item.url)}
                    style={{ width: SCREEN_WIDTH - 60, height: 200, borderRadius: 14, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={[grad[0], grad[1]]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
                    >
                      {/* Gold accent line at top */}
                      <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                        backgroundColor: 'rgba(200,169,106,0.3)',
                      }} />
                      <Text style={{
                        fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
                        textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 6,
                      }}>
                        {item.category}
                        {item.source ? <Text style={{ opacity: 0.5 }}> · {item.source}</Text> : null}
                      </Text>
                      <Text style={{
                        fontSize: 15, fontWeight: '700', fontFamily: 'Lustria-Regular',
                        color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginBottom: 6,
                      }} numberOfLines={2}>{item.title}</Text>
                      <Text style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 16,
                      }} numberOfLines={2}>{item.snippet}</Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })()}

      {/* ─── Before You Go (essentials footer) ────────────── */}
      <View style={{
        marginTop: 28, paddingHorizontal: 20, paddingTop: 20,
        borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        <Text style={{
          fontSize: 20, fontWeight: '700', fontFamily: 'Lustria-Regular',
          color: colors.text, marginBottom: 16,
        }}>Before You Go</Text>

        {/* Getting Around */}
        <Text style={{
          fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
          textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 10,
        }}>Getting Around</Text>
        {TRANSPORT_INFO.map((t) => (
          <Text key={t.name} style={{ fontSize: 12, color: isDark ? '#9e9689' : '#7a6e63', marginBottom: 6, lineHeight: 18 }}>
            <Text style={{ fontWeight: '600', color: colors.text }}>{t.name}</Text> — {t.text}
          </Text>
        ))}

        {/* Good to Know */}
        <Text style={{
          fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
          textTransform: 'uppercase', color: ACCENT_COLOR, marginTop: 18, marginBottom: 10,
        }}>Good to Know</Text>
        {GOOD_TO_KNOW.map((tip, i) => (
          <Text key={i} style={{ fontSize: 12, color: isDark ? '#9e9689' : '#7a6e63', marginBottom: 6, lineHeight: 18 }}>
            {tip}
          </Text>
        ))}

        {/* Emergency */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 16,
          marginTop: 14, paddingTop: 12,
          borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}>
          <Text style={{
            fontSize: 9, fontWeight: '700', letterSpacing: 1,
            textTransform: 'uppercase', color: isDark ? '#9e9689' : '#7a6e63',
          }}>Emergency</Text>
          {EMERGENCY_INFO.map((e) => (
            <Pressable
              key={e.number}
              onPress={() => Linking.openURL(`tel:${e.number}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(239,68,68,0.7)' }}>{e.number}</Text>
              <Text style={{ fontSize: 9, color: isDark ? '#7a7268' : '#a39688' }}>{e.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    </View>
    </PageTransition>
  );
}

import { useRef } from 'react';
import {
  View, ScrollView, Text, Pressable, Linking, Image, Share,
  Dimensions, useColorScheme,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  formatDateRange,
  TextStyles, FontFamily,
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
            ...TextStyles.xs, fontWeight: '700', letterSpacing: 3,
            textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 4,
          }}>{accent}</Text>
          <Text style={{
            ...TextStyles.headline, fontSize: 22,
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

function weatherEmoji(icon: string): string {
  const c = icon.toLowerCase();
  if (c.includes('clear') && c.includes('night')) return '🌙';
  if (c.includes('clear') || c.includes('sun')) return '☀️';
  if (c.includes('partly') || c.includes('cloud')) return '⛅';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return '🌧';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  if (c.includes('wind')) return '💨';
  return '☁️';
}


// ─── Data ────────────────────────────────────────────────
// Dynamic helpers — build from trip_context, no hardcoded city data
function buildQuickFacts(ctx: any): { bold: string; text: string }[] {
  if (!ctx?.quick_facts) return [];
  const qf = ctx.quick_facts;
  const facts: { bold: string; text: string }[] = [];
  if (qf.currency) facts.push({ bold: qf.currency.split(' · ')[0], text: qf.currency.split(' · ').slice(1).join(' · ') || '' });
  if (qf.language) facts.push({ bold: qf.language.split(' · ')[0], text: '' });
  if (qf.timezone) facts.push({ bold: qf.timezone.split(' · ')[0], text: '' });
  return facts;
}

function buildEmergencyInfo(ctx: any): { label: string; number: string }[] {
  const emergency = ctx?.quick_facts?.emergency || ctx?.country?.emergency;
  if (!emergency) return [{ label: 'All', number: '112' }];
  return [{ label: 'Emergency', number: String(emergency).split(' ')[0] }];
}

// ─── Main Screen ─────────────────────────────────────────
export default function OverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip } = useItineraryScreen(id);
  const colors = useThemeColors();
  const isDark = useColorScheme() === 'dark';
  const scrollRef = useRef<ScrollView>(null);

  const ctx = trip?.trip_context as any;
  const forecast = (ctx?.weather?.forecast ?? []).map((d: any) => ({
    ...d,
    day: d.day || (d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : ''),
    icon: weatherEmoji(d.icon || d.conditions || ''),
  }));
  const weather = ctx?.weather?.current ?? { temp: 0, high: 0, low: 0, conditions: '' };
  const news = ctx?.news ?? [];

  const destination = trip?.destination || 'Destination';
  const cityName = destination.split(',')[0].trim();

  return (
    <PageTransition>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
      {/* ─── Things to Do — horizontal scroll cards ───────── */}
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
          {(ctx?.explore_items ?? []).filter((item: any) => item.image).map((item: any, idx: number) => (
            <View key={item.id || idx} style={{
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
                  ...TextStyles.xs, fontWeight: '700', letterSpacing: 0.5,
                  textTransform: 'uppercase', color: ACCENT_COLOR,
                }}>{item.category}</Text>
              </View>
              {/* Bottom text */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                <Text style={{
                  ...TextStyles.title, fontSize: 17, color: '#fff', marginBottom: 4,
                }}>{item.title}</Text>
                <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.6)', lineHeight: 16 }} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ─── Quote Divider ────────────────────────────────── */}
      <View style={{ paddingHorizontal: 32, paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{
          ...TextStyles.subhead, fontSize: 15, fontFamily: FontFamily.serif,
          fontStyle: 'italic',
          textAlign: 'center', color: isDark ? 'rgba(200,192,182,0.5)' : 'rgba(80,65,50,0.5)',
          lineHeight: 22,
        }}>
          &ldquo;Paris is always a good idea.&rdquo;{' '}
          <Text style={{ fontStyle: 'normal', opacity: 0.5 }}>— Audrey Hepburn</Text>
        </Text>
      </View>

      {/* ─── What's Going On — dark gradient news cards ───── */}
      <View style={{ paddingHorizontal: 20 }}>
        <SectionHeader accent="What's Happening" title="What's Going On" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH - 60}
        >
          {news.map((item: any, i: number) => {
            const gradients: [string, string][] = [['#1a1a2e', '#16213e'], ['#0f3460', '#1a1a2e'], ['#2c3e50', '#1a1a2e'], ['#1b2838', '#0f3460']];
            const grad = gradients[i % gradients.length];
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
                    ...TextStyles.xs, fontWeight: '700', letterSpacing: 1.5,
                    textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 6,
                  }}>
                    {item.category}
                    {item.source ? <Text style={{ opacity: 0.5 }}> · {item.source}</Text> : null}
                  </Text>
                  <Text style={{
                    ...TextStyles.subhead, fontSize: 15, fontFamily: FontFamily.serif,
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginBottom: 6,
                  }} numberOfLines={2}>{item.title}</Text>
                  <Text style={{
                    ...TextStyles.caption, color: 'rgba(255,255,255,0.5)', lineHeight: 16,
                  }} numberOfLines={2}>{item.snippet}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Local Cuisine — horizontal scroll ──────────────── */}
      {(ctx?.cuisine ?? []).length > 0 && (
        <View style={{ marginTop: 24 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader accent="Local Cuisine" title="Must-Try Dishes" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH * 0.7 + 12}
          >
            {(ctx.cuisine as any[]).map((dish: any, idx: number) => (
              <View key={dish.id || idx} style={{
                width: SCREEN_WIDTH * 0.7, height: 200, borderRadius: 14, overflow: 'hidden',
              }}>
                {dish.image ? (
                  <Image source={{ uri: dish.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name="cutlery" size={28} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  locations={[0.4, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}
                >
                  <Text style={{ ...TextStyles.subhead, fontWeight: '700', color: '#fff', fontFamily: FontFamily.serif }}>{dish.name}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Essential Phrases ─────────────────────────────── */}
      {(ctx?.phrases ?? []).length > 0 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader accent={ctx?.country?.language || 'Local Language'} title="Essential Phrases" />
          <View style={{ gap: 8 }}>
            {(Array.isArray(ctx.phrases) ? ctx.phrases : Object.entries(ctx.phrases).map(([en, local]: any) => ({ english: en, local }))).slice(0, 8).map((phrase: any, idx: number) => (
              <View key={idx} style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <Text style={{ ...TextStyles.body, fontWeight: '600', color: colors.text }}>{phrase.english || phrase.en || Object.keys(phrase)[0]}</Text>
                <Text style={{ ...TextStyles.body, color: ACCENT_COLOR, fontFamily: FontFamily.serif }}>{phrase.local || phrase.translation || Object.values(phrase)[0]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Cost of Living ────────────────────────────────── */}
      {ctx?.cost_of_living && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader accent="Budget" title="Cost of Living" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Budget meal', value: ctx.cost_of_living.budget_meal, icon: 'cutlery' },
              { label: 'Mid-range meal', value: ctx.cost_of_living.mid_range_meal, icon: 'cutlery' },
              { label: 'Coffee', value: ctx.cost_of_living.coffee, icon: 'coffee' },
              { label: 'Beer', value: ctx.cost_of_living.beer, icon: 'beer' },
              { label: 'Transport', value: ctx.cost_of_living.public_transport, icon: 'bus' },
              { label: 'Water', value: ctx.cost_of_living.water_bottle, icon: 'tint' },
            ].filter(i => i.value).map((item, idx) => (
              <View key={idx} style={{
                width: (SCREEN_WIDTH - 50) / 3, alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8,
              }}>
                <FontAwesome name={item.icon as any} size={16} color={ACCENT_COLOR} style={{ marginBottom: 6 }} />
                <Text style={{ ...TextStyles.bodyEm, fontWeight: '700', color: colors.text }}>{item.value}</Text>
                <Text style={{ ...TextStyles.xs, color: isDark ? '#7a7268' : '#a39688', textAlign: 'center', marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Before You Go (essentials footer) ────────────── */}
      <View style={{
        marginTop: 28, paddingHorizontal: 20, paddingTop: 20,
        borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        <Text style={{
          ...TextStyles.title,
          color: colors.text, marginBottom: 16,
        }}>Before You Go</Text>

        {/* Quick Facts — from trip_context */}
        {buildQuickFacts(ctx).length > 0 && (
          <>
            <Text style={{
              ...TextStyles.xs, fontWeight: '700', letterSpacing: 1.5,
              textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 10,
            }}>At a Glance</Text>
            {buildQuickFacts(ctx).map((f) => (
              <Text key={f.bold} style={{ ...TextStyles.body, color: isDark ? '#9e9689' : '#7a6e63', marginBottom: 6, lineHeight: 18 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{f.bold}</Text>{f.text ? ` · ${f.text}` : ''}
              </Text>
            ))}
          </>
        )}

        {/* Safety & Country info */}
        {ctx?.country?.safety && (
          <>
            <Text style={{
              ...TextStyles.xs, fontWeight: '700', letterSpacing: 1.5,
              textTransform: 'uppercase', color: ACCENT_COLOR, marginTop: 18, marginBottom: 10,
            }}>Good to Know</Text>
            <Text style={{ ...TextStyles.body, color: isDark ? '#9e9689' : '#7a6e63', marginBottom: 6, lineHeight: 18 }}>
              {ctx.country.safety}
            </Text>
          </>
        )}

        {/* Emergency */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 16,
          marginTop: 14, paddingTop: 12,
          borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}>
          <Text style={{
            ...TextStyles.xs, fontWeight: '700', letterSpacing: 1,
            textTransform: 'uppercase', color: isDark ? '#9e9689' : '#7a6e63',
          }}>Emergency</Text>
          {buildEmergencyInfo(ctx).map((e) => (
            <Pressable
              key={e.number}
              onPress={() => Linking.openURL(`tel:${e.number}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ ...TextStyles.subhead, fontSize: 15, fontWeight: '700', color: 'rgba(239,68,68,0.7)' }}>{e.number}</Text>
              <Text style={{ ...TextStyles.xs, color: isDark ? '#7a7268' : '#a39688' }}>{e.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    </View>
    </PageTransition>
  );
}

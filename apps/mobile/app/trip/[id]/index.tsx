import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, ScrollView, Text, Pressable, Linking,
  Dimensions, useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  upscaleGoogleImage,
  TextStyles, FontFamily,
} from '@travyl/shared';
import { PageTransition } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_W = 30; // matches SIDE_TAB_W in _layout
const CONTENT_WIDTH = SCREEN_WIDTH - SIDEBAR_W;
const ACCENT_COLOR = '#c8a96a';
const WEB_API = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL || 'https://api.dev.gotravyl.com';

// ─── Accent label + serif heading ────────────────────────
const TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;

function SectionHeader({ accent, title }: { accent: string; title: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{
        ...TextStyles.xs, fontWeight: '700', letterSpacing: 3,
        textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 4,
        ...TEXT_SHADOW,
      }}>{accent}</Text>
      <Text style={{
        ...TextStyles.headline, fontSize: 22, color: '#fff',
        ...TEXT_SHADOW,
      }}>{title}</Text>
    </View>
  );
}

// ─── Build explore items from all trip_context sources ───
function buildExploreItems(ctx: any) {
  if (!ctx) return [];
  const items: any[] = [];
  const seen = new Set<string>();
  const hiRes = (url: string | undefined) => upscaleGoogleImage(url) || url;
  for (const e of ctx.explore_items ?? []) {
    if (e.title && !seen.has(e.title) && e.image) {
      seen.add(e.title);
      items.push({ id: e.id || e.title, title: e.title, description: e.description || '', category: e.category || 'Sightseeing', image: hiRes(e.image) });
    }
  }
  for (const v of ctx.foursquare_venues ?? []) {
    const name = v.title || v.name;
    if (name && !seen.has(name) && v.image) {
      seen.add(name);
      items.push({ id: v.id || name, title: name, description: v.description || v.category || '', category: v.category || 'Venue', image: hiRes(v.image) });
    }
  }
  let rc = 0;
  for (const r of ctx.restaurants ?? []) {
    if (rc >= 3) break;
    if (r.name && !seen.has(r.name)) {
      seen.add(r.name);
      items.push({ id: r.id || r.name, title: r.name, description: r.tip || r.category || 'Restaurant', category: 'Dining', image: hiRes(r.image) });
      rc++;
    }
  }
  return items;
}

// ─── Currency symbol helper ─────────────────────────────
function getCurrencySymbol(ctx: any): string {
  const sym = ctx?.country?.currency?.symbol || ctx?.quick_facts?.currency?.match(/\(([^)]+)\)/)?.[1];
  if (sym) return sym;
  const code = ctx?.country?.currency?.code || '';
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF', AUD: 'A$', CAD: 'C$', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', THB: '฿', BRL: 'R$', MXN: '$', INR: '₹', KRW: '₩', TRY: '₺' };
  return symbols[code] || code || '$';
}

// ─── Main Screen ─────────────────────────────────────────
export default function OverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip } = useItineraryScreen(id);
  const isDark = useColorScheme() === 'dark';
  const scrollRef = useRef<ScrollView>(null);

  const ctx = trip?.trip_context as any;
  const storedExploreItems = buildExploreItems(ctx);
  const news = ctx?.news ?? [];
  const currencySymbol = getCurrencySymbol(ctx);
  const tripLat = ctx?.lat;
  const tripLng = ctx?.lng;

  // ─── Fetch fresh explore items from API (like web does) ─
  const destination = trip?.destination || '';
  const [liveExploreItems, setLiveExploreItems] = useState<any[]>([]);
  useEffect(() => {
    // Use lat/lng if available, otherwise fetch by city name via places API
    const fetchPlaces = async (lat: number, lng: number) => {
      const cats = ['sightseeing', 'restaurant', 'museum', 'park'];
      const results = await Promise.all(cats.map(cat =>
        fetch(`${WEB_API}/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=4`)
          .then(r => r.ok ? r.json() : []).catch(() => [])
      ));
      const seen = new Set<string>();
      return results.flat().filter((p: any) => {
        if (!p.name || seen.has(p.id || p.name)) return false;
        seen.add(p.id || p.name);
        return true;
      }).map((p: any) => ({
        id: p.id, title: p.name, description: p.description || p.category,
        category: p.category, image: upscaleGoogleImage(p.image) || p.image,
      }));
    };

    if (tripLat && tripLng) {
      fetchPlaces(tripLat, tripLng).then(items => { if (items.length > 0) setLiveExploreItems(items); });
    } else if (destination) {
      // Geocode the destination city first
      const city = destination.split(',')[0].trim();
      fetch(`${WEB_API}/api/places?q=${encodeURIComponent(city)}&category=sightseeing&limit=8`)
        .then(r => r.ok ? r.json() : [])
        .then(items => {
          if (Array.isArray(items) && items.length > 0) {
            setLiveExploreItems(items.map((p: any) => ({
              id: p.id, title: p.name, description: p.description || p.category,
              category: p.category, image: p.image,
            })));
          }
        })
        .catch(() => {});
    }
  }, [tripLat, tripLng, destination]);

  // Use live data if available, fall back to trip_context
  const exploreItems = liveExploreItems.length > 0 ? liveExploreItems : storedExploreItems;

  // Quote removed — matching web

  // ─── Normalize phrases to array ───────────────────────
  const phrases = useMemo(() => {
    if (!ctx?.phrases) return [];
    if (Array.isArray(ctx.phrases)) return ctx.phrases;
    return Object.entries(ctx.phrases).map(([en, local]: any) => ({ english: en, local }));
  }, [ctx?.phrases]);

  // ─── Cost of living items — handle both API key formats ─
  const costItems = useMemo(() => {
    const c = ctx?.cost_of_living;
    if (!c) return [];
    return [
      { label: 'Budget Meal', value: c.budget_meal ?? c.meal_cheap, icon: 'cutlery' as const },
      { label: 'Mid-Range', value: c.mid_range_meal ?? c.meal_mid, icon: 'cutlery' as const },
      { label: 'Coffee', value: c.coffee, icon: 'coffee' as const },
      { label: 'Beer', value: c.beer, icon: 'beer' as const },
      { label: 'Transport', value: c.public_transport, icon: 'bus' as const },
      { label: 'Water', value: c.water_bottle, icon: 'tint' as const },
    ].filter(i => i.value != null);
  }, [ctx?.cost_of_living]);

  return (
    <PageTransition>
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >

      {/* Gradient fade from hero into content */}
      <LinearGradient
        colors={['transparent', isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)']}
        locations={[0, 0.4, 1]}
        style={{ height: 80 }}
      />

      {/* Opaque content area — prevents hero bleed between sections */}
      <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)' }}>

      {/* ─── Things to Do — horizontal scroll cards ───────── */}
      <View>
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader accent="Explore" title="Things to Do" />
        </View>
        {exploreItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            decelerationRate="fast"
            snapToInterval={CONTENT_WIDTH - 28}
            pagingEnabled={false}
          >
            {exploreItems.map((item: any, idx: number) => (
              <View key={item.id || idx} style={{
                width: CONTENT_WIDTH - 40, height: 240, borderRadius: 14, overflow: 'hidden',
              }}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name="compass" size={32} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                  locations={[0, 0.4, 1]}
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                />
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
        ) : (
          <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
            <FontAwesome name="compass" size={28} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
            <Text style={{ ...TextStyles.caption, color: isDark ? '#7a7268' : '#a39688', marginTop: 8, textAlign: 'center' }}>
              Explore items will appear here once your trip is enriched
            </Text>
          </View>
        )}
      </View>

      {/* Quote removed — matching web */}

      {/* ─── What's Going On — dark gradient news cards ───── */}
      {news.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <SectionHeader accent="What's Happening" title="What's Going On" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            decelerationRate="fast"
            snapToInterval={CONTENT_WIDTH - 60}
          >
            {news.map((item: any, i: number) => {
              const gradients: [string, string][] = [['#1a1a2e', '#16213e'], ['#0f3460', '#1a1a2e'], ['#2c3e50', '#1a1a2e'], ['#1b2838', '#0f3460']];
              const grad = gradients[i % gradients.length];
              return (
                <Pressable
                  key={item.id || i}
                  onPress={() => item.url && Linking.openURL(item.url)}
                  style={{ width: CONTENT_WIDTH - 60, height: 200, borderRadius: 14, overflow: 'hidden' }}
                >
                  <LinearGradient
                    colors={[grad[0], grad[1]]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
                  >
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
      )}

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
            snapToInterval={CONTENT_WIDTH - 28}
            pagingEnabled={false}
          >
            {(ctx.cuisine as any[]).map((dish: any, idx: number) => (
              <View key={dish.id || idx} style={{
                width: CONTENT_WIDTH - 40, height: 240, borderRadius: 14, overflow: 'hidden',
              }}>
                {dish.image ? (
                  <Image source={{ uri: dish.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
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

      {/* ─── Essential Phrases — vertical scroll, 2 per row ── */}
      {phrases.length > 0 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader accent={ctx?.country?.language || 'Local Language'} title="Essential Phrases" />
          <View style={{
            height: 52 * 2 + 8, // 2 visible rows + gap
            borderRadius: 12, overflow: 'hidden',
          }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={{ gap: 8 }}
            >
              {phrases.slice(0, 12).reduce((rows: any[][], phrase: any, idx: number) => {
                if (idx % 2 === 0) rows.push([phrase]);
                else rows[rows.length - 1].push(phrase);
                return rows;
              }, []).map((pair: any[], rowIdx: number) => (
                <View key={rowIdx} style={{ flexDirection: 'row', gap: 8 }}>
                  {pair.map((phrase: any, colIdx: number) => {
                    const en = phrase.english || phrase.en || Object.keys(phrase)[0];
                    const local = phrase.local || phrase.translation || Object.values(phrase)[0];
                    return (
                      <View key={colIdx} style={{
                        flex: 1,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                        borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      }}>
                        <Text style={{ ...TextStyles.xs, color: isDark ? '#9e9689' : '#7a6e63', marginBottom: 2 }}>{en}</Text>
                        <Text style={{ ...TextStyles.bodyEm, fontWeight: '700', color: ACCENT_COLOR, fontFamily: FontFamily.serif }} numberOfLines={1}>{local}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ─── Cost of Living ────────────────────────────────── */}
      {costItems.length > 0 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader accent="Budget" title="Cost of Living" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {costItems.map((item, idx) => (
              <View key={idx} style={{
                width: '31%', alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4,
              }}>
                <FontAwesome name={item.icon} size={14} color={ACCENT_COLOR} style={{ marginBottom: 4 }} />
                <Text style={{ ...TextStyles.body, fontWeight: '700', color: '#fff', fontSize: 13 }} numberOfLines={1}>
                  {currencySymbol}{typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                </Text>
                <Text style={{ ...TextStyles.xs, color: isDark ? '#7a7268' : '#a39688', textAlign: 'center', marginTop: 2, fontSize: 10 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Nearby Cities / Day Trips ─────────────────────── */}
      {(ctx?.nearby_cities ?? []).length > 0 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader accent="Day Trips" title="Also Consider Visiting" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(ctx.nearby_cities as any[]).map((city: any) => (
              <View key={city.id || city.name} style={{
                width: (SCREEN_WIDTH - 50) / 2,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 12, padding: 14,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FontAwesome name="map-marker" size={12} color={ACCENT_COLOR} />
                  <Text style={{ ...TextStyles.bodyLg, fontWeight: '700', color: '#fff' }}>{city.name}</Text>
                </View>
                {city.country && <Text style={{ ...TextStyles.xs, color: isDark ? '#7a7268' : '#a39688' }}>{city.country}</Text>}
                {city.distance && <Text style={{ ...TextStyles.xs, fontWeight: '600', color: ACCENT_COLOR, marginTop: 4 }}>{Math.round(city.distance)} km away</Text>}
              </View>
            ))}
          </View>
        </View>
      )}

      </View>{/* end opaque content area */}

      {/* ─── Bottom Photo Bleed — hero image fades back in ── */}
      {(() => {
        const heroUrl = ctx?.hero_image_url || ctx?.hero_images?.[0];
        if (!heroUrl) return null;
        return (
          <View style={{ height: 360, overflow: 'hidden' }}>
            <Image
              source={{ uri: heroUrl.includes?.('googleusercontent.com') ? heroUrl.replace(/=w\d+-h\d+[^&]*/, '=w1200-h800-k-no') : heroUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              contentPosition="bottom"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={[isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)', 'rgba(0,0,0,0.3)', 'transparent']}
              locations={[0, 0.35, 0.7]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}
              pointerEvents="none"
            />
          </View>
        );
      })()}

    </ScrollView>
    </View>
    </PageTransition>
  );
}



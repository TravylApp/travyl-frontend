import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, ScrollView, Text, Pressable, Modal, Linking,
  Dimensions, useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  upscaleGoogleImage,
  Brand, Navy, getWebApiBase,
  TextStyles, FontFamily,
  type PlaceItem,
} from '@travyl/shared';
import { CardStackCarousel } from '../../../components/places/CardStackCarousel';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import { PageTransition, SIDE_TAB_W } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - SIDE_TAB_W;
const ACCENT_COLOR = Brand.gold;
const WEB_API = getWebApiBase();

// ─── Accent label + serif heading ────────────────────────
const TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;

function SectionHeader({ accent, title, dark }: { accent: string; title: string; dark?: boolean }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{
        ...TextStyles.captionEm, letterSpacing: 3,
        textTransform: 'uppercase', marginBottom: 4,
        fontFamily: 'Satoshi-Bold',
        color: dark ? ACCENT_COLOR : '#6b5a3e',
      }}>{accent}</Text>
      <Text style={{
        ...TextStyles.headline,
        fontFamily: 'Satoshi-Light',
        color: dark ? ACCENT_COLOR : Navy.DEFAULT,
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
  const { trip, refetch } = useItineraryScreen(id);
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip(id);
  const isDark = useColorScheme() === 'dark';
  const scrollRef = useRef<ScrollView>(null);

  const ctx = trip?.trip_context as any;
  const storedExploreItems = buildExploreItems(ctx);
  const events = ctx?.events ?? [];
  const news = ctx?.news ?? [];
  const currencySymbol = getCurrencySymbol(ctx);
  const tripLat = ctx?.lat;
  const tripLng = ctx?.lng;

  // ─── Fetch fresh explore items from API (like web does) ─
  const destination = trip?.destination || '';
  const [liveExploreItems, setLiveExploreItems] = useState<any[]>([]);
  const liveExploreRef = useRef<any[]>([]);
  useEffect(() => {
    // Fetch diverse places using city name NLP search (returns all categories)
    const city = destination.split(',')[0].trim();
    if (!city || city === 'Destination') return;

    const query = tripLat && tripLng
      ? `${WEB_API}/api/places?q=${encodeURIComponent(city + ' things to do')}&lat=${tripLat}&lng=${tripLng}&limit=20`
      : `${WEB_API}/api/places?q=${encodeURIComponent(city + ' things to do')}&limit=20`;

    fetch(query)
      .then(r => r.ok ? r.json() : [])
      .then((items: any[]) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const seen = new Set<string>();
        const deduped = items.filter((p: any) => {
          if (!p.name || seen.has(p.id || p.name)) return false;
          seen.add(p.id || p.name);
          return true;
        }).map((p: any) => ({
          id: p.id, title: p.name, description: p.description || p.category,
          category: p.category, image: upscaleGoogleImage(p.image) || p.image,
          lat: p.lat ?? p.latitude, lng: p.lng ?? p.longitude,
          address: p.address, website: p.website, rating: p.rating,
        }));
        if (deduped.length > 0) {
          liveExploreRef.current = deduped;
          setLiveExploreItems(deduped);
        }
      })
      .catch(() => {});
  }, [tripLat, tripLng, destination]);

  // Use live data if available, fall back to ref (survives remount), then trip_context
  const exploreItems = liveExploreItems.length > 0
    ? liveExploreItems
    : liveExploreRef.current.length > 0
      ? liveExploreRef.current
      : storedExploreItems;

  // ─── Auto-enrich if missing events, cuisine, or news ────
  const enrichedRef = useRef(false);
  useEffect(() => {
    if (!trip?.id || enrichedRef.current) return;
    const missing = !ctx?.events?.length || !ctx?.cuisine?.length || !ctx?.news?.length;
    if (!missing) return;
    enrichedRef.current = true;
    fetch(`${WEB_API}/api/trips/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEB_API ? { 'Origin': WEB_API } : {}),
      },
      body: JSON.stringify({ tripId: trip.id }),
    }).then(r => {
      if (r.ok) {
        setTimeout(() => refetch(), 2000);
        setTimeout(() => refetch(), 6000);
        setTimeout(() => refetch(), 12000);
      }
    }).catch(() => {});
  }, [trip?.id, ctx?.events, ctx?.cuisine, ctx?.news]);

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

  // ─── Place showcase state ────────────────────────────
  const [showcaseIdx, setShowcaseIdx] = useState(-1);
  const explorePlaces: PlaceItem[] = useMemo(() =>
    exploreItems.map((item: any, i: number) => ({
      id: item.id || `explore-${i}`,
      name: item.title || item.name || '',
      image: item.image || '',
      images: item.image ? [item.image] : [],
      type: 'attraction' as const,
      rating: item.rating ?? 4.0,
      tagline: item.description || '',
      category: item.category || '',
      description: item.description,
      tags: item.tags ?? [item.category].filter(Boolean),
      latitude: item.lat,
      longitude: item.lng,
      website: item.website,
      address: item.address,
    })),
    [exploreItems],
  );

  // ─── News reader state ──────────────────────────────
  const [newsItem, setNewsItem] = useState<any>(null);

  return (
    <PageTransition>
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >

      {/* Smooth fade from hero into content */}
      <LinearGradient
        colors={['transparent', isDark ? '#0d0d0d' : '#f8f7f5']}
        style={{ height: 20 }}
      />

      {/* Opaque content area */}
      <View style={{ backgroundColor: isDark ? '#0d0d0d' : '#f8f7f5' }}>

      {/* ─── Things to Do — horizontal scroll cards ───────── */}
      <View>
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader dark={isDark} accent="Explore" title="Things to Do" />
        </View>
        {explorePlaces.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            contentContainerStyle={{ paddingHorizontal: 0 }}
            decelerationRate="fast"
          >
            {explorePlaces.map((place) => (
              <View key={place.id} style={{ width: CONTENT_WIDTH, paddingHorizontal: 20 }}>
              <Pressable
                onPress={() => setShowcaseIdx(explorePlaces.indexOf(place))}
                style={{ width: CONTENT_WIDTH - 40, height: 240, borderRadius: 14, overflow: 'hidden' }}
              >
                {place.image ? (
                  <Image source={{ uri: place.image, headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
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
                  }}>{place.category}</Text>
                </View>
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                  <Text style={{
                    ...TextStyles.subhead, color: '#fff', marginBottom: 4,
                  }}>{place.name}</Text>
                  <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.75)', lineHeight: 16 }} numberOfLines={2}>
                    {place.tagline}
                  </Text>
                </View>
              </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
            <FontAwesome name="compass" size={28} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
            <Text style={{ ...TextStyles.caption, color: isDark ? '#a09488' : '#8a7e72', marginTop: 8, textAlign: 'center' }}>
              Explore items will appear here once your trip is enriched
            </Text>
          </View>
        )}
      </View>

      {/* Quote removed — matching web */}

      {/* ─── What's Going On — events only ───── */}
      {events.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader dark={isDark} accent="What's Happening" title="What's Going On" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            contentContainerStyle={{ paddingHorizontal: 0 }}
            decelerationRate="fast"
          >
            {events.map((item: any, i: number) => {
              const hasImage = !!item.image;
              return (
                <View key={item.id || i} style={{ width: CONTENT_WIDTH, paddingHorizontal: 20 }}>
                <Pressable
                  onPress={() => item.ticketUrl && WebBrowser.openBrowserAsync(item.ticketUrl)}
                  style={{ width: CONTENT_WIDTH - 40, height: 240, borderRadius: 14, overflow: 'hidden' }}
                >
                  {hasImage && (
                    <Image
                      source={{ uri: item.image, headers: { Referer: '' } }}
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  )}
                  <LinearGradient
                    colors={hasImage
                      ? ['transparent', 'rgba(0,0,0,0.85)']
                      : ['#1a1a2e', '#16213e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    locations={hasImage ? [0.2, 1] : undefined}
                    style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
                  >
                    <Text style={{
                      ...TextStyles.xs, fontWeight: '700', letterSpacing: 1.5,
                      textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 6,
                    }}>
                      {item.category ?? 'Event'}
                      {item.date ? <Text style={{ opacity: 0.5 }}> · {item.date}</Text> : null}
                    </Text>
                    <Text style={{
                      ...TextStyles.subhead, fontFamily: FontFamily.serif,
                      color: '#fff', lineHeight: 21, marginBottom: 4,
                    }} numberOfLines={2}>{item.title}</Text>
                    {item.venue && (
                      <Text style={{
                        ...TextStyles.caption, color: 'rgba(255,255,255,0.55)', lineHeight: 17,
                      }} numberOfLines={1}>{item.venue}</Text>
                    )}
                  </LinearGradient>
                </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── In the News — always its own section ───── */}
      {news.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader dark={isDark} accent="Travel Updates" title="In the News" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            contentContainerStyle={{ paddingHorizontal: 0 }}
            decelerationRate="fast"
          >
            {news.map((item: any, i: number) => {
              const gradients: [string, string][] = [['#1a1a2e', '#16213e'], ['#0f3460', '#1a1a2e'], ['#2c3e50', '#1a1a2e'], ['#1b2838', '#0f3460']];
              const grad = gradients[i % gradients.length];
              const hasImage = !!item.image;
              return (
                <View key={item.id || i} style={{ width: CONTENT_WIDTH, paddingHorizontal: 20 }}>
                <Pressable
                  onPress={() => setNewsItem(item)}
                  style={{ width: CONTENT_WIDTH - 40, height: 240, borderRadius: 14, overflow: 'hidden' }}
                >
                  {hasImage && (
                    <Image
                      source={{ uri: item.image, headers: { Referer: '' } }}
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  )}
                  <LinearGradient
                    colors={hasImage
                      ? ['transparent', 'rgba(0,0,0,0.85)']
                      : [grad[0], grad[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    locations={hasImage ? [0.25, 1] : undefined}
                    style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
                  >
                    <Text style={{
                      ...TextStyles.xs, fontWeight: '700', letterSpacing: 1.5,
                      textTransform: 'uppercase', color: ACCENT_COLOR, marginBottom: 6,
                    }}>
                      {item.category}
                      {item.source ? <Text style={{ opacity: 0.5 }}> · {item.source}</Text> : null}
                    </Text>
                    <Text style={{
                      ...TextStyles.subhead, fontFamily: FontFamily.serif,
                      color: '#fff', lineHeight: 21, marginBottom: 4,
                    }} numberOfLines={2}>{item.title}</Text>
                    <Text style={{
                      ...TextStyles.caption, color: 'rgba(255,255,255,0.6)', lineHeight: 17,
                    }} numberOfLines={2}>{item.snippet}</Text>
                  </LinearGradient>
                </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── Local Cuisine — horizontal scroll ──────────────── */}
      {(ctx?.cuisine ?? []).length > 0 && (
        <View style={{ marginTop: 24 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader dark={isDark} accent="Local Cuisine" title="Must-Try Dishes" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            contentContainerStyle={{ paddingHorizontal: 0 }}
            decelerationRate="fast"
          >
            {(ctx.cuisine as any[]).map((dish: any, idx: number) => (
              <View key={dish.id || idx} style={{ width: CONTENT_WIDTH, paddingHorizontal: 20 }}>
              <View style={{
                width: CONTENT_WIDTH - 40, height: 240, borderRadius: 14, overflow: 'hidden',
              }}>
                {dish.image ? (
                  <Image source={{ uri: dish.image, headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name="cutlery" size={28} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  locations={[0.35, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}
                >
                  <Text style={{ ...TextStyles.subhead, fontWeight: '700', color: '#fff', fontFamily: FontFamily.serif }}>{dish.name}</Text>
                  {dish.restaurant && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <FontAwesome name="map-marker" size={12} color={ACCENT_COLOR} style={{ marginRight: 5 }} />
                      <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                        {dish.restaurant}
                        {dish.rating ? ` · ★ ${dish.rating}` : ''}
                        {dish.priceLevel ? ` · ${dish.priceLevel}` : ''}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Essential Phrases — vertical scroll, 2 per row ── */}
      {phrases.length > 0 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader dark={isDark} accent={ctx?.country?.language || 'Local Language'} title="Essential Phrases" />
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
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                        borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      }}>
                        <Text style={{ ...TextStyles.caption, color: isDark ? 'rgba(255,255,255,0.5)' : '#8a7e72', marginBottom: 2 }}>{en}</Text>
                        <Text style={{ ...TextStyles.bodyXlEm, color: isDark ? ACCENT_COLOR : Navy.DEFAULT, fontFamily: FontFamily.serif }} numberOfLines={1}>{local}</Text>
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
          <SectionHeader dark={isDark} accent="Budget" title="Cost of Living" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {costItems.map((item, idx) => (
              <View key={idx} style={{
                width: '31%', alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                borderRadius: 10, paddingVertical: 12, paddingHorizontal: 4,
                borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }}>
                <FontAwesome name={item.icon} size={14} color={isDark ? ACCENT_COLOR : '#8b7355'} style={{ marginBottom: 6 }} />
                <Text style={{ ...TextStyles.bodyXlEm, color: isDark ? '#fff' : Navy.DEFAULT }} numberOfLines={1}>
                  {currencySymbol}{typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                </Text>
                <Text style={{ ...TextStyles.sm, color: isDark ? 'rgba(255,255,255,0.45)' : '#8a7e72', textAlign: 'center', marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Nearby Cities / Day Trips ─────────────────────── */}
      {(ctx?.nearby_cities ?? []).length > 0 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader dark={isDark} accent="Day Trips" title="Also Consider Visiting" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(ctx.nearby_cities as any[]).map((city: any) => (
              <View key={city.id || city.name} style={{
                width: (SCREEN_WIDTH - 50) / 2,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FontAwesome name="map-marker" size={12} color={isDark ? ACCENT_COLOR : '#8b7355'} />
                  <Text style={{ ...TextStyles.bodyLg, fontWeight: '700', color: isDark ? '#fff' : Navy.DEFAULT }}>{city.name}</Text>
                </View>
                {city.country && <Text style={{ ...TextStyles.xs, color: isDark ? 'rgba(255,255,255,0.45)' : '#8a7e72' }}>{city.country}</Text>}
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
              source={{ uri: heroUrl.includes?.('googleusercontent.com') ? heroUrl.replace(/=w\d+-h\d+[^&]*/, '=w1200-h800-k-no') : heroUrl, headers: { Referer: '' } }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              contentPosition="bottom"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={[isDark ? '#0d0d0d' : '#f8f7f5', 'rgba(0,0,0,0.3)', 'transparent']}
              locations={[0, 0.35, 0.7]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}
              pointerEvents="none"
            />
          </View>
        );
      })()}

    </ScrollView>

    {/* ─── Place Showcase — same as Places tab ─────────────── */}
    {showcaseIdx >= 0 && explorePlaces[showcaseIdx] && (
      <CardStackCarousel
        places={explorePlaces}
        initialIndex={showcaseIdx}
        favorites={[]}
        onToggleFav={() => {}}
        onAddToTrip={addToTrip}
        tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
        overlay
        onClose={() => setShowcaseIdx(-1)}
      />
    )}

    {/* ─── News Reader Modal ───────────────────────────────── */}
    {newsItem && (
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewsItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: isDark ? '#0d0d0d' : '#fff' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
            borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          }}>
            <Pressable onPress={() => setNewsItem(null)} hitSlop={12}>
              <FontAwesome name="times" size={22} color={isDark ? '#fff' : '#333'} />
            </Pressable>
            <Text style={{
              ...TextStyles.xs, textTransform: 'uppercase', letterSpacing: 1.2,
              color: ACCENT_COLOR, fontWeight: '700',
            }}>
              {newsItem.category}
            </Text>
            {newsItem.url ? (
              <Pressable onPress={() => Linking.openURL(newsItem.url)} hitSlop={12}>
                <FontAwesome name="external-link" size={18} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
              </Pressable>
            ) : <View style={{ width: 22 }} />}
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Source + date */}
            <Text style={{
              ...TextStyles.caption, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
              marginBottom: 8,
            }}>
              {newsItem.source}{newsItem.date ? ` · ${new Date(newsItem.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
            </Text>

            {/* Title */}
            <Text style={{
              ...TextStyles.headline,
              color: isDark ? '#fff' : '#1a1a1a', lineHeight: 32, marginBottom: 16,
            }}>
              {newsItem.title}
            </Text>

            {/* Image if available */}
            {newsItem.image && (
              <Image
                source={{ uri: newsItem.image, headers: { Referer: '' } }}
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }}
                contentFit="cover"
              />
            )}

            {/* Snippet */}
            <Text style={{
              ...TextStyles.subhead,
              color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
            }}>
              {newsItem.snippet}
            </Text>

            {/* Read full article button */}
            {newsItem.url && (
              <Pressable
                onPress={() => Linking.openURL(newsItem.url)}
                style={{
                  marginTop: 24, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(212,181,122,0.15)' : 'rgba(212,181,122,0.1)',
                  borderWidth: 1, borderColor: 'rgba(212,181,122,0.3)',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  ...TextStyles.subhead, color: ACCENT_COLOR, fontWeight: '700',
                }}>
                  Read Full Article <FontAwesome name="external-link" size={13} color={ACCENT_COLOR} />
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    )}

    </View>
    </PageTransition>
  );
}



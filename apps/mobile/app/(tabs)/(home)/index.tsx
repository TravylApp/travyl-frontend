import { useState, useRef, useCallback, useEffect, useMemo, type RefObject } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useHomeScreen,
  useHeroConfig,
  useTripPlanner,
  useTrendingDestinations,
  getWebApiBase,
  shuffle,
  Blue,
  hexToRgba,
  TextStyles,
  FontSize,
  FontFamily,
} from '@travyl/shared';
import { savePlanToSupabase } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import { PaperPlane } from '@/components/icons/PaperPlane';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import {
  HowItWorks,
  GetInspired,
  TravelMosaic,
  ExplorePreview,
  TagUs,
  FadeInOnScroll,
  OceanWave,
  Footer,
} from '@/components/home';
import { TakeoffTransition } from '@/components/home/TakeoffTransition';

// Stock hero images — high-res Unsplash direct links, always available
// Includes the same images used on the web app + additional variety
const STOCK_HERO_SLIDES = [
  // ── All web images included ──
  'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=80', // tropical beach (web hero fallback)
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80', // mountain lake (web parallax)
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&q=80', // hot air balloons (web parallax)
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80', // misty mountains (web parallax)
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80', // road trip (web parallax)
  'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=80', // travel planning map (web HowItWorks)
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80', // Rome Colosseum (web HowItWorks)
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80', // Bali temple (web HowItWorks)
  // ── Mobile extra variety ──
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80', // Paris Eiffel Tower
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80', // Tokyo skyline
  'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80', // Santorini blue domes
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80', // Dubai skyline
  'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1200&q=80', // Sydney Opera House
];
const SHUFFLED_STOCK = shuffle(STOCK_HERO_SLIDES).slice(0, 5);

// Dynamic hero images — fetched from trending destinations each session

const PILLS_VISIBLE = 3;

function AnimatedCounter({
  value,
  suffix,
  decimals = 0,
  trigger,
  textColor,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  trigger: boolean;
  textColor?: string;
}) {
  const [display, setDisplay] = useState(`0${suffix}`);

  useEffect(() => {
    if (!trigger) return;
    const duration = 2000;
    const start = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;

      if (decimals > 0) {
        setDisplay(current.toFixed(decimals) + suffix);
      } else {
        setDisplay(Math.round(current).toLocaleString() + suffix);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, value, suffix, decimals]);

  return (
    <Text style={{ ...TextStyles.display, color: textColor || '#2a1f17', marginBottom: 2 }}>
      {display}
    </Text>
  );
}

function HeroSlideImage({ uri, isActive }: { uri: string; isActive: boolean }) {
  const opacity = useSharedValue(isActive ? 1 : 0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Don't animate until the image has loaded — prevents flash
    if (!loaded) return;
    opacity.value = withTiming(isActive ? 1 : 0, { duration: 1500 });
  }, [isActive, loaded]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    opacity: opacity.value,
  }));

  return (
    <Animated.Image
      source={{ uri }}
      onLoad={() => {
        setLoaded(true);
        if (isActive) opacity.value = withTiming(1, { duration: 800 });
      }}
      style={style}
      resizeMode="cover"
    />
  );
}

function StatsSection({ scrollY, screenHeight }: { scrollY: { value: number }; screenHeight: number }) {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const sectionY = useSharedValue(0);
  const triggered = useSharedValue(false);
  const [liveStats, setLiveStats] = useState([
    { numericValue: 0, suffix: '+', decimals: 0, label: 'DESTINATIONS', desc: 'Real places our community has explored.' },
    { numericValue: 0, suffix: '', decimals: 0, label: 'TRAVELERS', desc: 'People planning their next adventure.' },
    { numericValue: 0, suffix: '+', decimals: 0, label: 'TRIPS PLANNED', desc: 'AI-powered itineraries created and counting.' },
  ]);

  // Fetch real stats from API
  useEffect(() => {
    const API = getWebApiBase() || 'https://dev.gotravyl.com';
    try { new URL(`${API}/api/stats`); } catch { return; }
    fetch(`${API}/api/stats`).then(r => r.ok ? r.json() : null).then(data => {
      if (data) {
        setLiveStats([
          { numericValue: data.destinations ?? 0, suffix: '+', decimals: 0, label: 'DESTINATIONS', desc: 'Real places our community has explored.' },
          { numericValue: data.travelers ?? 0, suffix: '', decimals: 0, label: 'TRAVELERS', desc: 'People planning their next adventure.' },
          { numericValue: data.trips ?? 0, suffix: '+', decimals: 0, label: 'TRIPS PLANNED', desc: 'AI-powered itineraries created and counting.' },
        ]);
      }
    }).catch(() => {});
  }, []);

  useAnimatedReaction(
    () => scrollY.value,
    (sv) => {
      if (!triggered.value && sectionY.value > 0 && sv + screenHeight > sectionY.value + 100) {
        triggered.value = true;
        runOnJS(setVisible)(true);
      }
    },
  );

  return (
    <View
      style={{
        backgroundColor: colors.sandBackground,
        paddingVertical: 40,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.sandBorder,
      }}
      onLayout={(e) => {
        sectionY.value = e.nativeEvent.layout.y;
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {liveStats.map((item, i) => (
          <Animated.View
            key={item.label}
            entering={FadeInUp.duration(500).delay(i * 150)}
            style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}
          >
            <AnimatedCounter
              value={item.numericValue}
              suffix={item.suffix}
              decimals={item.decimals}
              trigger={visible}
              textColor={colors.sandText}
            />
            <Text
              style={{
                ...TextStyles.micro,
                color: colors.sandTextSecondary,
                letterSpacing: 1.5,
                marginBottom: 6,
              }}
            >
              {item.label}
            </Text>
            <Text style={{ ...TextStyles.caption, color: colors.sandText, textAlign: 'center' }}>
              {item.desc}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip();
  const { height: screenHeight } = useWindowDimensions();
  const {
    tripQuery,
    setTripQuery,
    handleSearch,
    recentTrips,
    showRecentTrips,
    showLoadingSkeleton,
    showEmptyState,
  } = useHomeScreen();
  const { data: heroConfig } = useHeroConfig();
  const planner = useTripPlanner();

  // Trending destinations — used for suggestion pills, NOT for hero images
  const { data: trending } = useTrendingDestinations();

  // Hero slideshow — always high-res: admin config or Unsplash stock
  const heroSlides = heroConfig?.background_image_url
    ? [heroConfig.background_image_url]
    : SHUFFLED_STOCK;
  const [heroSlide, setHeroSlide] = useState(0);
  const [selectedPlaceIdx, setSelectedPlaceIdx] = useState(-1);
  const setSelectedPlace = useCallback((place: PlaceItem | null) => {
    if (!place) { setSelectedPlaceIdx(-1); return; }
    const idx = ([] as PlaceItem[]).findIndex((p) => p.id === place.id);
    setSelectedPlaceIdx(idx >= 0 ? idx : -1);
  }, []);
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Subtitle from API config only

  // Suggestion pills — trending (from shared hook) or heroConfig
  const allSuggestions = trending?.length
    ? trending.map((d, i) => ({ id: `td-${i}`, label: d.name, short_label: null }))
    : heroConfig?.suggestions?.length
      ? heroConfig.suggestions
      : [];
  const [pillGroup, setPillGroup] = useState(0);
  const pillGroupCount = Math.ceil(allSuggestions.length / PILLS_VISIBLE);
  useEffect(() => {
    if (pillGroupCount <= 1) return;
    const interval = setInterval(() => {
      setPillGroup((prev) => (prev + 1) % pillGroupCount);
    }, 3500);
    return () => clearInterval(interval);
  }, [pillGroupCount]);
  const visiblePills = allSuggestions.slice(
    pillGroup * PILLS_VISIBLE,
    pillGroup * PILLS_VISIBLE + PILLS_VISIBLE,
  );

  // Quote divider removed — no hardcoded content

  // Error state
  const [plannerError, setPlannerError] = useState<string | null>(null);

  // Destination autocomplete
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<{ name: string; country: string; fullName: string }[]>([]);
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    const q = tripQuery.trim();
    if (q.length < 2) { setAutocompleteSuggestions([]); return; }
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const API = process.env.EXPO_PUBLIC_WEB_API_URL || '';
        const res = await fetch(`${API}/api/autocomplete?q=${encodeURIComponent(q)}&mode=destination&limit=4`);
        if (!res.ok) { setAutocompleteSuggestions([]); return; }
        const data = await res.json();
        setAutocompleteSuggestions(Array.isArray(data) ? data.slice(0, 4) : []);
      } catch { setAutocompleteSuggestions([]); }
    }, 250);
    return () => { if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current); };
  }, [tripQuery]);

  // Conversational flow removed — direct AI planner
  const inputRef = useRef<TextInput>(null);

  const sendButtonRef = useRef<View>(null);
  const clarifyRetries = useRef(0);
  const [showTakeoff, setShowTakeoff] = useState(false);
  const buttonLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [buttonLayout, setButtonLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // When planner completes, save trip and navigate
  useEffect(() => {
    if (__DEV__) console.log('[HOME] planner phase:', planner.state.phase, 'showTakeoff:', showTakeoff);
    if (!showTakeoff) return;
    const s = planner.state;
    // Auto-answer clarifying questions during takeoff — pick first option for each (max 1 retry)
    if (s.phase === 'clarifying' && s.questions?.length) {
      if (clarifyRetries.current >= 3) {
        if (__DEV__) console.log('[HOME] Max clarify retries — forcing plan');
        // Instead of giving up, force plan with whatever we have
        const autoAnswers: Record<string, string> = {};
        for (const q of s.questions) {
          autoAnswers[q.id] = q.options?.[0] ?? 'flexible';
        }
        planner.submitAnswers(autoAnswers);
        return;
      }
      clarifyRetries.current += 1;
      if (__DEV__) console.log('[HOME] Auto-answering clarifying questions (attempt', clarifyRetries.current, ')');
      const autoAnswers: Record<string, string> = {};
      for (const q of s.questions) {
        autoAnswers[q.id] = q.options?.[0] ?? '';
      }
      planner.submitAnswers(autoAnswers);
      return;
    }
    if (s.phase === 'complete' && s.plan) {
      if (__DEV__) console.log('[HOME] Plan complete, saving...');
      (async () => {
        try {
          const tripId = await savePlanToSupabase(s.plan as any);
          // Navigate FIRST while takeoff animation is still covering the screen
          router.push(`/trip/${tripId}` as any);
          // Then clean up after navigation transition starts
          setTimeout(() => {
            planner.reset();
            setShowTakeoff(false);
          }, 800);
        } catch (err: any) {
          if (__DEV__) console.error('Failed to save trip:', err?.message || err);
          // Navigate anyway — trip was likely created, only activities may have failed
          const partialId = (err as any)?.tripId;
          if (partialId) {
            router.push(`/trip/${partialId}` as any);
            setTimeout(() => {
              planner.reset();
              setShowTakeoff(false);
            }, 800);
          } else {
            setPlannerError('Trip save failed. Please try again.');
            setTimeout(() => {
              planner.reset();
              setShowTakeoff(false);
            }, 2000);
          }
        }
      })();
    } else if (s.phase === 'error') {
      if (__DEV__) console.error('Trip planning failed:', s.message);
      const msg = s.message.includes('400')
        ? "Couldn't find that destination — try being more specific."
        : s.message.includes('403')
          ? 'Connection issue — please try again.'
          : `Something went wrong: ${s.message}`;
      setPlannerError(msg);
      // Show error for 2 seconds before dismissing animation
      setTimeout(() => {
        planner.reset();
        setShowTakeoff(false);
      }, 2000);
    }
  }, [planner.state.phase, showTakeoff]);

  const onButtonLayout = useCallback(() => {
    sendButtonRef.current?.measureInWindow((x, y, width, height) => {
      buttonLayoutRef.current = { x, y, width, height };
    });
  }, []);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const launchTakeoff = useCallback((query: string) => {
    setTripQuery(query);
    setButtonLayout(buttonLayoutRef.current);
    setShowTakeoff(true);
    clarifyRetries.current = 0;
    planner.submitPrompt(query);
  }, [setTripQuery, planner]);

  const onSearch = () => {
    const val = tripQuery.trim();
    if (!val) return;
    // Send directly to AI planner — no conversational flow
    setAutocompleteSuggestions([]);
    launchTakeoff(val);
  };

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Animated.ScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 0 }}
      showsVerticalScrollIndicator={false}
      bounces
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Hero Section ──────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.sandBackground,
          minHeight: screenHeight,
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Background slideshow with crossfade */}
        {heroSlides.map((src, i) => (
          <HeroSlideImage
            key={src}
            uri={src}
            isActive={heroSlide % heroSlides.length === i}
          />
        ))}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View entering={FadeInUp.duration(600)}>
          <Text
            style={{
              ...TextStyles.display,
              color: '#fff',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 12,
            }}
          >
            {heroConfig?.title ?? 'Explore the world from one place.'}
          </Text>
        </Animated.View>

        {/* Cycling subtitle */}
        <View style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 32, width: '100%' }}>
          <Animated.Text
            key="subtitle"
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              ...TextStyles.subhead,
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
              paddingHorizontal: 16,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            {heroConfig?.subtitle ?? 'Plan your next adventure'}
          </Animated.Text>
        </View>

        {/* Error banner */}
        {plannerError && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              width: '100%', backgroundColor: 'rgba(239,68,68,0.15)',
              borderRadius: 12, padding: 12, marginBottom: 12,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}
          >
            <FontAwesome name="exclamation-circle" size={16} color="#ef4444" />
            <Text style={{ ...TextStyles.body, color: '#fff', flex: 1 }}>{plannerError}</Text>
            <Pressable onPress={() => setPlannerError(null)} hitSlop={8}>
              <FontAwesome name="times" size={14} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </Animated.View>
        )}

        {/* Search Bar */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={{
            width: '100%',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 6,
              gap: 8,
            }}
          >
            <FontAwesome name="search" size={16} color={colors.textTertiary} />
            <TextInput
              ref={inputRef}
              value={tripQuery}
              onChangeText={(v) => { setTripQuery(v); if (plannerError) setPlannerError(null); }}
              onSubmitEditing={onSearch}
              placeholder={heroConfig?.search_placeholder ?? '7 days in Paris with my partner...'}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              style={{ flex: 1, fontSize: FontSize.bodyXl, color: colors.text, paddingVertical: 8 }}
            />
            <Pressable
              ref={sendButtonRef}
              onPress={onSearch}
              onLayout={onButtonLayout}
              collapsable={false}
              style={{
                backgroundColor: colors.tint,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <PaperPlane size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Autocomplete dropdown */}
          {autocompleteSuggestions.length > 0 && (
            <View style={{
              marginHorizontal: 4, marginTop: -4,
              backgroundColor: colors.cardBackground, borderRadius: 12,
              overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
            }}>
              {autocompleteSuggestions.map((s, i) => (
                <Pressable
                  key={`${s.name}-${i}`}
                  onPress={() => {
                    setTripQuery(`trip to ${s.name}, ${s.country}`);
                    setAutocompleteSuggestions([]);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingHorizontal: 14, paddingVertical: 11,
                    backgroundColor: pressed ? colors.surface : 'transparent',
                    borderBottomWidth: i < autocompleteSuggestions.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderLight,
                  })}
                >
                  <FontAwesome name="map-marker" size={12} color={colors.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TextStyles.bodyLg, color: colors.text }}>{s.name}</Text>
                    <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>{s.country}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Cycling Suggestion Pills — only before conversation */}
        {(
          <View style={{ height: 40, justifyContent: 'center', alignItems: 'center', marginTop: 16, width: '100%' }}>
            <Animated.View
              key={pillGroup}
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(300)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {visiblePills.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setTripQuery(s.short_label ?? s.label)}
                  style={{
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                  }}
                >
                  <Text style={{ ...TextStyles.body, color: '#fff', fontWeight: '600' }}>
                    {s.short_label ?? s.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        )}
      </View>

      {/* ─── Trip Statistics ─────────────────────────────────────── */}
      <StatsSection scrollY={scrollY} screenHeight={screenHeight} />

      {/* ─── Recent Trips (logged-in users) ───────────────────── */}
      {showRecentTrips && (
        <FadeInOnScroll scrollY={scrollY}>
          <View style={{ paddingVertical: 32, paddingHorizontal: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text style={{ ...TextStyles.title, color: colors.text }}>
                Your Recent Trips
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/trips')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ ...TextStyles.bodyXl, color: Blue[600] }}>
                  View all
                </Text>
                <FontAwesome name="arrow-right" size={12} color={Blue[600]} />
              </Pressable>
            </View>

            {recentTrips.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/trip/${trip.id}`)}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ ...TextStyles.subhead, color: colors.text }}>
                      {trip.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <FontAwesome name="map-marker" size={13} color={colors.textSecondary} />
                      <Text style={{ ...TextStyles.bodyXl, color: colors.textSecondary }}>{trip.destination}</Text>
                    </View>
                  </View>
                  <View
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: trip.status.bgColor,
                    }}
                  >
                    <Text style={{ ...TextStyles.body, color: trip.status.textColor }}>
                      {trip.status.label}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FontAwesome name="calendar" size={11} color={colors.textTertiary} />
                    <Text style={{ ...TextStyles.body, color: colors.textTertiary }}>{trip.dateRange.short}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FontAwesome name="users" size={11} color={colors.textTertiary} />
                    <Text style={{ ...TextStyles.body, color: colors.textTertiary }}>{trip.travelersLabel}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </FadeInOnScroll>
      )}

      {/* ─── Loading State ────────────────────────────────────── */}
      {showLoadingSkeleton && (
        <View style={{ paddingVertical: 32, paddingHorizontal: 24 }}>
          <ActivityIndicator size="small" color={Blue[600]} style={{ marginBottom: 16 }} />
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ height: 20, width: 128, backgroundColor: colors.skeleton, borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ height: 16, width: 96, backgroundColor: colors.borderLight, borderRadius: 4 }} />
                </View>
                <View style={{ height: 20, width: 64, backgroundColor: colors.skeleton, borderRadius: 12 }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <View style={{ height: 12, width: 112, backgroundColor: colors.borderLight, borderRadius: 4 }} />
                <View style={{ height: 12, width: 80, backgroundColor: colors.borderLight, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ─── Empty State ──────────────────────────────────────── */}
      {showEmptyState && (
        <FadeInOnScroll scrollY={scrollY}>
          <View style={{ paddingVertical: 64, paddingHorizontal: 24, alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                backgroundColor: hexToRgba(Blue[600], 0.1),
              }}
            >
              <PaperPlane size={32} color={Blue[600]} style={{ transform: [{ rotate: '-12deg' }] }} />
            </View>
            <Text style={{ ...TextStyles.title, color: colors.text, marginBottom: 8, textAlign: 'center' }}>
              No trips yet
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
              Start planning your first adventure — type a destination in the
              search bar above or tap the button below.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/trips')}
              style={{
                backgroundColor: Blue[600],
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <PaperPlane size={18} color="#fff" />
              <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>
                Plan your first trip
              </Text>
            </Pressable>
          </View>
        </FadeInOnScroll>
      )}

      {/* ─── Scroll-animated Sections ─────────────────────────── */}
      <FadeInOnScroll scrollY={scrollY}>
        <HowItWorks onCtaPress={() => router.push('/(tabs)/trips')} />
      </FadeInOnScroll>

      <TravelMosaic scrollY={scrollY} />

      {/* Quote divider removed — no hardcoded content */}

      <GetInspired />

      <FadeInOnScroll scrollY={scrollY}>
        <TagUs />
      </FadeInOnScroll>


      {/* ─── Ocean Wave + Footer ──────────────────────────────── */}
      <OceanWave />
      <Footer />

    </Animated.ScrollView>
    </KeyboardAvoidingView>

    {/* ─── Takeoff Animation Overlay ─────────────────────────── */}
    <TakeoffTransition
      visible={showTakeoff}
      buttonLayout={buttonLayout}
      onComplete={() => {
        // Animation done — keep overlay visible while planner works
        // The useEffect below handles navigation when plan completes
      }}
    />

    {/* ─── Place Detail — Magazine Card ─────────────────────────────── */}
    {selectedPlaceIdx >= 0 && (
      <CardStackCarousel
        places={([] as PlaceItem[])}
        initialIndex={selectedPlaceIdx}
        favorites={[]}
        onToggleFav={() => {}}
        onAddToTrip={addToTrip}
        tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
        overlay
        onClose={() => setSelectedPlaceIdx(-1)}
      />
    )}
    </View>
  );
}

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
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
  Blue,
  hexToRgba,
} from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PaperPlane } from '@/components/icons/PaperPlane';
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

const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&fit=crop',
];

const SUBTITLE_PHRASES = [
  'Type your dream trip and let us plan it for you',
  'Discover hidden gems around the world',
  'Your next adventure starts with a single search',
  'From idea to itinerary in seconds',
  'Tell us where you want to go',
];

const ALL_SUGGESTIONS = [
  { id: 'ps-1', label: 'Beach getaway', short_label: null },
  { id: 'ps-2', label: 'City explorer', short_label: null },
  { id: 'ps-3', label: 'Mountain trek', short_label: null },
  { id: 'ps-4', label: 'Cultural immersion', short_label: null },
  { id: 'ps-5', label: 'Island hopping', short_label: null },
  { id: 'ps-6', label: 'Food & wine', short_label: null },
  { id: 'ps-7', label: 'Road trip', short_label: null },
  { id: 'ps-8', label: 'Backpacking', short_label: null },
];

const QUOTE_SLIDES = [
  { image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&fit=crop', quote: 'The journey of a thousand miles begins with a single step.' },
  { image: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&fit=crop', quote: 'Travel makes one modest. You see what a tiny place you occupy in the world.' },
  { image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&fit=crop', quote: 'Not all those who wander are lost.' },
  { image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&fit=crop', quote: 'Life is short and the world is wide.' },
  { image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&fit=crop', quote: 'Adventure is worthwhile in itself.' },
];

const PILLS_VISIBLE = 3;

const STATS = [
  { numericValue: 500, suffix: 'K+', decimals: 0, label: 'DESTINATIONS', desc: 'Discover unexpected gems, even in your own backyard.' },
  { numericValue: 95, suffix: 'M+', decimals: 0, label: 'FELLOW TRAVELERS', desc: 'Share your adventures and learn from our global community.' },
  { numericValue: 2.0, suffix: 'B+', decimals: 1, label: 'TRIPS PLANNED', desc: 'Navigate your way and keep a record of all your travels.' },
];

function AnimatedCounter({
  value,
  suffix,
  decimals = 0,
  trigger,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  trigger: boolean;
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
    <Text style={{ fontSize: 28, fontWeight: '700', color: '#2a1f17', marginBottom: 2 }}>
      {display}
    </Text>
  );
}

function HeroSlideImage({ uri, isActive }: { uri: string; isActive: boolean }) {
  const opacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0, { duration: 1500 });
  }, [isActive]);

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
      style={style}
      resizeMode="cover"
    />
  );
}

function StatsSection({ scrollY, screenHeight }: { scrollY: { value: number }; screenHeight: number }) {
  const [visible, setVisible] = useState(false);
  const sectionY = useSharedValue(0);
  const triggered = useSharedValue(false);

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
        backgroundColor: '#e8d5c0',
        paddingVertical: 40,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#5c4a3a',
      }}
      onLayout={(e) => {
        sectionY.value = e.nativeEvent.layout.y;
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {STATS.map((item, i) => (
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
            />
            <Text
              style={{
                fontSize: 8,
                fontWeight: '700',
                color: '#5c4a3a',
                letterSpacing: 1.5,
                marginBottom: 6,
              }}
            >
              {item.label}
            </Text>
            <Text style={{ fontSize: 11, color: '#3d2f23', textAlign: 'center', lineHeight: 16 }}>
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

  // Cycling hero slideshow
  const heroSlides = heroConfig?.background_image_url
    ? [heroConfig.background_image_url]
    : FALLBACK_SLIDES;
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Cycling subtitle
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  useEffect(() => {
    if (heroConfig?.subtitle) return;
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % SUBTITLE_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroConfig?.subtitle]);

  // Cycling suggestion pills
  const allSuggestions = heroConfig?.suggestions?.length
    ? heroConfig.suggestions
    : ALL_SUGGESTIONS;
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

  // Cycling quote divider
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTE_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const sendButtonRef = useRef<View>(null);
  const [showTakeoff, setShowTakeoff] = useState(false);
  const buttonLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [buttonLayout, setButtonLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

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

  const onSearch = () => {
    if (handleSearch()) {
      // Use the pre-captured layout from onLayout (always available)
      setButtonLayout(buttonLayoutRef.current);
      setShowTakeoff(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <Animated.ScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 0 }}
      showsVerticalScrollIndicator={false}
      bounces
      nestedScrollEnabled
    >
      {/* ─── Hero Section ──────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: '#e8d5c0',
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
              fontSize: 28,
              fontWeight: '800',
              color: '#1e3a5f',
              textAlign: 'center',
              marginBottom: 8,
              textShadowColor: 'rgba(255,255,255,0.6)',
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
            key={heroConfig?.subtitle ? 'static' : `sub-${subtitleIndex}`}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              fontSize: 16,
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
              paddingHorizontal: 16,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            {heroConfig?.subtitle ?? SUBTITLE_PHRASES[subtitleIndex]}
          </Animated.Text>
        </View>

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
              value={tripQuery}
              onChangeText={setTripQuery}
              onSubmitEditing={onSearch}
              placeholder={heroConfig?.search_placeholder ?? '7 days in Paris with my partner...'}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 14, color: colors.text, paddingVertical: 8 }}
            />
            <Pressable
              ref={sendButtonRef}
              onPress={onSearch}
              onLayout={onButtonLayout}
              collapsable={false}
              style={{
                backgroundColor: '#1e3a5f',
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
        </Animated.View>

        {/* Cycling Suggestion Pills */}
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
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.4)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
                  {s.short_label ?? s.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        </View>
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
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                Your Recent Trips
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/trips')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: Blue[600] }}>
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
                    <Text style={{ fontWeight: '600', fontSize: 16, color: colors.text }}>
                      {trip.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <FontAwesome name="map-marker" size={13} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{trip.destination}</Text>
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
                    <Text style={{ fontSize: 12, fontWeight: '500', color: trip.status.textColor }}>
                      {trip.status.label}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FontAwesome name="calendar" size={11} color={colors.textTertiary} />
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{trip.dateRange.short}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FontAwesome name="users" size={11} color={colors.textTertiary} />
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{trip.travelersLabel}</Text>
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
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
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
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
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

      {/* ─── Quote Divider ────────────────────────────────────── */}
      <View style={{ height: 250, overflow: 'hidden' }}>
        {QUOTE_SLIDES.map((slide, i) => (
          <HeroSlideImage
            key={slide.image}
            uri={slide.image}
            isActive={quoteIndex === i}
          />
        ))}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,58,95,0.3)' }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Animated.Text
            key={quoteIndex}
            entering={FadeIn.duration(800)}
            exiting={FadeOut.duration(500)}
            style={{
              color: '#fff',
              fontSize: 20,
              fontStyle: 'italic',
              fontWeight: '300',
              textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            &ldquo;{QUOTE_SLIDES[quoteIndex].quote}&rdquo;
          </Animated.Text>
        </View>
      </View>

      <GetInspired />

      <FadeInOnScroll scrollY={scrollY}>
        <TagUs />
      </FadeInOnScroll>

      <FadeInOnScroll scrollY={scrollY}>
        <ExplorePreview />
      </FadeInOnScroll>

      {/* ─── Ocean Wave + Footer ──────────────────────────────── */}
      <OceanWave />
      <Footer />

    </Animated.ScrollView>

    {/* ─── Takeoff Animation Overlay ─────────────────────────── */}
    <TakeoffTransition
      visible={showTakeoff}
      buttonLayout={buttonLayout}
      onComplete={() => {
        setShowTakeoff(false);
        router.push('/(tabs)/trips');
      }}
    />
    </View>
  );
}

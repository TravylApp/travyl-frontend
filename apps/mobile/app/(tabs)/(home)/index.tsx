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
  Blue,
  hexToRgba,
  TextStyles,
  FontSize,
  FontFamily,
} from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
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
    <Text style={{ ...TextStyles.display, color: '#2a1f17', marginBottom: 2 }}>
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
                ...TextStyles.micro,
                color: '#5c4a3a',
                letterSpacing: 1.5,
                marginBottom: 6,
              }}
            >
              {item.label}
            </Text>
            <Text style={{ ...TextStyles.caption, color: '#3d2f23', textAlign: 'center' }}>
              {item.desc}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ─── Conversational follow-up questions ─────────────────────
const TRIP_QUESTIONS = [
  { key: 'destination', placeholder: 'Where do you want to go?' },
  { key: 'duration', placeholder: 'How many days?' },
  { key: 'companions', placeholder: "Who's coming along?" },
  { key: 'vibe', placeholder: 'What\'s the vibe? (foodie, adventure, relaxing...)' },
  { key: 'budget', placeholder: 'Any budget range? (budget, mid-range, luxury)' },
] as const;

type TripAnswers = Record<string, string>;

function buildChainSentence(answers: TripAnswers): string {
  const parts: string[] = [];
  if (answers.duration) parts.push(answers.duration);
  if (answers.destination) parts.push(`in ${answers.destination}`);
  if (answers.companions) parts.push(`with ${answers.companions}`);
  if (answers.vibe) parts.push(answers.vibe);
  if (answers.budget) parts.push(answers.budget.toLowerCase().includes('budget') ? answers.budget : `${answers.budget} budget`);
  return parts.join(' · ') || '';
}

function parseInitialInput(val: string): TripAnswers {
  const parsed: TripAnswers = {};
  const lower = val.toLowerCase();
  const destMatch = val.match(/(?:in|to)\s+([a-zA-Z][a-zA-Z\s]+)/i);
  if (destMatch) {
    parsed.destination = destMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  } else {
    const cleaned = val.replace(/^(?:trip|travel|going|visiting|explore)\s*/i, '').trim();
    parsed.destination = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const durMatch = lower.match(/(\d+)\s*(?:day|night|week)s?/);
  if (durMatch) {
    const num = parseInt(durMatch[1]);
    const unit = durMatch[0].match(/day|night|week/)![0];
    parsed.duration = `${num} ${unit}${num !== 1 ? 's' : ''}`;
  } else if (lower.includes('weekend')) parsed.duration = 'weekend';
  if (lower.match(/family|kids|children/)) parsed.companions = 'family';
  else if (lower.match(/partner|couple|wife|husband/)) parsed.companions = 'partner';
  else if (lower.match(/friends|group|squad/)) parsed.companions = 'friends';
  else if (lower.match(/solo|alone|myself/)) parsed.companions = 'solo';
  if (lower.match(/food|foodie|culinary/)) parsed.vibe = 'foodie';
  else if (lower.match(/adventure|hiking|trek/)) parsed.vibe = 'adventure';
  else if (lower.match(/relax|chill|spa|beach/)) parsed.vibe = 'relaxing';
  else if (lower.match(/culture|museum|art|history/)) parsed.vibe = 'culture';
  if (lower.match(/budget|cheap|backpack/)) parsed.budget = 'budget';
  else if (lower.match(/luxury|premium|high.end/)) parsed.budget = 'luxury';
  return parsed;
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

  // Conversational flow state
  const [convStep, setConvStep] = useState(-1);
  const [answers, setAnswers] = useState<TripAnswers>({});
  const isConversing = convStep >= 0 && convStep < TRIP_QUESTIONS.length;
  const isComplete = convStep >= TRIP_QUESTIONS.length;
  const chainSentence = buildChainSentence(answers);
  const inputRef = useRef<TextInput>(null);

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

  const launchTakeoff = useCallback((query: string) => {
    setTripQuery(query);
    setButtonLayout(buttonLayoutRef.current);
    setShowTakeoff(true);
  }, [setTripQuery]);

  const handleConvReset = useCallback(() => {
    setConvStep(-1);
    setAnswers({});
    setTripQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [setTripQuery]);

  const handleSkipToLaunch = useCallback(() => {
    const fullQuery = buildChainSentence(answers);
    if (!fullQuery.trim()) return;
    setConvStep(TRIP_QUESTIONS.length);
    setTripQuery(fullQuery);
    setTimeout(() => launchTakeoff(fullQuery), 1500);
  }, [answers, setTripQuery, launchTakeoff]);

  const onSearch = () => {
    const val = tripQuery.trim();
    if (!val) return;

    // Not conversing yet — parse input and start flow
    if (convStep === -1) {
      const parsed = parseInitialInput(val);
      setAnswers(parsed);
      const firstUnanswered = TRIP_QUESTIONS.findIndex((q) => !parsed[q.key]);
      if (firstUnanswered === -1) {
        const fullQuery = buildChainSentence(parsed);
        setConvStep(TRIP_QUESTIONS.length);
        setTripQuery(fullQuery);
        setTimeout(() => launchTakeoff(fullQuery), 1500);
      } else {
        setConvStep(firstUnanswered);
        setTripQuery('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    // In conversation — save answer and advance
    if (isConversing) {
      const currentQ = TRIP_QUESTIONS[convStep];
      let normalized = val;
      if (currentQ.key === 'duration') {
        if (/^\d+$/.test(val.trim())) normalized = `${val.trim()} days`;
        else if (!/day|night|week/i.test(val)) normalized = `${val.trim()} days`;
      } else if (currentQ.key === 'companions') {
        if (/^\d+$/.test(val.trim())) normalized = `${val.trim()} people`;
      } else if (currentQ.key === 'destination') {
        normalized = val.trim().replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
      const newAnswers = { ...answers, [currentQ.key]: normalized };
      setAnswers(newAnswers);
      setTripQuery('');
      const nextUnanswered = TRIP_QUESTIONS.findIndex((q, i) => i > convStep && !newAnswers[q.key]);
      if (nextUnanswered === -1) {
        setConvStep(TRIP_QUESTIONS.length);
        const fullQuery = buildChainSentence(newAnswers);
        setTripQuery(fullQuery);
        setTimeout(() => launchTakeoff(fullQuery), 1500);
      } else {
        setConvStep(nextUnanswered);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    // Fallback
    if (handleSearch()) {
      setButtonLayout(buttonLayoutRef.current);
      setShowTakeoff(true);
    }
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
        <View style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginBottom: isConversing || isComplete ? 16 : 32, width: '100%' }}>
          <Animated.Text
            key={heroConfig?.subtitle ? 'static' : `sub-${subtitleIndex}`}
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
            {heroConfig?.subtitle ?? SUBTITLE_PHRASES[subtitleIndex]}
          </Animated.Text>
        </View>

        {/* Chain pill — shows trip so far during conversation */}
        {isConversing && chainSentence ? (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOut.duration(200)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 24,
              paddingHorizontal: 20,
              paddingVertical: 10,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Text style={{ ...TextStyles.bodyLgEm, flex: 1, color: '#fff', marginRight: 8 }} numberOfLines={1}>
              {chainSentence}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {TRIP_QUESTIONS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: i < convStep ? 'rgba(255,255,255,0.4)' : i === convStep ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.12)',
                  }}
                />
              ))}
              <Pressable onPress={handleConvReset} style={{ marginLeft: 4, padding: 4 }}>
                <FontAwesome name="refresh" size={10} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {/* Final summary pill before takeoff */}
        {isComplete && !showTakeoff && chainSentence ? (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 24,
              paddingHorizontal: 20,
              paddingVertical: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{chainSentence}</Text>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
          </Animated.View>
        ) : null}

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
          {/* Question label when conversing */}
          {isConversing && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <FontAwesome name="magic" size={10} color={colors.tint} />
              <Text style={{ ...TextStyles.captionEm, color: colors.tint, flex: 1 }}>
                {TRIP_QUESTIONS[convStep].placeholder}
              </Text>
              <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>
                {convStep + 1}/{TRIP_QUESTIONS.length}
              </Text>
            </Animated.View>
          )}
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
              onChangeText={setTripQuery}
              onSubmitEditing={onSearch}
              placeholder={isConversing ? TRIP_QUESTIONS[convStep].placeholder : (heroConfig?.search_placeholder ?? '7 days in Paris with my partner...')}
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
        </Animated.View>

        {/* Cycling Suggestion Pills — only before conversation */}
        {!isComplete && (
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
                  <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.85)' }}>
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
              ...TextStyles.title,
              color: '#fff',
              fontStyle: 'italic',
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
        setShowTakeoff(false);
        router.push('/(tabs)/trips');
      }}
    />

    {/* ─── Place Detail — Magazine Card ─────────────────────────────── */}
    {selectedPlaceIdx >= 0 && (
      <CardStackCarousel
        places={([] as PlaceItem[])}
        initialIndex={selectedPlaceIdx}
        favorites={[]}
        onToggleFav={() => {}}
        overlay
        onClose={() => setSelectedPlaceIdx(-1)}
      />
    )}
    </View>
  );
}

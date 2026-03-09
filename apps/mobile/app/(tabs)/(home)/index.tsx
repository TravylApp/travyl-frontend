import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useHomeScreen,
  useHeroConfig,
  Blue,
  Gray,
  hexToRgba,
} from '@travyl/shared';
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

export default function HomeScreen() {
  const router = useRouter();
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
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 0 }}
      showsVerticalScrollIndicator={false}
      bounces
      nestedScrollEnabled
    >
      {/* ─── Hero Section (mount animations) ──────────────────── */}
      <View
        style={{
          backgroundColor: Blue[600],
          minHeight: screenHeight,
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 40,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {heroConfig?.background_image_url && (
          <>
            <Image
              source={{ uri: heroConfig.background_image_url }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.60)']}
              locations={[0, 0.5, 1]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          </>
        )}

        <Animated.View entering={FadeInUp.duration(600)}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#fff',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {heroConfig?.title ?? 'Explore the world from one place.'}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <Text
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              marginBottom: 32,
              paddingHorizontal: 16,
            }}
          >
            {heroConfig?.subtitle ?? 'Type your dream trip and let us plan it for you'}
          </Text>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={{
            width: '100%',
            backgroundColor: '#fff',
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#000',
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
            <FontAwesome name="search" size={16} color={Gray[400]} />
            <TextInput
              value={tripQuery}
              onChangeText={setTripQuery}
              onSubmitEditing={onSearch}
              placeholder={heroConfig?.search_placeholder ?? '7 days in Paris with my partner...'}
              placeholderTextColor={Gray[400]}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 14, color: Gray[900], paddingVertical: 8 }}
            />
            <Pressable
              ref={sendButtonRef}
              onPress={onSearch}
              onLayout={onButtonLayout}
              collapsable={false}
              style={{
                backgroundColor: Blue[600],
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

        {/* Suggestion Pills */}
        {(() => {
          const suggestions = heroConfig?.suggestions?.length
            ? heroConfig.suggestions
            : [
                { id: 'ps-1', label: '', short_label: null },
                { id: 'ps-2', label: '', short_label: null },
                { id: 'ps-3', label: '', short_label: null },
                { id: 'ps-4', label: '', short_label: null },
              ];
          return (
            <Animated.View
              entering={FadeIn.duration(500).delay(400)}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginTop: 16,
                gap: 8,
              }}
            >
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setTripQuery(s.short_label ?? s.label)}
                  style={{
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}
                >
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                    {s.short_label ?? s.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          );
        })()}
      </View>

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
              <Text style={{ fontSize: 20, fontWeight: '700', color: Gray[900] }}>
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
                  borderColor: Gray[200],
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontWeight: '600', fontSize: 16, color: Gray[900] }}>
                      {trip.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <FontAwesome name="map-marker" size={13} color={Gray[500]} />
                      <Text style={{ fontSize: 14, color: Gray[500] }}>{trip.destination}</Text>
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
                    <FontAwesome name="calendar" size={11} color={Gray[400]} />
                    <Text style={{ fontSize: 12, color: Gray[400] }}>{trip.dateRange.short}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FontAwesome name="users" size={11} color={Gray[400]} />
                    <Text style={{ fontSize: 12, color: Gray[400] }}>{trip.travelersLabel}</Text>
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
                borderColor: Gray[200],
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ height: 20, width: 128, backgroundColor: Gray[200], borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ height: 16, width: 96, backgroundColor: Gray[100], borderRadius: 4 }} />
                </View>
                <View style={{ height: 20, width: 64, backgroundColor: Gray[200], borderRadius: 12 }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <View style={{ height: 12, width: 112, backgroundColor: Gray[100], borderRadius: 4 }} />
                <View style={{ height: 12, width: 80, backgroundColor: Gray[100], borderRadius: 4 }} />
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
            <Text style={{ fontSize: 20, fontWeight: '700', color: Gray[900], marginBottom: 8, textAlign: 'center' }}>
              No trips yet
            </Text>
            <Text style={{ color: Gray[500], textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
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

      <GetInspired scrollY={scrollY} />

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

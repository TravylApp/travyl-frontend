import { useState, createContext, useContext } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, Share,
  Platform, Linking,
} from 'react-native';
import { withLayoutContext, useLocalSearchParams } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, formatDateRange } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

// ─── Config (matches web trip-tabs.tsx) ──────────────────
const NAVY = '#1e3a5f';
const SIDEBAR_W = 52;

const CORE_TABS = [
  { name: 'index',       title: 'Overview',    icon: 'compass'     },
  { name: 'itinerary',   title: 'Itinerary',   icon: 'calendar'    },
  { name: 'hotels',      title: 'Hotels',      icon: 'building'    },
  { name: 'flights',     title: 'Flights',     icon: 'plane'       },
  { name: 'restaurants', title: 'Restaurants',  icon: 'cutlery'     },
  { name: 'activities',  title: 'Explore',     icon: 'compass'     },
] as const;

const OPTIONAL_TABS = [
  { name: 'packing',     title: 'Packing',     icon: 'suitcase'    },
  { name: 'budget',      title: 'Budget',      icon: 'pie-chart'   },
  { name: 'info',        title: 'Trip Info',   icon: 'info-circle' },
  { name: 'settings',    title: 'Settings',    icon: 'cog'         },
  { name: 'cars',        title: 'Car Rental',  icon: 'car'         },
  { name: 'favorites',   title: 'Favorites',   icon: 'heart'       },
] as const;

const ALL_TABS = [...CORE_TABS, ...OPTIONAL_TABS];
const CORE_NAMES = CORE_TABS.map((t) => t.name);

// ─── Types ──────────────────────────────────────────────
type SpinePosition = 'top' | 'left' | 'right';

// ─── Context ─────────────────────────────────────────────
const TabCtx = createContext<{
  showOptional: boolean;
  setShowOptional: (v: boolean) => void;
  openTabManager: () => void;
  spinePosition: SpinePosition;
  cyclePosition: () => void;
}>({
  showOptional: false,
  setShowOptional: () => {},
  openTabManager: () => {},
  spinePosition: 'top',
  cyclePosition: () => {},
});

// ─── Helpers ─────────────────────────────────────────────
function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: '#e5e7eb' }, style]} />;
}

function getVisibleRoutes(state: MaterialTopTabBarProps['state'], showOptional: boolean) {
  const allowedNames = showOptional ? ALL_TABS.map((t) => t.name) : CORE_NAMES;
  return state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => allowedNames.includes(route.name));
}

// ─── Trip Hero ───────────────────────────────────────────
function TripHero({ trip, refetch, onOpenTabManager }: { trip: Trip | null; refetch: () => void; onOpenTabManager: () => void }) {
  const handleMap = () => {
    if (!trip?.destination) return;
    const query = encodeURIComponent(trip.destination);
    const url = Platform.select({
      ios: `maps:?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://maps.google.com/?q=${query}`,
    })!;
    Linking.openURL(url);
  };

  const handleShare = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `Check out my trip to ${trip.destination}! ${trip.start_date} – ${trip.end_date}`,
        title: trip.title ?? `Trip to ${trip.destination}`,
      });
    } catch (_) {}
  };

  const btns = [
    { icon: 'sliders', onPress: onOpenTabManager },
    { icon: 'map', onPress: handleMap },
    { icon: 'refresh', onPress: refetch },
    { icon: 'share', onPress: handleShare },
  ];

  return (
    <View style={{ height: 180, backgroundColor: '#cbd5e1', position: 'relative' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="picture-o" size={32} color="#94a3b8" />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'flex-end', padding: 14 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <FontAwesome name="map-marker" size={14} color="rgba(255,255,255,0.6)" />
          {trip ? (
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{trip.destination}</Text>
          ) : (
            <SkeletonBlock width="55%" height={20} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
          )}
        </View>
        {trip ? (
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            {formatDateRange(trip.start_date, trip.end_date)} · {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
          </Text>
        ) : (
          <SkeletonBlock width="45%" height={12} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        )}
      </LinearGradient>
      <View style={{ position: 'absolute', bottom: 56, right: 10, flexDirection: 'row', gap: 6 }}>
        {btns.map((b) => (
          <Pressable
            key={b.icon}
            onPress={b.onPress}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
              borderRadius: 10, width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name={b.icon as any} size={13} color="#fff" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Tab Manager Modal ───────────────────────────────────
function TabManagerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 34, paddingHorizontal: 20, maxHeight: '80%' }} onPress={() => {}}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Tab Info</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Tap the + button on the tab bar to show or hide optional tabs (Packing, Budget, Trip Info, Settings, etc.).
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Core Tabs (always available)</Text>
            {CORE_TABS.map((tab) => (
              <View key={tab.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: NAVY + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome name={tab.icon as any} size={13} color={NAVY} />
                </View>
                <Text style={{ fontSize: 14, color: '#374151' }}>{tab.title}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 }}>Optional Tabs (tap + to show)</Text>
            {OPTIONAL_TABS.map((tab) => (
              <View key={tab.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome name={tab.icon as any} size={13} color="#9ca3af" />
                </View>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>{tab.title}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Horizontal Tab Bar (top position) ───────────────────
function HorizontalTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const { showOptional, setShowOptional, cyclePosition } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, showOptional);

  return (
    <View style={{ backgroundColor: NAVY }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces
        nestedScrollEnabled
        contentContainerStyle={{ alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 8 }}
      >
        {visibleRoutes.map(({ route, index }) => {
          const label = descriptors[route.key]?.options.title ?? route.name;
          const isFocused = state.index === index;
          const tab = ALL_TABS.find((t) => t.name === route.name);

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: isFocused ? NAVY : 'transparent',
              }}
            >
              <FontAwesome
                name={(tab?.icon ?? 'circle') as any}
                size={15}
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isFocused ? '600' : '400',
                  color: isFocused ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Toggle optional tabs */}
        <Pressable
          onPress={() => setShowOptional(!showOptional)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FontAwesome name={showOptional ? 'times' : 'plus'} size={13} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {/* Cycle position: top -> left -> right -> top */}
        <Pressable
          onPress={cyclePosition}
          style={{
            width: 32, height: 32, borderRadius: 8,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FontAwesome name="exchange" size={12} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Vertical Sidebar (left / right position) ───────────
function VerticalSidebar({ state, navigation }: MaterialTopTabBarProps) {
  const { showOptional, setShowOptional, cyclePosition } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, showOptional);

  return (
    <View style={{ width: SIDEBAR_W, backgroundColor: NAVY, paddingVertical: 6, alignItems: 'center' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        nestedScrollEnabled
        contentContainerStyle={{ alignItems: 'center', gap: 4, paddingVertical: 2 }}
        style={{ flexGrow: 0 }}
      >
        {visibleRoutes.map(({ route, index }) => {
          const isFocused = state.index === index;
          const tab = ALL_TABS.find((t) => t.name === route.name);

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{
                width: 40,
                height: 38,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isFocused ? 'rgba(255,255,255,0.18)' : 'transparent',
              }}
            >
              <FontAwesome
                name={(tab?.icon ?? 'circle') as any}
                size={16}
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Toggle optional tabs */}
      <Pressable
        onPress={() => setShowOptional(!showOptional)}
        style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
      >
        <FontAwesome name={showOptional ? 'times' : 'plus'} size={13} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {/* Cycle position: top -> left -> right -> top */}
      <Pressable
        onPress={cyclePosition}
        style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
      >
        <FontAwesome name="exchange" size={12} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </View>
  );
}

// ─── Custom Tab Bar (delegates to horizontal or vertical) ─
// For left/right the sidebar is absolutely positioned over the content
// area; the main layout adds matching padding so content is not hidden.
function CustomTabBar(props: MaterialTopTabBarProps) {
  const { spinePosition } = useContext(TabCtx);

  if (spinePosition === 'top') {
    return <HorizontalTabBar {...props} />;
  }

  // Absolutely-positioned sidebar on the correct side
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: spinePosition === 'left' ? 0 : undefined,
        right: spinePosition === 'right' ? 0 : undefined,
        zIndex: 10,
      }}
    >
      <VerticalSidebar {...props} />
    </View>
  );
}

// ─── Content Wrapper ─────────────────────────────────────
// Wraps the TopTabs in a container that accounts for sidebar width.
function ContentArea({ spinePosition, children }: { spinePosition: SpinePosition; children: React.ReactNode }) {
  if (spinePosition === 'top') {
    return <>{children}</>;
  }

  return (
    <View
      style={{
        flex: 1,
        position: 'relative',
        paddingLeft: spinePosition === 'left' ? SIDEBAR_W : 0,
        paddingRight: spinePosition === 'right' ? SIDEBAR_W : 0,
      }}
    >
      {children}
    </View>
  );
}

// ─── Main Layout ─────────────────────────────────────────
export default function TripLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, refetch } = useItineraryScreen(id);
  const [tabManagerVisible, setTabManagerVisible] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [spinePosition, setSpinePosition] = useState<SpinePosition>('top');

  const cyclePosition = () => {
    setSpinePosition((p) => (p === 'top' ? 'left' : p === 'left' ? 'right' : 'top'));
  };

  return (
    <TabCtx.Provider
      value={{
        showOptional, setShowOptional,
        openTabManager: () => setTabManagerVisible(true),
        spinePosition,
        cyclePosition,
      }}
    >
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <TripHero trip={trip} refetch={refetch} onOpenTabManager={() => setTabManagerVisible(true)} />

        <ContentArea spinePosition={spinePosition}>
          <TopTabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ lazy: true }}
          >
            <TopTabs.Screen name="index" options={{ title: 'Overview' }} />
            <TopTabs.Screen name="itinerary" options={{ title: 'Itinerary' }} />
            <TopTabs.Screen name="hotels" options={{ title: 'Hotels' }} />
            <TopTabs.Screen name="flights" options={{ title: 'Flights' }} />
            <TopTabs.Screen name="restaurants" options={{ title: 'Restaurants' }} />
            <TopTabs.Screen name="activities" options={{ title: 'Explore' }} />
            <TopTabs.Screen name="packing" options={{ title: 'Packing' }} />
            <TopTabs.Screen name="budget" options={{ title: 'Budget' }} />
            <TopTabs.Screen name="info" options={{ title: 'Trip Info' }} />
            <TopTabs.Screen name="settings" options={{ title: 'Settings' }} />
            <TopTabs.Screen name="cars" options={{ title: 'Car Rental' }} />
            <TopTabs.Screen name="favorites" options={{ title: 'Favorites' }} />
          </TopTabs>
        </ContentArea>
      </View>

      <TabManagerModal visible={tabManagerVisible} onClose={() => setTabManagerVisible(false)} />
    </TabCtx.Provider>
  );
}

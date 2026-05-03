import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, Image, TextInput,
  ActivityIndicator, Alert, GestureResponderEvent, PanResponder,
} from 'react-native';
import Svg, { Path as SvgPath, Circle as SvgCircle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  useAuthStore,
  useProfile,
  useTrips,
  Navy,
  TextStyles,
  getWebApiBase,
  supabase,
  fetchDiscoverPage,
  dedupPlaces,
  type Trip,
  type PlaceItem,
  type DiscoverPageResult,
} from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GridPlaceCard } from '@/components/places/GridPlaceCard';

const FAVORITES_KEY = 'travyl-favorites';
// Visual customization (accent, card, text, quote, cover_url) is persisted
// to AsyncStorage instead of Supabase so it survives app restarts even for
// anonymous users and avoids a round-trip on every save.
const PROFILE_PREFS_KEY = 'travyl-profile-prefs';
const COVER_HEIGHT = 160;

const ACCENT_PALETTE: string[] = [
  '#000000', // Black — wheel can't reach it (fixed L=0.5)
  '#1e3a5f', // Navy
  '#0f766e', // Teal
  '#7c3aed', // Violet
  '#dc2626', // Crimson
  '#c8a96a', // Gold
  '#0891b2', // Cyan
  '#ffffff', // White — wheel center is desaturated but not pure white
];

// HSL → hex — used by the drag-hue picker. Saturation/lightness are fixed
// (60% / 48%) to land on travel-photo-friendly tones across the spectrum.
function hslToHex(h: number, s = 0.6, l = 0.48): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to255 = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

// Returns a black-or-white-derived rgba string with the given alpha that
// reads against the supplied background hex. Used to keep text legible
// when the user picks a bright accent (e.g. red, yellow, white).
function onAccent(hex: string, alpha = 1): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 160 ? `rgba(20,40,70,${alpha})` : `rgba(255,255,255,${alpha})`;
}

// hex → {h, s, l} for thumb positioning on the wheel.
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return { h: 200, s: 0.6, l: 0.5 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return { h: h < 0 ? h + 360 : h, s, l };
}

interface QuoteData {
  content: string;
  author: string;
}

interface CountryGroup {
  country: string;
  cities: string[];
  count: number;
  firstYear: number;
  lastYear: number;
}

// Groups trips by country (last comma-segment of `destination`). Cities are
// kept unique. Years are derived from `start_date` so the stamp can show a
// "VISITED 2023" or year-range mark.
function groupTripsByCountry(trips: Trip[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>();
  for (const trip of trips) {
    const dest = (trip.destination || '').trim();
    if (!dest) continue;
    const parts = dest.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    const country = parts[parts.length - 1];
    const city = parts[0] !== country ? parts[0] : '';
    const year = trip.start_date ? new Date(trip.start_date + 'T12:00:00').getFullYear() : NaN;

    const existing = map.get(country);
    if (existing) {
      if (city && !existing.cities.includes(city)) existing.cities.push(city);
      existing.count += 1;
      if (!isNaN(year)) {
        existing.firstYear = Math.min(existing.firstYear, year);
        existing.lastYear = Math.max(existing.lastYear, year);
      }
    } else {
      map.set(country, {
        country,
        cities: city ? [city] : [],
        count: 1,
        firstYear: isNaN(year) ? new Date().getFullYear() : year,
        lastYear: isNaN(year) ? new Date().getFullYear() : year,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// Resolves expo-image-picker once and caches the outcome. The dev-client
// binary may have been built before this dep was added — a static top-level
// import would crash the whole app on launch with "Cannot find native module
// 'ExponentImagePicker'". `await import()` does NOT shield us here either —
// Metro's compilation lets the module's synchronous throw escape the await's
// try/catch, so we use require() directly inside try/catch and remember the
// result so subsequent calls don't re-throw.
let cachedImagePicker: any | null | undefined; // undefined = not yet probed
function getImagePicker(): any | null {
  if (cachedImagePicker !== undefined) return cachedImagePicker;
  try {
    cachedImagePicker = require('expo-image-picker');
  } catch {
    cachedImagePicker = null;
  }
  return cachedImagePicker;
}

async function pickAndUpload(userId: string, field: 'avatar' | 'cover'): Promise<string | null> {
  const ImagePicker = getImagePicker();
  if (!ImagePicker) {
    Alert.alert('Update needed', 'Image upload is in the next build of the app. Reinstall the latest TestFlight / APK to use this feature.');
    return null;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos permission needed', 'Enable photo library access in Settings to update your profile picture.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: field === 'avatar' ? [1, 1] : [3, 1],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const asset = result.assets[0];

  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
    const path = `${userId}/${field}-${Date.now()}.${ext}`;
    const contentType = (asset as any).mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType,
      upsert: false,
    });
    if (error) {
      Alert.alert('Upload failed', error.message ?? 'Could not upload image.');
      return null;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e: any) {
    Alert.alert('Upload failed', e?.message ?? 'Could not read image.');
    return null;
  }
}


// Full color wheel — hue varies with angle, saturation with radius.
// Draggable anywhere inside the disc; the center is desaturated white.
// Sized to 150px so it fits comfortably on iPhone SE.
function ColorWheel({ value, onChange, onDragChange, size = 150 }: { value: string; onChange: (hex: string) => void; onDragChange?: (dragging: boolean) => void; size?: number }) {
  const radius = size / 2;
  const { h: hue, s: sat } = hexToHsl(value);
  const angleRad = ((hue - 90) * Math.PI) / 180;
  // Thumb sits at (sat * radius) from center along the angle axis.
  const thumbR = Math.min(sat, 1) * radius;
  const thumbX = radius + Math.cos(angleRad) * thumbR;
  const thumbY = radius + Math.sin(angleRad) * thumbR;

  // Map a touch (in the wheel's local coords) to a hex via HSL.
  const handleTouch = useCallback((locationX: number, locationY: number) => {
    const dx = locationX - radius;
    const dy = locationY - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, radius);
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const newHue = (deg + 90 + 360) % 360;
    const newSat = clampedDist / radius;
    onChange(hslToHex(newHue, newSat, 0.5));
  }, [radius, onChange]);

  // PanResponder gives consistent drag tracking + claims the gesture from
  // the parent ScrollView so the page stops scrolling while you drag.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (evt) => {
      onDragChange?.(true);
      handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
    },
    onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
    onPanResponderRelease: () => onDragChange?.(false),
    onPanResponderTerminate: () => onDragChange?.(false),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [handleTouch, onDragChange]);

  // 24 wedges around the disc, full saturation hue. The radial gradient
  // overlay washes them toward white at the center for the saturation axis.
  const wedgeCount = 24;
  const wedges = Array.from({ length: wedgeCount }, (_, i) => {
    const startAngle = (i / wedgeCount) * 360 - 90;
    const endAngle = ((i + 1) / wedgeCount) * 360 - 90;
    const a1 = (startAngle * Math.PI) / 180;
    const a2 = (endAngle * Math.PI) / 180;
    const x1 = radius + Math.cos(a1) * radius;
    const y1 = radius + Math.sin(a1) * radius;
    const x2 = radius + Math.cos(a2) * radius;
    const y2 = radius + Math.sin(a2) * radius;
    const path = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
    const wedgeHue = ((i + 0.5) / wedgeCount) * 360;
    return { path, color: hslToHex(wedgeHue, 1, 0.5) };
  });

  return (
    <View style={{ width: size, height: size, alignSelf: 'center', position: 'relative' }}>
      <View
        {...panResponder.panHandlers}
        style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="satGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {wedges.map((w, i) => (
            <SvgPath key={i} d={w.path} fill={w.color} />
          ))}
          {/* Saturation falloff — white at center, transparent at the rim */}
          <SvgCircle cx={radius} cy={radius} r={radius} fill="url(#satGrad)" />
        </Svg>
      </View>
      {/* Thumb */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: thumbX - 11, top: thumbY - 11,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: value,
          borderWidth: 3, borderColor: '#fff',
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 2 },
        }}
      />
    </View>
  );
}

// Passport-style stamp tile. Three customizable colors: accent (the gold
// dashed ring + small accent text), card (the navy fill background), and
// text (the country name + sub-info). Defaults match the original look.
function PassportStamp({
  group, accentColor, onPress,
  cardColor = Navy.DEFAULT,
  textColor = '#fff',
}: {
  group: CountryGroup;
  accentColor: string;
  onPress: () => void;
  cardColor?: string;
  textColor?: string;
}) {
  const yearLabel = group.firstYear === group.lastYear
    ? String(group.firstYear)
    : `${group.firstYear}–${String(group.lastYear).slice(2)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Outer dashed accent ring on customizable card fill */}
      <View
        style={{
          padding: 10, borderRadius: 12,
          borderWidth: 2, borderStyle: 'dashed', borderColor: accentColor,
          backgroundColor: cardColor,
        }}
      >
        {/* Inner solid gold ring — fixed height so every stamp lines up
            in the grid regardless of country-name line count. */}
        <View
          style={{
            paddingVertical: 14, paddingHorizontal: 10,
            borderWidth: 1.5, borderColor: accentColor, borderRadius: 8,
            alignItems: 'center', justifyContent: 'center',
            height: 150,
          }}
        >
          <Text
            style={{
              ...TextStyles.xs, letterSpacing: 2.5, textTransform: 'uppercase',
              color: accentColor, fontWeight: '700', marginBottom: 4,
            }}
          >
            Visited
          </Text>
          <Text
            style={{
              ...TextStyles.title,
              color: textColor, textTransform: 'uppercase',
              textAlign: 'center', letterSpacing: 1,
            }}
            numberOfLines={2}
          >
            {group.country}
          </Text>
          <View style={{
            marginTop: 6, height: 1, width: 32, backgroundColor: accentColor, opacity: 0.7,
          }} />
          <Text
            style={{
              ...TextStyles.xs, color: accentColor,
              marginTop: 6, letterSpacing: 1.5, fontWeight: '600',
            }}
          >
            {yearLabel}
          </Text>
          <Text
            style={{
              ...TextStyles.xs, color: textColor, opacity: 0.75, marginTop: 2,
            }}
            numberOfLines={1}
          >
            {group.count} {group.count === 1 ? 'trip' : 'trips'}
            {group.cities.length > 0 ? ` • ${group.cities.slice(0, 2).join(', ')}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const { data: profile } = useProfile();
  const { data: trips = [], isLoading: tripsLoading } = useTrips();

  // Profile shows the user's collected travel: Passport (countries) and
  // Favorites (saved places). Trips already live in the bottom-nav Trips tab.
  const [profileTab, setProfileTab] = useState<'passport' | 'favorites'>('passport');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  // Visual prefs cached locally (overrides whatever is in profile.preferences).
  const [localPrefs, setLocalPrefs] = useState<Record<string, any>>({});
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_PREFS_KEY).then((val) => {
      if (val) try { setLocalPrefs(JSON.parse(val)); } catch {}
    }).catch(() => {});
  }, []);
  const [favSort, setFavSort] = useState<'recent' | 'name' | 'category'>('recent');

  const removeFavorite = useCallback((placeId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.filter((id) => id !== placeId);
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Geolocation — use the same cache key as the Favorites screen so we hit
  // its already-loaded React Query cache instead of refetching.
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (profileTab !== 'favorites') return;
    import('expo-location').then(async (Location) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {}
    }).catch(() => {});
  }, [profileTab]);

  // Discover-feed pages — same source + same cache key as the Favorites
  // screen, so visiting one warms the data for the other. We filter the
  // loaded pages by saved IDs to render rich cards on the profile.
  const {
    data: discoverData,
    fetchNextPage: fetchDiscoverNext,
    hasNextPage: hasDiscoverNext,
    isFetchingNextPage: isFetchingDiscoverNext,
    isLoading: discoverLoading,
  } = useInfiniteQuery({
    queryKey: ['mobile-places-discover', userLocation?.lat],
    queryFn: ({ pageParam }) => fetchDiscoverPage(pageParam, userLocation),
    initialPageParam: 0,
    getNextPageParam: (lastPage: DiscoverPageResult) =>
      lastPage.hasMore && lastPage.nextPage != null ? lastPage.nextPage : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: profileTab === 'favorites' && favoriteIds.length > 0,
  });

  const discoveredPlaces = useMemo<PlaceItem[]>(() => {
    if (!discoverData?.pages) return [];
    return dedupPlaces(discoverData.pages.flatMap((p) => p.items));
  }, [discoverData]);

  // Auto-load more pages until we've matched all favorites or run out.
  useEffect(() => {
    if (profileTab !== 'favorites' || favoriteIds.length === 0) return;
    if (!hasDiscoverNext || isFetchingDiscoverNext) return;
    const matched = discoveredPlaces.filter((p) => favoriteIds.includes(p.id)).length;
    if (matched >= favoriteIds.length) return;
    if (discoveredPlaces.length >= 200) return; // safety cap
    const t = setTimeout(() => fetchDiscoverNext(), 400);
    return () => clearTimeout(t);
  }, [profileTab, favoriteIds, discoveredPlaces, hasDiscoverNext, isFetchingDiscoverNext, fetchDiscoverNext]);

  const favoritedPlaces = useMemo<PlaceItem[]>(() => {
    if (favoriteIds.length === 0) return [];
    const set = new Set(favoriteIds);
    const matched = discoveredPlaces.filter((p) => set.has(p.id));
    // The user added places to favorites in this order — newest first by index
    // in `favoriteIds` (we append on add). For 'recent' we reverse so latest
    // saves come first; for the rest we sort the matched list by field.
    if (favSort === 'name') {
      return [...matched].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    if (favSort === 'category') {
      return [...matched].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }
    // 'recent' — preserve favoriteIds order (newest appended last → reverse)
    const rank = new Map(favoriteIds.map((id, i) => [id, i]));
    return [...matched].sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
  }, [favoriteIds, discoveredPlaces, favSort]);
  const [apiQuote, setApiQuote] = useState<QuoteData | null>(null);

  // Edit mode + drafts. Drafts initialise from the current profile and only
  // commit when the user taps Save.
  const [editing, setEditing] = useState(false);
  const [draftQuote, setDraftQuote] = useState('');
  const [draftAccent, setDraftAccent] = useState<string>(Navy.DEFAULT);
  const [draftCard, setDraftCard] = useState<string>(Navy.DEFAULT);
  const [draftText, setDraftText] = useState<string>('#ffffff');
  const [hexInput, setHexInput] = useState<string>('');
  // Single wheel, three possible targets — Profile (accent), Card (stamp
  // background), Text (stamp text color).
  const [colorTarget, setColorTarget] = useState<'accent' | 'card' | 'text'>('accent');

  const applyColor = useCallback((hex: string) => {
    if (colorTarget === 'accent') setDraftAccent(hex);
    else if (colorTarget === 'card') setDraftCard(hex);
    else setDraftText(hex);
    setHexInput(hex);
  }, [colorTarget]);
  // Locks the parent ScrollView while the color wheel is being dragged so
  // the page doesn't scroll under the user's finger.
  const [wheelDragging, setWheelDragging] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  // Optimistic local copies so a fresh upload reflects instantly without
  // waiting for the profile query to refetch.
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<string | null>(null);

  const isAuthenticated = !!user;
  const displayName = isAuthenticated
    ? (profile?.display_name ?? user.email?.split('@')[0] ?? 'User')
    : 'Guest';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Local AsyncStorage prefs win over the server copy so customizations
  // stick across restarts even when there's no Supabase write.
  const prefs = { ...((profile?.preferences ?? {}) as Record<string, any>), ...localPrefs };
  const customQuote: string | undefined = prefs.custom_quote;
  const coverUrl: string | undefined = pendingCover ?? prefs.cover_url;
  const avatarUrl: string | undefined =
    pendingAvatar ?? profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? undefined;
  // While editing, preview the draft swatch live so the user can see what
  // each color does to the rest of the profile (identity strip, tab
  // accents, CTAs). Falls back to the saved value when not editing.
  const savedAccent: string = prefs.accent_color || Navy.DEFAULT;
  const savedCard: string = prefs.passport_card_color || Navy.DEFAULT;
  const savedText: string = prefs.passport_text_color || '#ffffff';
  const accentColor: string = editing ? draftAccent : savedAccent;
  const cardColor: string = editing ? draftCard : savedCard;
  const textColor: string = editing ? draftText : savedText;

  // Hydrate drafts when entering edit mode. Use the saved accent so we
  // don't depend on the live preview (which itself references draftAccent).
  useEffect(() => {
    if (editing) {
      setDraftQuote(customQuote ?? '');
      setDraftAccent(savedAccent);
      setDraftCard(savedCard);
      setDraftText(savedText);
      setHexInput(savedAccent);
    }
  }, [editing, customQuote, savedAccent, savedCard, savedText]);

  const applyHex = useCallback(() => {
    const trimmed = hexInput.trim();
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      applyColor(hex);
    }
  }, [hexInput, applyColor]);

  // Load favorites count from AsyncStorage (same key the app uses everywhere).
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((val) => {
        if (val) {
          try {
            const ids = JSON.parse(val);
            if (Array.isArray(ids)) setFavoriteIds(ids);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Travel quote — the user's custom quote takes precedence; otherwise we
  // pull a random one from /api/quote so the header is never empty.
  useEffect(() => {
    if (customQuote) return;
    const base = getWebApiBase();
    fetch(`${base}/api/quote?tag=travel`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.content) setApiQuote({ content: data.content, author: data.author ?? 'Anonymous' });
      })
      .catch(() => {});
  }, [customQuote]);

  // Real stats — derived from the user's actual trips + saved favorites.
  const stats = useMemo(() => {
    const countries = new Set<string>();
    const places = new Set<string>();
    for (const t of trips) {
      const country = (t.destination || '').split(',').slice(-1)[0]?.trim();
      if (country) countries.add(country);
      const itinerary = ((t.trip_context as any)?.itinerary ?? []) as any[];
      for (const day of itinerary) {
        for (const slot of day?.slots ?? []) {
          const name = slot?.poi?.name ?? slot?.title;
          if (name) places.add(name);
        }
      }
    }
    return {
      countries: countries.size,
      places: places.size,
      favorites: favoriteIds.length,
      trips: trips.length,
    };
  }, [trips, favoriteIds]);

  const countryGroups = useMemo(() => groupTripsByCountry(trips), [trips]);

  // ─── Edit-mode actions ────────────────────────────────────

  const handlePickAvatar = useCallback(async () => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    const url = await pickAndUpload(user.id, 'avatar');
    setUploadingAvatar(false);
    if (url) setPendingAvatar(url);
  }, [user?.id]);

  const handlePickCover = useCallback(async () => {
    if (!user?.id) return;
    setUploadingCover(true);
    const url = await pickAndUpload(user.id, 'cover');
    setUploadingCover(false);
    if (url) setPendingCover(url);
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    // Visual prefs live in AsyncStorage — anonymous users keep their look,
    // and we skip a Supabase round-trip on every Save. Avatar uploads still
    // go to Supabase storage in the upload helper; only the avatar_url
    // pointer is written to the user's row when they're authenticated.
    const nextLocalPrefs: Record<string, any> = {
      ...localPrefs,
      ...(pendingCover ? { cover_url: pendingCover } : {}),
      ...(draftAccent ? { accent_color: draftAccent } : {}),
      ...(draftCard ? { passport_card_color: draftCard } : {}),
      ...(draftText ? { passport_text_color: draftText } : {}),
      ...(draftQuote.trim() ? { custom_quote: draftQuote.trim() } : { custom_quote: null }),
    };
    try {
      await AsyncStorage.setItem(PROFILE_PREFS_KEY, JSON.stringify(nextLocalPrefs));
      setLocalPrefs(nextLocalPrefs);
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Save failed', e?.message ?? 'Could not save preferences locally.');
      return;
    }
    if (pendingAvatar && user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: pendingAvatar })
        .eq('id', user.id);
      if (error) {
        setSaving(false);
        Alert.alert('Save failed', error.message ?? 'Could not save avatar.');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
    setSaving(false);
    setEditing(false);
    setPendingAvatar(null);
    setPendingCover(null);
  }, [user?.id, localPrefs, pendingAvatar, pendingCover, draftAccent, draftCard, draftText, draftQuote, queryClient]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setPendingAvatar(null);
    setPendingCover(null);
    setDraftQuote(customQuote ?? '');
    setDraftAccent(savedAccent);
    setDraftCard(savedCard);
    setDraftText(savedText);
  }, [customQuote, savedAccent, savedCard, savedText]);

  // ─── Loading + auth gates ─────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.skeleton, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ ...TextStyles.headline, color: colors.textTertiary }}>?</Text>
        </View>
        <Text style={{ ...TextStyles.title, color: colors.text, marginBottom: 6 }}>Sign in to view your profile</Text>
        <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          Create an account to save trips, track favorites, and sync across devices.
        </Text>
        <Pressable
          onPress={() => router.push('/login')}
          style={{ height: 44, width: '100%', borderRadius: 12, backgroundColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...TextStyles.button, color: '#fff' }}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // The displayed quote: user's custom override takes precedence.
  const displayedQuote: QuoteData | null = customQuote
    ? { content: customQuote, author: displayName }
    : apiQuote;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!wheelDragging}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Cover header (image or accent solid) ──────────────── */}
      <View style={{ height: COVER_HEIGHT, backgroundColor: accentColor, position: 'relative' }}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={[`${accentColor}00`, `${accentColor}66`, accentColor]}
          locations={[0, 0.6, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: COVER_HEIGHT }}
          pointerEvents="none"
        />
        {editing && (
          <Pressable
            onPress={handlePickCover}
            style={{
              position: 'absolute', top: 16, left: 16,
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(0,0,0,0.45)',
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
            }}
          >
            {uploadingCover ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <FontAwesome name="image" size={11} color="#fff" />
            )}
            <Text style={{ ...TextStyles.caption, color: '#fff', fontWeight: '600' }}>
              {coverUrl ? 'Change header' : 'Add header'}
            </Text>
          </Pressable>
        )}
        {/* Top-right toolbar: Edit / Save+Cancel / Settings */}
        <View style={{ position: 'absolute', top: 16, right: 12, flexDirection: 'row', gap: 8 }}>
          {editing ? (
            <>
              <Pressable
                onPress={handleCancel}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)' }}
              >
                <Text style={{ ...TextStyles.caption, color: '#fff', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                {saving && <ActivityIndicator color={accentColor} size="small" />}
                <Text style={{ ...TextStyles.caption, color: accentColor, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => setEditing(true)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <FontAwesome name="pencil" size={11} color="#fff" />
                <Text style={{ ...TextStyles.caption, color: '#fff', fontWeight: '600' }}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/profile/settings')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 7 }}
              >
                <FontAwesome name="cog" size={13} color={onAccent(accentColor, 0.85)} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* ─── Identity block — accent-tinted, sits below cover ────── */}
      <View style={{ backgroundColor: accentColor, paddingBottom: 22, alignItems: 'center', paddingHorizontal: 32 }}>
        {/* Avatar (overlaps the cover by half) */}
        <Pressable
          onPress={editing ? handlePickAvatar : undefined}
          style={{ position: 'relative', marginTop: -44, marginBottom: 10 }}
        >
          <View
            style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: '#fff',
              borderWidth: 3, borderColor: '#fff',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 84, height: 84, borderRadius: 42 }} resizeMode="cover" />
            ) : (
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ ...TextStyles.headline, color: '#fff' }}>{initials}</Text>
              </View>
            )}
          </View>
          {(editing || !avatarUrl) && (
            <View
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: editing ? '#fff' : colors.info,
                borderWidth: 2, borderColor: accentColor,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color={accentColor} size="small" />
              ) : (
                <FontAwesome name="camera" size={11} color={editing ? accentColor : '#fff'} />
              )}
            </View>
          )}
        </Pressable>

        <Text style={{ ...TextStyles.title, color: onAccent(accentColor, 1) }}>{displayName}</Text>

        {/* Quote — TextInput when editing, otherwise the displayed quote */}
        {editing ? (
          <View style={{ width: '100%', marginTop: 10 }}>
            <TextInput
              value={draftQuote}
              onChangeText={setDraftQuote}
              placeholder="Write your own travel quote… (or leave blank for a random one)"
              placeholderTextColor={onAccent(accentColor, 0.55)}
              multiline
              maxLength={140}
              style={{
                ...TextStyles.body, color: onAccent(accentColor, 1), fontStyle: 'italic',
                textAlign: 'center', minHeight: 50,
                borderRadius: 10,
                backgroundColor: 'rgba(0,0,0,0.18)',
                paddingHorizontal: 12, paddingVertical: 10,
              }}
            />
          </View>
        ) : displayedQuote ? (
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ ...TextStyles.body, color: onAccent(accentColor, 0.85), textAlign: 'center', fontStyle: 'italic' }} numberOfLines={3}>
              "{displayedQuote.content}"
            </Text>
            <Text style={{ ...TextStyles.caption, color: onAccent(accentColor, 0.55), marginTop: 4 }}>— {displayedQuote.author}</Text>
          </View>
        ) : (
          <View style={{ marginTop: 8, height: 36, justifyContent: 'center' }}>
            <ActivityIndicator color="rgba(255,255,255,0.3)" size="small" />
          </View>
        )}

        {/* Color customization — single wheel, target toggle. Profile sets
            the global accent (identity, tabs, ring on stamps). Card sets
            the navy fill of the stamp. Text sets the country-name color. */}
        {editing && (
          <View style={{ marginTop: 14, alignSelf: 'stretch', alignItems: 'center', gap: 12 }}>
            {/* Three-way target toggle */}
            <View style={{ flexDirection: 'row', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)', padding: 3 }}>
              {(['accent', 'card', 'text'] as const).map((target) => {
                const active = colorTarget === target;
                const label = target === 'accent' ? 'Profile' : target === 'card' ? 'Card' : 'Text';
                return (
                  <Pressable
                    key={target}
                    onPress={() => setColorTarget(target)}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
                      backgroundColor: active ? '#fff' : 'transparent',
                    }}
                  >
                    <Text style={{ ...TextStyles.caption, color: active ? Navy.DEFAULT : onAccent(accentColor, 0.85), fontWeight: '700' }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Preset row — applies to the active target. */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              {ACCENT_PALETTE.map((color) => {
                const current = colorTarget === 'accent' ? draftAccent : colorTarget === 'card' ? draftCard : draftText;
                const selected = current === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => applyColor(color)}
                    style={{
                      width: 30, height: 30, borderRadius: 15,
                      backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: selected ? 2.5 : 1.5,
                      borderColor: selected ? '#fff' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {selected && <FontAwesome name="check" size={11} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>

            {/* The wheel — bound to the active target */}
            <ColorWheel
              size={140}
              value={colorTarget === 'accent' ? draftAccent : colorTarget === 'card' ? draftCard : draftText}
              onChange={applyColor}
              onDragChange={setWheelDragging}
            />

            {/* Hex input + Apply — types into the active target. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 26, height: 26, borderRadius: 6,
                  backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : 'rgba(255,255,255,0.15)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                }}
              />
              <TextInput
                value={hexInput}
                onChangeText={setHexInput}
                onSubmitEditing={applyHex}
                placeholder="#3498db"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
                maxLength={7}
                style={{
                  width: 110,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 6,
                  ...TextStyles.caption, color: '#fff', fontFamily: 'monospace',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              />
              <Pressable onPress={applyHex} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <Text style={{ ...TextStyles.caption, color: '#fff', fontWeight: '700' }}>Apply</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Real stats */}
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 18 }}>
          {[
            { value: String(stats.countries), label: 'Countries' },
            { value: String(stats.places), label: 'Places' },
            { value: String(stats.favorites), label: 'Favorites' },
            { value: String(stats.trips), label: 'Trips' },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: 'center' }}>
              <Text style={{ ...TextStyles.subhead, color: onAccent(accentColor, 1) }}>{stat.value}</Text>
              <Text style={{ ...TextStyles.xs, color: onAccent(accentColor, 0.6), letterSpacing: 1 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tab bar — Passport (countries collected) + Favorites (saved places) */}
      <View style={{ backgroundColor: colors.cardBackground, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable
          onPress={() => setProfileTab('passport')}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: profileTab === 'passport' ? accentColor : 'transparent' }}
        >
          <Text style={profileTab === 'passport' ? { ...TextStyles.bodyEm, color: accentColor } : { ...TextStyles.body, color: colors.textTertiary }}>
            Passport ({stats.countries})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setProfileTab('favorites')}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: profileTab === 'favorites' ? accentColor : 'transparent' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="heart" size={10} color={profileTab === 'favorites' ? accentColor : colors.textTertiary} />
            <Text style={profileTab === 'favorites' ? { ...TextStyles.bodyEm, color: accentColor } : { ...TextStyles.body, color: colors.textTertiary }}>
              Favorites ({favoriteIds.length})
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Content. Sign Out lives in Settings (gear icon, top-right). */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>
        {profileTab === 'passport' ? (
          tripsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={colors.text} />
            </View>
          ) : countryGroups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <FontAwesome name="globe" size={28} color={colors.textTertiary} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                Your passport is empty. Plan a trip to start collecting stamps.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/(home)' as any)}
                style={{ marginTop: 14, height: 40, paddingHorizontal: 18, borderRadius: 10, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>Plan a trip</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {countryGroups.map((group) => (
                <View
                  key={group.country}
                  style={{ width: '50%', paddingHorizontal: 4, marginBottom: 8 }}
                >
                  <PassportStamp
                    group={group}
                    accentColor={accentColor}
                    cardColor={cardColor}
                    textColor={textColor}
                    onPress={() => router.push('/(tabs)/trips' as any)}
                  />
                </View>
              ))}
            </View>
          )
        ) : (
          // Favorites — rich place cards filtered from the same discover-feed
          // the Places + Favorites screens use. Sort + tap-to-detail.
          favoriteIds.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <FontAwesome name="heart-o" size={28} color={colors.textTertiary} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 24 }}>
                Tap the heart on any place to save it here.
              </Text>
            </View>
          ) : (
            <View>
              {/* Sort selector */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {([
                  { key: 'recent', label: 'Recent' },
                  { key: 'name', label: 'A–Z' },
                  { key: 'category', label: 'Category' },
                ] as const).map((opt) => {
                  const active = favSort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setFavSort(opt.key)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
                        backgroundColor: active ? accentColor : colors.cardBackground,
                        borderWidth: 1, borderColor: active ? accentColor : colors.border,
                      }}
                    >
                      <Text style={{ ...TextStyles.caption, color: active ? '#fff' : colors.textSecondary, fontWeight: '600' }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {favoritedPlaces.length === 0 && (discoverLoading || isFetchingDiscoverNext) ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator color={colors.text} />
                  <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginTop: 8 }}>
                    Loading your saved places…
                  </Text>
                </View>
              ) : favoritedPlaces.length === 0 ? (
                // All pages loaded but none of the saved IDs matched — push the
                // user to the full Favorites screen which can search by ID.
                <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 }}>
                  <FontAwesome name="search" size={24} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                    Your saved places aren't in the recent feed. View them all in the Favorites tab.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/favorites' as any)}
                    style={{ marginTop: 14, height: 38, paddingHorizontal: 18, borderRadius: 10, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>View all favorites</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 }}>
                  {favoritedPlaces.map((place) => (
                    <View key={place.id} style={{ width: '50%', paddingHorizontal: 2 }}>
                      <GridPlaceCard
                        place={place}
                        isFav
                        onPress={() => router.push('/(tabs)/favorites' as any)}
                        onToggleFav={() => removeFavorite(place.id)}
                        colors={colors}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* If we have some matches but more pages still loading */}
              {favoritedPlaces.length > 0 && favoritedPlaces.length < favoriteIds.length && isFetchingDiscoverNext && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <ActivityIndicator color={colors.textSecondary} size="small" />
                </View>
              )}
            </View>
          )
        )}
      </View>
    </ScrollView>
  );
}

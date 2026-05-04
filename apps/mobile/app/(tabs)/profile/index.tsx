import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, Image, TextInput,
  ActivityIndicator, Alert, PanResponder, Modal, Platform, Dimensions,
} from 'react-native';
import Svg, { Path as SvgPath, Circle as SvgCircle, Defs, RadialGradient, Stop } from 'react-native-svg';

// Conditional react-native-maps — try to load it; if it isn't bundled
// (e.g. Expo Go), fall through to plain View. Don't gate on
// `Constants.appOwnership` because that's deprecated and returns null in
// custom dev clients on newer SDKs, which would skip the require here.
let MapView: any = View;
let Marker: any = View;
let MAPS_AVAILABLE = false;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    MAPS_AVAILABLE = !!maps.default;
  } catch {}
}
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
  updateProfile,
  favoritesKeyFor,
  type Trip,
  type PlaceItem,
  type DiscoverPageResult,
} from '@travyl/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GridPlaceCard } from '@/components/places/GridPlaceCard';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';

// Favorites storage key is now per-user via favoritesKeyFor(user.id)
// (imported from @travyl/shared). The legacy `travyl-favorites` global
// key bled saved places between accounts on shared devices.
//
// Visual customization (accent, card, text, quote, cover_url) is persisted
// to AsyncStorage instead of Supabase so it survives app restarts even for
// anonymous users and avoids a round-trip on every save.
//
// IMPORTANT: scoped per user. A single shared key bled prefs (and the
// uploaded avatar/cover URLs) between accounts on shared devices —
// signing in as a different user would inherit the previous user's
// avatar because `localPrefs` overrides `profile.preferences` in the
// merge below. The `:anon` bucket is for users who haven't signed in;
// it gets read once on sign-in and never written back for them.
const PROFILE_PREFS_KEY_BASE = 'travyl-profile-prefs';
const RECENT_COLORS_KEY_BASE = 'travyl-profile-recent-colors';
const prefsKeyFor = (userId: string | null | undefined) =>
  `${PROFILE_PREFS_KEY_BASE}:${userId || 'anon'}`;
const recentColorsKeyFor = (userId: string | null | undefined) =>
  `${RECENT_COLORS_KEY_BASE}:${userId || 'anon'}`;

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

// Compact number formatter for stat columns. Caps width at 4 chars so
// extreme values (1M+ trips) don't overflow the row.
//   742 → "742", 1234 → "1.2k", 12345 → "12k", 1234567 → "1.2m"
function compactNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (n < 1000000) return Math.round(n / 1000) + 'k';
  if (n < 10000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  return Math.round(n / 1000000) + 'm';
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

// Returns the perceived luminance (0..255) of a hex color, or 128 if
// the input is malformed. Same coefficients as `onAccent` so behaviour
// stays consistent across helpers.
function luma(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return 128;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// Picks a readable color: returns `desired` if it has enough contrast
// against `bg`, otherwise falls back to white-on-dark / dark-on-light.
// Prevents the user from rendering their own profile invisible by
// picking text=accent (e.g. white text on white accent).
function readable(desired: string, bg: string): string {
  const lDesired = luma(desired);
  const lBg = luma(bg);
  // Contrast measured as luminance delta on a 0..255 scale; 70 is the
  // empirical floor for "barely readable" without going full WCAG.
  if (Math.abs(lDesired - lBg) >= 70) return desired;
  return lBg > 160 ? '#142846' : '#ffffff';
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
  // Representative photo from one of the user's trips to this country —
  // pulled from trip_context.hero_image_url first, then itinerary slots.
  imageUrl: string | null;
}

// Country name → ISO 3166-1 alpha-2 code. Covers the popular travel
// destinations the trip generator surfaces; unknowns fall back to the
// default stamp styling.
const COUNTRY_CODES: Record<string, string> = {
  'united states': 'us', 'usa': 'us', 'us': 'us',
  'united kingdom': 'gb', 'uk': 'gb', 'england': 'gb', 'scotland': 'gb', 'wales': 'gb',
  japan: 'jp', china: 'cn', 'south korea': 'kr', korea: 'kr',
  thailand: 'th', vietnam: 'vn', indonesia: 'id', singapore: 'sg', malaysia: 'my',
  philippines: 'ph', india: 'in', nepal: 'np',
  france: 'fr', italy: 'it', spain: 'es', portugal: 'pt', greece: 'gr',
  germany: 'de', netherlands: 'nl', belgium: 'be', switzerland: 'ch', austria: 'at',
  ireland: 'ie', iceland: 'is', norway: 'no', sweden: 'se', denmark: 'dk', finland: 'fi',
  poland: 'pl', 'czech republic': 'cz', czechia: 'cz', hungary: 'hu', croatia: 'hr',
  turkey: 'tr', russia: 'ru',
  canada: 'ca', mexico: 'mx', cuba: 'cu', jamaica: 'jm',
  brazil: 'br', argentina: 'ar', chile: 'cl', peru: 'pe', colombia: 'co', ecuador: 'ec',
  australia: 'au', 'new zealand': 'nz', fiji: 'fj', 'french polynesia': 'pf',
  egypt: 'eg', morocco: 'ma', 'south africa': 'za', kenya: 'ke', tanzania: 'tz',
  uae: 'ae', 'united arab emirates': 'ae', israel: 'il', jordan: 'jo', 'saudi arabia': 'sa',
};

function flagUrlForCountry(country: string): string | null {
  const code = COUNTRY_CODES[country.trim().toLowerCase()];
  return code ? `https://flagcdn.com/w320/${code}.png` : null;
}

// Groups trips by country (last comma-segment of `destination`). Cities are
// kept unique. Years are derived from `start_date` so the stamp can show a
// "VISITED 2023" or year-range mark.
// Pulls a representative image url out of a trip — hero first, then the
// first itinerary slot photo, then any explore/foursquare image. Returns
// null if the trip has no usable image.
function pickAnyImage(o: any): string | undefined {
  if (!o) return undefined;
  return o.image || o.image_url || o.photo_url || o.photo || o.thumbnail
    || (Array.isArray(o.images) ? o.images[0] : undefined)
    || (Array.isArray(o.photos) ? (typeof o.photos[0] === 'string' ? o.photos[0] : o.photos[0]?.url) : undefined);
}

function tripImage(trip: Trip): string | null {
  const ctx = trip.trip_context as any;
  if (!ctx) return null;
  if (typeof ctx.hero_image_url === 'string' && ctx.hero_image_url) return ctx.hero_image_url;
  if (Array.isArray(ctx.hero_images) && ctx.hero_images[0]) return ctx.hero_images[0];
  for (const day of (ctx.itinerary ?? [])) {
    for (const slot of (day?.slots ?? [])) {
      const img = pickAnyImage(slot?.poi) ?? pickAnyImage(slot);
      if (img) return img;
    }
  }
  for (const item of (ctx.explore_items ?? [])) {
    const img = pickAnyImage(item);
    if (img) return img;
  }
  for (const venue of (ctx.foursquare_venues ?? [])) {
    const img = pickAnyImage(venue);
    if (img) return img;
  }
  return null;
}

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
    const tripImg = tripImage(trip);

    const existing = map.get(country);
    if (existing) {
      if (city && !existing.cities.includes(city)) existing.cities.push(city);
      existing.count += 1;
      if (!isNaN(year)) {
        existing.firstYear = Math.min(existing.firstYear, year);
        existing.lastYear = Math.max(existing.lastYear, year);
      }
      if (!existing.imageUrl && tripImg) existing.imageUrl = tripImg;
    } else {
      map.set(country, {
        country,
        cities: city ? [city] : [],
        count: 1,
        firstYear: isNaN(year) ? new Date().getFullYear() : year,
        lastYear: isNaN(year) ? new Date().getFullYear() : year,
        imageUrl: tripImg,
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

// Pick an image and upload it to the Supabase `avatars` bucket so the
// image works on web + every other device. Falls back to the raw local
// URI for anon users (no userId) so they still see their selection
// locally — that URI gets replaced with the public URL the next time
// the user signs in and saves.
async function pickAndUploadImage(field: 'avatar' | 'cover', userId?: string): Promise<string | null> {
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
    quality: 0.7,
  });
  const localUri = result.canceled ? null : result.assets?.[0]?.uri ?? null;
  if (!localUri) return null;

  // Anon users get the local URI back — it works on this device and gets
  // replaced with a real public URL the next time they save while signed in.
  if (!userId) return localUri;

  try {
    // Convert the local file:// URI to an ArrayBuffer the storage client
    // can upload. fetch() works for file:// URIs in React Native.
    const res = await fetch(localUri);
    const arrayBuffer = await res.arrayBuffer();
    const ext = (localUri.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
  } catch (e: any) {
    // Upload failed (bucket missing, RLS, network). Keep the local URI so
    // the user at least sees their pick on this device; surfacing the
    // error here would be too aggressive for a profile-polish flow.
    console.warn('[profile] cover/avatar upload failed, using local URI:', e?.message);
    return localUri;
  }
}


// Full color wheel — hue varies with angle, saturation with radius.
// Draggable anywhere inside the disc; the center is desaturated white.
// Sized to 150px so it fits comfortably on iPhone SE.
function ColorWheel({ value, onChange, onDragChange, size = 150 }: { value: string; onChange: (hex: string) => void; onDragChange?: (dragging: boolean) => void; size?: number }) {
  const radius = size / 2;
  const { h: hue, s: sat, l: lit } = hexToHsl(value);
  const angleRad = ((hue - 90) * Math.PI) / 180;
  // Radial axis is now bidirectional:
  //   inner half (t in 0..0.5): white at center → full color (sat 0..1, l=0.5)
  //   outer half (t in 0.5..1): full color → black (sat=1, l=0.5..0)
  // Map the current HSL value back into this axis for thumb placement.
  const thumbT = lit < 0.5 ? (1 - lit) : Math.min(sat, 1) * 0.5;
  const thumbR = Math.min(thumbT, 1) * radius;
  const thumbX = radius + Math.cos(angleRad) * thumbR;
  const thumbY = radius + Math.sin(angleRad) * thumbR;

  // Keep `onChange` and `onDragChange` in refs so the PanResponder created
  // once on mount always invokes the LATEST handler. Without this, a
  // re-render that swaps `onChange` (e.g. user switches color target tabs
  // mid-drag) would have the responder still calling the old handler,
  // which is why drags occasionally felt like they "didn't apply".
  const onChangeRef = useRef(onChange);
  const onDragChangeRef = useRef(onDragChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onDragChangeRef.current = onDragChange; }, [onDragChange]);

  const handleTouch = useCallback((locationX: number, locationY: number) => {
    const dx = locationX - radius;
    const dy = locationY - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t = Math.min(dist / radius, 1);
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const newHue = (deg + 90 + 360) % 360;
    // Inner half (0..0.5): saturation 0→1, lightness fixed at 0.5.
    // Outer half (0.5..1): saturation stays 1, lightness 0.5→0 so the
    // rim ends in pure black. This gives the wheel access to darker
    // shades (and #000) without needing the brightness row.
    const newSat = t <= 0.5 ? t * 2 : 1;
    const newLight = t <= 0.5 ? 0.5 : 0.5 - (t - 0.5);
    onChangeRef.current?.(hslToHex(newHue, newSat, newLight));
  }, [radius]);

  // PanResponder created once and never invalidated, so its handlers stay
  // attached to the View through the whole drag.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (evt) => {
      onDragChangeRef.current?.(true);
      handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
    },
    onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
    onPanResponderRelease: () => onDragChangeRef.current?.(false),
    onPanResponderTerminate: () => onDragChangeRef.current?.(false),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [handleTouch]);

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
            {/* Inner half — desaturate toward white at center, transparent
                by ~50% radius so the vivid color band shows through at
                mid radius. */}
            <RadialGradient id="satGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </RadialGradient>
            {/* Outer half — start transparent at the vivid mid-band and
                ramp to opaque black at the rim, so the rim renders the
                #000 the user can pick by dragging all the way out. */}
            <RadialGradient id="darkGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#000" stopOpacity="0" />
              <Stop offset="50%" stopColor="#000" stopOpacity="0" />
              <Stop offset="100%" stopColor="#000" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          {wedges.map((w, i) => (
            <SvgPath key={i} d={w.path} fill={w.color} />
          ))}
          {/* White inner falloff (pastels) */}
          <SvgCircle cx={radius} cy={radius} r={radius} fill="url(#satGrad)" />
          {/* Black rim falloff (dark shades + black) */}
          <SvgCircle cx={radius} cy={radius} r={radius} fill="url(#darkGrad)" />
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

// All map-pinnable items aggregated from a country's trips. Pulls coords
// from itinerary slot pois and explore items.
interface VisitedPlace {
  id: string;
  name: string;
  category?: string;
  image?: string;
  images?: string[];
  lat: number;
  lng: number;
  city?: string;
  tripId?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  priceLevel?: number;
}

function placesForCountry(trips: Trip[], country: string): VisitedPlace[] {
  const out: VisitedPlace[] = [];
  // Dedup is per-trip rather than global so the same place visited on
  // multiple trips appears once per trip (with its own tripId). The old
  // global dedup attributed every shared place to the FIRST trip, which
  // hid Trip 2's data behind Trip 1 on the map.
  const target = country.trim().toLowerCase();

  // Itinerary slots store their photo under `photo_url` (see
  // useItineraryScreen — slot.poi.photo_url). explore_items / foursquare
  // venues use `image` or `image_url`. Build a name → image lookup across
  // every variation so a row never falls back to the country hero just
  // because we read the wrong field.
  const imgByName = new Map<string, string>();
  const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const pickImg = (o: any): string | undefined =>
    o?.image || o?.image_url || o?.photo_url || o?.photo || o?.thumbnail
    || (Array.isArray(o?.images) ? o.images[0] : undefined)
    || (Array.isArray(o?.photos) ? (typeof o.photos[0] === 'string' ? o.photos[0] : o.photos[0]?.url) : undefined);
  const remember = (name?: string, image?: string) => {
    const k = norm(name);
    if (!k || !image) return;
    if (!imgByName.has(k)) imgByName.set(k, image);
  };
  for (const trip of trips) {
    const tail = (trip.destination || '').split(',').slice(-1)[0]?.trim().toLowerCase();
    if (tail !== target) continue;
    const ctx = trip.trip_context as any;
    for (const e of (ctx?.explore_items ?? [])) remember(e?.name ?? e?.title, pickImg(e));
    for (const v of (ctx?.foursquare_venues ?? [])) remember(v?.name ?? v?.title, pickImg(v));
    for (const day of (ctx?.itinerary ?? [])) {
      for (const slot of (day?.slots ?? [])) {
        const poi = slot?.poi ?? {};
        remember(poi.name ?? slot?.title, pickImg(poi) ?? pickImg(slot));
      }
    }
  }

  for (const trip of trips) {
    const dest = (trip.destination || '').trim();
    const tail = dest.split(',').slice(-1)[0]?.trim().toLowerCase();
    if (tail !== target) continue;
    const ctx = trip.trip_context as any;
    const city = (trip.destination || '').split(',')[0]?.trim();
    // Per-trip dedup so duplicate POIs across explore_items / itinerary
    // for the SAME trip don't double-count, but the same place from a
    // DIFFERENT trip still appears (with its own tripId).
    const seenInTrip = new Set<string>();
    const pickRating = (o: any): number | undefined => {
      const r = o?.rating ?? o?.stars ?? o?.score;
      const n = typeof r === 'string' ? parseFloat(r) : r;
      return typeof n === 'number' && isFinite(n) && n > 0 ? n : undefined;
    };
    const pickReviewCount = (o: any): number | undefined => {
      const c = o?.reviewCount ?? o?.review_count ?? o?.reviews ?? o?.totalRatings ?? o?.user_ratings_total;
      const n = typeof c === 'string' ? parseInt(c, 10) : c;
      return typeof n === 'number' && isFinite(n) && n > 0 ? n : undefined;
    };
    // Collect every image URL we can find on a record. Magazine cards on
    // the places page cycle through up to 6 photos — pull the photos
    // array, the gallery array, and the single-image fields all into one
    // de-duped list so the country modal's tinder card has the same
    // multi-photo experience.
    const pickImages = (o: any): string[] => {
      if (!o) return [];
      const out: string[] = [];
      const push = (v: any) => {
        const s = typeof v === 'string' ? v : v?.url ?? v?.src ?? v?.image;
        if (typeof s === 'string' && s && !out.includes(s)) out.push(s);
      };
      for (const arr of [o.images, o.photos, o.gallery, o.photo_urls]) {
        if (Array.isArray(arr)) for (const v of arr) push(v);
      }
      for (const k of ['image', 'image_url', 'photo_url', 'photo', 'thumbnail', 'cover_image']) push(o[k]);
      return out;
    };
    const pushPlace = (src: any, name?: string, lat?: number, lng?: number, category?: string, id?: string) => {
      if (!name || typeof lat !== 'number' || typeof lng !== 'number') return;
      const key = `${name}|${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seenInTrip.has(key)) return;
      seenInTrip.add(key);
      const imgs = pickImages(src);
      const primary = imgs[0] || imgByName.get(norm(name));
      out.push({
        // Prefix the id with trip.id so the same POI on two trips ends
        // up with two unique entries rather than colliding in React keys.
        id: `${trip.id}:${id || key}`,
        name,
        category,
        image: primary,
        images: imgs,
        lat,
        lng,
        city,
        tripId: trip.id,
        rating: pickRating(src),
        reviewCount: pickReviewCount(src),
        description: src?.description ?? src?.about ?? src?.summary ?? src?.tagline,
        address: src?.address ?? src?.formatted_address ?? src?.vicinity,
        phone: src?.phone ?? src?.phone_number ?? src?.formatted_phone_number,
        website: src?.website ?? src?.url ?? src?.web_url,
        hours: typeof src?.hours === 'string' ? src.hours : (src?.opening_hours?.weekday_text?.join(' · ') ?? undefined),
        priceLevel: typeof src?.priceLevel === 'number' ? src.priceLevel
          : typeof src?.price_level === 'number' ? src.price_level
          : undefined,
      });
    };
    for (const day of (ctx?.itinerary ?? [])) {
      for (const slot of (day?.slots ?? [])) {
        const poi = slot?.poi ?? {};
        const merged = { ...slot, ...poi };
        pushPlace(
          merged,
          poi.name ?? slot?.title,
          poi.lat ?? poi.latitude ?? slot?.lat,
          poi.lng ?? poi.longitude ?? slot?.lng,
          poi.category ?? slot?.category,
          poi.id ?? slot?.id,
        );
      }
    }
    for (const item of (ctx?.explore_items ?? [])) {
      pushPlace(item, item?.name ?? item?.title, item?.lat, item?.lng, item?.category, item?.id);
    }
    for (const venue of (ctx?.foursquare_venues ?? [])) {
      pushPlace(venue, venue?.name ?? venue?.title, venue?.lat, venue?.lng, venue?.category, venue?.id);
    }
  }
  return out;
}

function PassportCountryModal({
  group, trips, accentColor, onClose, favoriteIds, favoritePool,
}: {
  group: CountryGroup | null;
  trips: Trip[];
  accentColor: string;
  onClose: () => void;
  favoriteIds: string[];
  favoritePool: PlaceItem[];
}) {
  const [mode, setMode] = useState<'visited' | 'favorites'>('visited');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const mapRef = useRef<any>(null);

  const visited = useMemo(
    () => (group ? placesForCountry(trips, group.country) : []),
    [trips, group],
  );

  // Filter the user's favorited places to ones in this country. We match
  // by address substring (cheapest test) or fall back to lat/lng overlap
  // with the visited bounding box.
  const favorites = useMemo<VisitedPlace[]>(() => {
    if (!group) return [];
    const idSet = new Set(favoriteIds);
    const candidates = favoritePool.filter((p) => idSet.has(p.id));
    if (candidates.length === 0) return [];
    const targetLower = group.country.toLowerCase();
    const cityLower = group.cities.map((c) => c.toLowerCase());
    let visBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null = null;
    if (visited.length > 0) {
      const lats = visited.map((v) => v.lat);
      const lngs = visited.map((v) => v.lng);
      visBounds = {
        minLat: Math.min(...lats) - 0.5, maxLat: Math.max(...lats) + 0.5,
        minLng: Math.min(...lngs) - 0.5, maxLng: Math.max(...lngs) + 0.5,
      };
    }
    return candidates
      .filter((p) => {
        const addr = (p.address || '').toLowerCase();
        if (addr.includes(targetLower)) return true;
        if (cityLower.some((c) => c && addr.includes(c))) return true;
        if (visBounds && p.latitude != null && p.longitude != null) {
          if (
            p.latitude >= visBounds.minLat && p.latitude <= visBounds.maxLat &&
            p.longitude >= visBounds.minLng && p.longitude <= visBounds.maxLng
          ) return true;
        }
        return false;
      })
      .map<VisitedPlace>((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        image: p.image,
        lat: p.latitude ?? 0,
        lng: p.longitude ?? 0,
        city: undefined,
      }))
      .filter((p) => p.lat !== 0 && p.lng !== 0);
  }, [group, favoriteIds, favoritePool, visited]);

  // Distinct trips for this country (visited mode only). Each trip gets a
  // stable color from a small palette so the user can tell at a glance
  // which marker belonged to which trip across multiple visits to the
  // same country. tripIndex (1..N) gives a short label for marker
  // tooltips like "Trip 3 · Stop 2".
  const TRIP_PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6'];
  const tripChips = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; color: string; index: number; placeCount: number; year: string }>();
    const allTrips = group ? trips.filter((t) => {
      const tail = (t.destination || '').split(',').slice(-1)[0]?.trim().toLowerCase();
      return tail === group.country.trim().toLowerCase();
    }).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '')) : [];
    allTrips.forEach((t, i) => {
      if (seen.has(t.id)) return;
      const city = (t.destination || '').split(',')[0]?.trim() || 'Trip';
      const year = t.start_date ? String(new Date(t.start_date + 'T12:00:00').getFullYear()) : '';
      const label = year ? `${city} · ${year}` : city;
      const placeCount = visited.filter((p) => p.tripId === t.id).length;
      seen.set(t.id, { id: t.id, label, color: TRIP_PALETTE[i % TRIP_PALETTE.length], index: i + 1, placeCount, year });
    });
    return [...seen.values()];
  }, [trips, group, visited]);
  const tripColorById = useMemo(() => {
    const m = new Map<string, string>();
    tripChips.forEach((t) => m.set(t.id, t.color));
    return m;
  }, [tripChips]);
  const tripMetaById = useMemo(() => {
    const m = new Map<string, { index: number; label: string }>();
    tripChips.forEach((t) => m.set(t.id, { index: t.index, label: t.label }));
    return m;
  }, [tripChips]);
  // Per-place stop number, scoped to its trip (so each trip's pins
  // count 1..N independently). Lets the map title for any pin read
  // "Trip 3 · Stop 2 — Place name".
  const stopByPlaceId = useMemo(() => {
    const counters = new Map<string, number>();
    const m = new Map<string, number>();
    visited.forEach((p) => {
      if (!p.tripId) return;
      const n = (counters.get(p.tripId) ?? 0) + 1;
      counters.set(p.tripId, n);
      m.set(p.id, n);
    });
    return m;
  }, [visited]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  // Reset trip filter when country/mode changes so the modal opens at "All".
  useEffect(() => { setSelectedTripId(null); }, [group?.country, mode]);

  const placesAll = mode === 'visited' ? visited : favorites;
  // Trip filter only applies to visited mode (favorites don't have tripId).
  const places = useMemo(() => {
    if (mode !== 'visited' || !selectedTripId) return placesAll;
    return placesAll.filter((p) => p.tripId === selectedTripId);
  }, [placesAll, mode, selectedTripId]);

  const region = useMemo(() => {
    if (places.length === 0) return null;
    const lats = places.map((p) => p.lat);
    const lngs = places.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.6),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.6),
    };
  }, [places]);

  // savePlanToSupabase trims POI photos out of trip_context to stay under
  // the WAF 8KB limit, so visited POIs from older trips have no per-place
  // image. Resolve each place's image via SerpAPI google_local through our
  // /api/places?q= proxy — that path returns photos for both restaurants
  // and landmarks. Sequential (not concurrent) because the route is rate
  // limited at 30 req/min, and 32 places fired in parallel would 429.
  const placeKeys = useMemo(
    () => places.map((p) => `${p.name}|${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join('||'),
    [places],
  );
  const { data: imageMapData, isLoading: imagesLoading, isError: imagesError, error: imagesErrorObj } = useQuery<Record<string, string>>({
    // Bumping the version string in the queryKey invalidates anything
    // cached from earlier (broken) attempts at this fetch — without that,
    // a previously-cached `{}` would keep being returned.
    queryKey: ['passport-place-images-v3', group?.country, placeKeys],
    queryFn: async () => {
      if (!places.length) return {};
      const base = getWebApiBase();
      console.log(`[passport] fetching images, base=${base || '(empty)'}, places=${places.length}`);
      if (!base) return {};

      // /api/search/maps?q= goes to SerpAPI google_maps and returns a
      // single `place_results` for exact-name queries (e.g. "Shinjuku Gyoen
      // National Garden Tokyo" → that exact place with its photo). Use it
      // first. Fall back to /api/places only if maps returns nothing —
      // /api/places uses google_local NLP search and tends to return
      // top-tourist results regardless of the query, which is why we were
      // seeing the same Ueno Park photo on every card before.
      const tryPlace = async (p: VisitedPlace): Promise<string | undefined> => {
        const q = `${p.name}${p.city ? ' ' + p.city : ''}`;
        const tryUrls = [
          `${base}/api/search/maps?q=${encodeURIComponent(q)}`,
          `${base}/api/places?q=${encodeURIComponent(q)}&lat=${p.lat}&lng=${p.lng}&limit=3`,
        ];
        for (const url of tryUrls) {
          try {
            const r = await fetch(url);
            if (!r.ok) continue;
            const data = await r.json();
            if (!Array.isArray(data)) continue;
            // Pick the first result whose name actually overlaps with the
            // visited place's name — guards against the API returning a
            // generic top-result when the exact place isn't found.
            const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const target = norm(p.name);
            for (const it of data) {
              const candidateName = norm(String(it?.name || ''));
              if (!target || !candidateName) continue;
              if (target.includes(candidateName) || candidateName.includes(target)) {
                const img = pickAnyImage(it);
                if (img) return img;
              }
            }
            // Fallback within this endpoint: take the first result with an
            // image even if the name doesn't overlap. Better a relevant
            // nearby photo than nothing.
            for (const it of data) {
              const img = pickAnyImage(it);
              if (img) return img;
            }
          } catch {}
        }
        return undefined;
      };

      // Concurrency=2 keeps us under the 30 req/min rate limit while still
      // halving wall time vs full sequential.
      const out: Record<string, string> = {};
      let okCount = 0;
      const queue = [...places];
      const worker = async () => {
        while (queue.length) {
          const next = queue.shift();
          if (!next) break;
          const img = await tryPlace(next);
          if (img) { out[next.id] = img; okCount += 1; }
        }
      };
      await Promise.all([worker(), worker()]);
      console.log(`[passport] images resolved: ${okCount}/${places.length}`);
      return out;
    },
    enabled: !!group && places.length > 0,
    staleTime: 60 * 60 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  });

  const lookupImage = useCallback((id: string): string | undefined => {
    return imageMapData?.[id];
  }, [imageMapData]);

  // Reset selection when toggling mode
  useEffect(() => { setSelectedIdx(null); }, [mode]);

  // Animate map to a place when tapped in the list (or when the carousel
  // swipes between places via onIndexChange).
  const focusPlaceAt = useCallback((idx: number) => {
    const p = places[idx];
    if (!p) return;
    setSelectedIdx(idx);
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(
        { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        450,
      );
    }
  }, [places]);

  // Re-focus the map whenever selectedIdx changes (via list tap or swipe).
  useEffect(() => {
    if (selectedIdx == null) return;
    const p = places[selectedIdx];
    if (!p || !mapRef.current?.animateToRegion) return;
    mapRef.current.animateToRegion(
      { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  }, [selectedIdx, places]);

  // Map our VisitedPlace[] to PlaceItem[] so we can reuse the existing
  // CardStackCarousel that the Places page uses for its card-stack view.
  // Per-place image first (rare — most saved trip_contexts strip it), then
  // a name-matched image from the country places pool. Don't fall back to
  // group.imageUrl — that makes every card show the same trip hero.
  // Build a name-based lookup over the discover/favorites pool so we can
  // replace sparse trip_context entries with their fully-enriched
  // counterpart (multiple images, description, address, hours, website,
  // rating, etc.). Trip_context typically stores `{ name, lat, lng,
  // image }` only; the discover API returns the rich PlaceItem the
  // places + favorites screens render. Without this merge, the country
  // modal's tinder card shows a near-empty front (just the title block)
  // because there's no image URL to load.
  const enrichedByName = useMemo(() => {
    const byName = new Map<string, PlaceItem>();
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    for (const p of favoritePool) {
      const k = norm(p.name);
      if (!k) continue;
      // First write wins so we don't overwrite a fuller record with a
      // duplicate name's lighter version.
      if (!byName.has(k)) byName.set(k, p);
    }
    return byName;
  }, [favoritePool]);

  const placeItems = useMemo<PlaceItem[]>(() => places.map((p) => {
    const enriched = enrichedByName.get(p.name.trim().toLowerCase());
    const fallback = lookupImage(p.id);
    // Merge order: trip_context (latest, what the user actually saved) →
    // enriched discover record (richer fields) → SerpAPI fallback image.
    const tcImgs = p.images?.length ? p.images : (p.image ? [p.image] : []);
    const enrImgs = enriched?.images?.length ? enriched.images : (enriched?.image ? [enriched.image] : []);
    const merged: string[] = [];
    for (const u of [...tcImgs, ...enrImgs, ...(fallback ? [fallback] : [])]) {
      if (u && !merged.includes(u)) merged.push(u);
    }
    const primary = merged[0] || '';
    return {
      ...(enriched ?? {} as Partial<PlaceItem>),
      id: p.id,
      name: p.name,
      image: primary,
      images: merged,
      type: enriched?.type ?? 'attraction' as const,
      rating: p.rating ?? enriched?.rating ?? 0,
      reviewCount: p.reviewCount ?? enriched?.reviewCount,
      tagline: p.city || enriched?.tagline || '',
      category: p.category || enriched?.category || '',
      description: p.description ?? enriched?.description,
      address: p.address ?? enriched?.address,
      phone: p.phone ?? enriched?.phone,
      website: p.website ?? enriched?.website,
      hours: p.hours ?? enriched?.hours,
      priceLevel: p.priceLevel ?? enriched?.priceLevel,
      latitude: p.lat,
      longitude: p.lng,
    } as PlaceItem;
  }), [places, lookupImage, enrichedByName]);

  if (!group) return null;
  const sheetHeight = Dimensions.get('window').height * 0.5;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: Navy.DEFAULT }}>
        {/* ── Map background — fills the entire screen, like the places page ── */}
        {/* Country map — single MapView, always rendered. The place
            detail card slides up over the same map without spawning a
            second one. */}
        {MAPS_AVAILABLE && region ? (
          <MapView
            ref={mapRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            initialRegion={region}
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
          >
            {places.map((p, i) => {
              // Visited markers carry the trip's palette color so multiple
              // trips to the same country are visually distinguishable on
              // the map. Selected pin always overrides to red so it stands
              // out from the rest. Favorites have no tripId → fall back to
              // the page accent.
              const tripColor = (mode === 'visited' && p.tripId) ? tripColorById.get(p.tripId) : undefined;
              const pin = selectedIdx === i ? '#ef4444' : (tripColor || accentColor);
              const meta = mode === 'visited' && p.tripId ? tripMetaById.get(p.tripId) : undefined;
              const stop = mode === 'visited' ? stopByPlaceId.get(p.id) : undefined;
              // Map title surfaces trip + stop context so the user can
              // identify exactly which trip a pin belongs to without
              // toggling the chip filter.
              const title = mode === 'visited'
                ? (meta && stop ? `${meta.label} · Stop ${stop} — ${p.name}` : `${i + 1}. ${p.name}`)
                : p.name;
              return (
                <Marker
                  key={`${p.id}-${i}`}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  title={title}
                  description={p.category}
                  pinColor={pin}
                  onPress={() => setSelectedIdx(i)}
                />
              );
            })}
          </MapView>
        ) : (
          // Fallback so the screen isn't a black void in Expo Go.
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <LinearGradient
              colors={[Navy.DEFAULT, '#0a1f3a', '#1a2f4f']}
              locations={[0, 0.5, 1]}
              style={{ flex: 1 }}
            />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="map-o" size={56} color={accentColor + '60'} />
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.45)', marginTop: 14, letterSpacing: 1 }}>
                {MAPS_AVAILABLE ? 'NO COORDINATES' : 'MAP UNAVAILABLE IN EXPO GO'}
              </Text>
            </View>
          </View>
        )}

        {/* Top-left close */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute', top: 56, left: 16, zIndex: 20,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FontAwesome name="chevron-left" size={16} color="#fff" />
        </Pressable>
        {/* Country label — small flag chip + country name. Subtle but
            instantly identifies the country at a glance. */}
        <View
          style={{
            position: 'absolute', top: 56, right: 16, zIndex: 20,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 12, paddingVertical: 8,
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: 20,
          }}
        >
          {flagUrlForCountry(group.country) && (
            <View
              style={{
                width: 22, height: 15, borderRadius: 2, overflow: 'hidden',
                borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.6)',
              }}
            >
              <Image source={{ uri: flagUrlForCountry(group.country)! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          )}
          <Text style={{ ...TextStyles.bodyEm, color: '#fff', letterSpacing: 1 }}>
            {group.country.toUpperCase()}
          </Text>
        </View>

        {/* ── Bottom sheet — scrollable place list, overlays the map ── */}
        <View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: sheetHeight,
            backgroundColor: 'rgba(10,22,40,0.96)',
            borderTopLeftRadius: 22, borderTopRightRadius: 22,
            paddingTop: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 8,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </View>

          {/* Header — title on the left + heart toggle on the right.
              Default is Visited; tap the heart to flip to Favorites in
              this country. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 }}>
            <View>
              <Text style={{ ...TextStyles.subhead, color: '#fff' }}>
                {mode === 'visited' ? `Visited (${visited.length})` : `Favorites (${favorites.length})`}
              </Text>
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
                {mode === 'visited' ? 'Tap a stop to focus the map' : 'Saved places in this country'}
              </Text>
              {/* Debug strip — surfaces image-fetch progress + errors so we
                  can tell at a glance whether the API call is firing. */}
              {__DEV__ && (
                <Text style={{ ...TextStyles.xs, color: imagesError ? '#fca5a5' : 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {imagesLoading
                    ? `Fetching images… ${Object.keys(imageMapData ?? {}).length}/${places.length}`
                    : imagesError
                    ? `Image fetch error: ${(imagesErrorObj as any)?.message || 'unknown'}`
                    : `Images: ${Object.keys(imageMapData ?? {}).length}/${places.length}`}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setMode(mode === 'favorites' ? 'visited' : 'favorites')}
              hitSlop={10}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: mode === 'favorites' ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.08)',
                borderWidth: 1, borderColor: mode === 'favorites' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome
                name={mode === 'favorites' ? 'heart' : 'heart-o'}
                size={15}
                color={mode === 'favorites' ? '#ef4444' : 'rgba(255,255,255,0.7)'}
              />
            </Pressable>
          </View>

          {/* Trip filter — only shown in visited mode and only when the
              country has more than one trip. Each chip carries the trip's
              palette color (matching the map markers) and shows place
              count + year on a two-line layout for readability. Tap a
              chip to filter the map + list to that trip; tap again or
              "All" to clear. */}
          {mode === 'visited' && tripChips.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 6 }}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 10, paddingTop: 2, gap: 14 }}
            >
              {/* Lightweight chips — no border, no plate, just dot + text.
                  Active state lifts text-weight to bold; the dot is the
                  primary visual cue. Removes the heavy outlined-pill look
                  that was clashing with the place-row backgrounds. */}
              <Pressable
                onPress={() => setSelectedTripId(null)}
                style={{ height: 32, justifyContent: 'center' }}
              >
                <Text
                  style={{
                    ...TextStyles.caption,
                    color: !selectedTripId ? '#fff' : 'rgba(255,255,255,0.55)',
                    fontWeight: !selectedTripId ? '700' : '500',
                  }}
                >
                  All · {visited.length}
                </Text>
              </Pressable>
              {tripChips.map((t) => {
                const active = selectedTripId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedTripId(active ? null : t.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', height: 32 }}
                  >
                    <View
                      style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: t.color,
                        marginRight: 7,
                      }}
                    />
                    <Text
                      style={{
                        ...TextStyles.caption,
                        color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                        fontWeight: active ? '700' : '500',
                      }}
                      numberOfLines={1}
                    >
                      Trip {t.index}
                      {t.year ? ` · ${t.year}` : ''}
                      {' · '}
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>{t.placeCount}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {places.length === 0 ? (
            <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
              <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                {mode === 'visited'
                  ? `Plan an itinerary in ${group.country} to see your places mapped here.`
                  : `No saved favorites match places in ${group.country}.`}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {places.map((p, i) => {
                const selected = selectedIdx === i;
                // Prefer the place's own image, then the per-place SerpAPI
                // image (resolved by id), only fall back to the country hero
                // when a search returned nothing for that name.
                const imgUri = (p.image || lookupImage(p.id) || group.imageUrl) as string | undefined;
                return (
                  <View
                    key={p.id}
                    // Outer wrapper carries the shadow + margin; the inner
                    // Pressable handles borderRadius + overflow:hidden so
                    // the rounded corners actually clip on iOS (which
                    // refuses to render shadows on overflow:hidden views).
                    style={{
                      marginBottom: 12, borderRadius: 18,
                      backgroundColor: 'transparent',
                      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
                    }}
                  >
                  <Pressable
                    onPress={() => focusPlaceAt(i)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.9 : 1,
                      borderRadius: 18, overflow: 'hidden',
                      borderWidth: selected ? 1.5 : 0,
                      borderColor: selected ? '#ef4444' : 'transparent',
                    })}
                  >
                    {/* Mini-postcard: image hero on the left, gold pinstripe top,
                        gradient + text overlay on the right. Mirrors the
                        passport stamp + trip-postcard treatment. */}
                    {/* Image hero on the left, caption on the right.
                        Pressable wrapper handles rounded corners + overflow. */}
                    <View style={{ height: 96, flexDirection: 'row', backgroundColor: Navy.DEFAULT, borderRadius: 18, overflow: 'hidden' }}>
                      {/* Image hero — explicitly landscape (≈1.85:1) so the
                          row reads as a wide rectangle, not a square tile. */}
                      <View style={{ width: 156, height: '100%', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        {imgUri ? (
                          <Image
                            source={{ uri: imgUri, headers: { Referer: '' } }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <FontAwesome name="map-marker" size={18} color="rgba(255,255,255,0.35)" />
                          </View>
                        )}
                        {/* Soft right-edge fade so the image bleeds into the caption */}
                        <LinearGradient
                          colors={['rgba(0,0,0,0)', 'rgba(10,22,40,0.7)']}
                          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 30 }}
                          pointerEvents="none"
                        />
                      </View>

                      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' }}>
                        <Text style={{ ...TextStyles.bodyEm, color: '#fff' }} numberOfLines={1}>{p.name}</Text>
                        {!!(p.category || p.city) && (
                          <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 }} numberOfLines={1}>
                            {[p.category, p.city].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                        {typeof p.rating === 'number' && p.rating > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            {[0, 1, 2, 3, 4].map((idx) => {
                              const r = p.rating!;
                              const filled = idx + 1 <= Math.round(r);
                              return (
                                <FontAwesome
                                  key={idx}
                                  name="star"
                                  size={10}
                                  color={filled ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
                                  style={{ marginRight: 2 }}
                                />
                              );
                            })}
                            <Text style={{ ...TextStyles.xs, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>
                              {p.rating.toFixed(1)}
                              {p.reviewCount ? ` (${p.reviewCount > 999 ? `${Math.round(p.reviewCount / 100) / 10}k` : p.reviewCount})` : ''}
                            </Text>
                          </View>
                        )}
                      </View>

                      {mode === 'visited' && (
                        <View
                          style={{
                            position: 'absolute', top: 8, left: 8,
                            width: 24, height: 24, borderRadius: 12,
                            backgroundColor: (p.tripId && tripColorById.get(p.tripId)) || accentColor,
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
                          }}
                        >
                          <Text style={{ ...TextStyles.xs, color: '#fff', fontWeight: '700' }}>{i + 1}</Text>
                        </View>
                      )}

                      <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesome name="map-marker" size={14} color={selected ? '#ef4444' : 'rgba(255,255,255,0.35)'} />
                      </View>
                    </View>
                  </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

      </View>

      {/* Tap-to-detail — full-width inline card, no chrome above. The drag
          handle is absolutely positioned ON the card itself (top-center)
          so the slide-up appears as just the magazine card sliding over
          the map, with no dark band on the sides or above. */}
      {selectedIdx != null && placeItems.length > 0 && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: Dimensions.get('window').width * 1.25,
          }}
        >
          <CardStackCarousel
            places={placeItems}
            initialIndex={selectedIdx}
            favorites={favoriteIds}
            onToggleFav={() => {}}
            onIndexChange={(i) => setSelectedIdx(i)}
            onClose={() => setSelectedIdx(null)}
            cardWidth={Dimensions.get('window').width}
            disableMap
            hideArrows
            hideCounter
          />
          {/* Drag bar centered ON the card, just below the top edge */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: 8, left: 0, right: 0,
              alignItems: 'center', zIndex: 60,
            }}
          >
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          </View>
        </View>
      )}
    </Modal>
  );
}

// Passport-style stamp tile. Defaults to the country's flag as the
// background (via flagcdn.com); falls back to the customizable card color
// when the country isn't in the flag map. Accent + text colors still
// follow the user's customization for ring/border + text.
function PassportStamp({
  group, accentColor, innerColor, textColor = '#ffffff', onPress, innerBorderStyle = 'dashed', outerBorderStyle = 'solid',
}: {
  group: CountryGroup;
  accentColor: string;
  innerColor?: string;
  textColor?: string;
  onPress: () => void;
  innerBorderStyle?: 'solid' | 'dashed';
  outerBorderStyle?: 'solid' | 'dashed';
}) {
  const innerRingColor = innerColor || accentColor;
  const flagUrl = flagUrlForCountry(group.country);
  const yearLabel = group.firstYear === group.lastYear
    ? String(group.firstYear)
    : `${group.firstYear}–${String(group.lastYear).slice(2)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
    >
      {/* Outer SOLID accent ring on navy fill. Inner ring is dashed —
          opposite of the previous order for a more passport-document feel. */}
      <View
        style={{
          padding: 10, borderRadius: 12,
          borderWidth: 2, borderStyle: outerBorderStyle, borderColor: accentColor,
          backgroundColor: Navy.DEFAULT,
          overflow: 'hidden',
        }}
      >
        {/* Trip photo fills the stamp at full visibility — no flat scrim.
            Per-text dark plates (added below) handle readability without
            muddying the image. */}
        {group.imageUrl && (
          <Image
            source={{ uri: group.imageUrl, headers: { Referer: '' } }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        )}

        {/* Inner ring — independently colored from the outer ring; user-
            chosen border style (dashed/solid). Image bleeds through. */}
        <View
          style={{
            borderWidth: 1.5, borderStyle: innerBorderStyle, borderColor: innerRingColor, borderRadius: 8,
            height: 200,
            overflow: 'hidden',
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          {/* Centre-band gradient — darker through the middle so the
              centred title + meta read clearly without a full-stamp scrim. */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            pointerEvents="none"
          />

          {/* Flag chip — top-left of the inner ring, small + neat */}
          {flagUrl && (
            <View
              style={{
                position: 'absolute', top: 8, left: 8,
                width: 24, height: 16, borderRadius: 2, overflow: 'hidden',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
              }}
            >
              <Image source={{ uri: flagUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          )}

          {/* Country + year + trips — vertically centred in the inner ring
              so the title sits in the middle of the card, not the bottom. */}
          <View style={{ alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: 12 }}>
            <Text
              style={{
                ...TextStyles.title,
                color: textColor, textTransform: 'uppercase',
                alignSelf: 'stretch', textAlign: 'center', letterSpacing: 1,
                textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
              }}
              numberOfLines={2}
            >
              {group.country}
            </Text>
            <Text
              style={{
                ...TextStyles.xs, color: textColor, opacity: 0.9,
                alignSelf: 'stretch', marginTop: 4, letterSpacing: 1.2, textAlign: 'center',
                textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {yearLabel} · {group.count} {group.count === 1 ? 'trip' : 'trips'}
              {group.cities.length > 0 ? ` · ${group.cities.slice(0, 2).join(', ')}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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
  // The hydration effect below syncs drafts to saved values whenever the
  // user isn't actively editing, so once AsyncStorage finishes loading
  // (and `localPrefs` updates) the drafts pick up the saved colors —
  // no extra `prefsLoaded` flag needed.
  const [localPrefs, setLocalPrefs] = useState<Record<string, any>>({});
  // Reload local prefs whenever the signed-in user changes. Without this,
  // a new sign-in would inherit the previous account's local cache, and
  // since localPrefs takes priority over server `profile.preferences` in
  // the merge below, the new user would see the previous user's avatar
  // and customizations until they edit their own.
  useEffect(() => {
    setLocalPrefs({});
    AsyncStorage.getItem(prefsKeyFor(user?.id))
      .then((val) => {
        if (val) try { setLocalPrefs(JSON.parse(val)); } catch {}
      })
      .catch(() => {});
  }, [user?.id]);
  const [favSort, setFavSort] = useState<'recent' | 'name' | 'category'>('recent');

  const removeFavorite = useCallback((placeId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.filter((id) => id !== placeId);
      AsyncStorage.setItem(favoritesKeyFor(user?.id), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [user?.id]);

  // Geolocation — fired on mount so the cache key matches the
  // /(tabs)/favorites screen and we share its already-loaded data.
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    import('expo-location').then(async (Location) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {}
    }).catch(() => {});
  }, []);

  // Identical useInfiniteQuery to the /(tabs)/favorites screen — same key,
  // same params, no enabled gate — so the React Query cache is fully
  // shared. Filter the loaded pages by saved IDs in render.
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
  });

  // Pull from every cached places-related query (discover + nearby +
  // search) so a favorite stored from any of those screens is found.
  // Re-runs whenever our own infinite query updates, which is also the
  // most likely time the cache was just refreshed.
  const discoveredPlaces = useMemo<PlaceItem[]>(() => {
    const all: PlaceItem[] = [];
    // Our own discover infinite query.
    if (discoverData?.pages) {
      for (const page of discoverData.pages) all.push(...page.items);
    }
    // Any other cached places query — discover (other lat keys), search,
    // nearby — covers favorites added from /(tabs)/favorites's search bar.
    const cached = queryClient.getQueriesData<any>({
      predicate: (q) => {
        const k = q.queryKey?.[0];
        return typeof k === 'string' && (
          k === 'mobile-places-discover' ||
          k === 'mobile-places-nearby' ||
          k === 'mobile-places-search'
        );
      },
    });
    for (const [, value] of cached) {
      if (!value) continue;
      // Infinite query — { pages: [...] }
      if (Array.isArray(value?.pages)) {
        for (const page of value.pages) {
          if (Array.isArray(page?.items)) all.push(...page.items);
        }
      } else if (Array.isArray(value)) {
        all.push(...value);
      }
    }
    return dedupPlaces(all);
  }, [discoverData, queryClient]);

  // Auto-load more pages until we've matched all favorites or hit the cap.
  useEffect(() => {
    if (favoriteIds.length === 0) return;
    if (!hasDiscoverNext || isFetchingDiscoverNext) return;
    const matched = discoveredPlaces.filter((p) => favoriteIds.includes(p.id)).length;
    if (matched >= favoriteIds.length) return;
    if (discoveredPlaces.length >= 200) return;
    const t = setTimeout(() => fetchDiscoverNext(), 400);
    return () => clearTimeout(t);
  }, [favoriteIds, discoveredPlaces, hasDiscoverNext, isFetchingDiscoverNext, fetchDiscoverNext]);

  const favoritedPlaces = useMemo<PlaceItem[]>(() => {
    if (favoriteIds.length === 0 || discoveredPlaces.length === 0) return [];
    const set = new Set(favoriteIds);
    const matched = discoveredPlaces.filter((p) => set.has(p.id));
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
  // commit when the user taps Save. Five customisable color targets a la
  // Myspace: Accent (tabs, CTAs), Text (display name + quote), Avatar
  // ring, Outer (solid passport stamp ring), Inner (dashed/solid passport
  // stamp ring inside the outer one).
  type ColorTarget = 'accent' | 'text' | 'ring' | 'outer' | 'inner';
  const [editing, setEditing] = useState(false);
  const [draftQuote, setDraftQuote] = useState('');
  const [draftAccent, setDraftAccent] = useState<string>(Navy.DEFAULT);
  const [draftText, setDraftText] = useState<string>('#ffffff');
  const [draftRing, setDraftRing] = useState<string>('#ffffff');
  const [draftOuter, setDraftOuter] = useState<string>(Navy.DEFAULT);
  const [draftInner, setDraftInner] = useState<string>(Navy.DEFAULT);
  // RN's borderStyle 'dotted' renders almost identically to 'dashed' on
  // iOS (both look like dashes), so we only expose the two visually
  // distinct options. Outer + inner each have their own line style now.
  const [draftOuterStyle, setDraftOuterStyle] = useState<'solid' | 'dashed'>('solid');
  const [draftCardStyle, setDraftCardStyle] = useState<'solid' | 'dashed'>('dashed');
  // Recent colors — persisted across sessions. Updated whenever any color
  // tab gets a new value (via swatch / wheel / hex input). Capped so the
  // popup stays compact.
  const [recentColors, setRecentColors] = useState<string[]>([]);
  useEffect(() => {
    setRecentColors([]);
    AsyncStorage.getItem(recentColorsKeyFor(user?.id))
      .then((val) => {
        if (val) try {
          const arr = JSON.parse(val);
          if (Array.isArray(arr)) setRecentColors(arr.filter((c) => typeof c === 'string').slice(0, 12));
        } catch {}
      })
      .catch(() => {});
  }, [user?.id]);
  const pushRecent = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    setRecentColors((prev) => {
      const lower = hex.toLowerCase();
      const filtered = prev.filter((c) => c.toLowerCase() !== lower);
      const next = [hex, ...filtered].slice(0, 12);
      AsyncStorage.setItem(recentColorsKeyFor(user?.id), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [user?.id]);
  const [hexInput, setHexInput] = useState<string>('');
  // pickerOpen + pickerTarget split: open controls the popup, target the
  // active tab inside it. Switching tabs no longer closes the popup.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<ColorTarget>('accent');
  const [openCountry, setOpenCountry] = useState<CountryGroup | null>(null);

  // Auto-persist any color change to disk immediately. Drafts still
  // drive the visible preview while editing, but the underlying
  // `localPrefs` (which is the source of truth used by the rendered
  // accent/text/ring/etc.) is also updated and written to AsyncStorage,
  // so a force-quit, navigation, or re-open never loses the change.
  const persistPrefChange = useCallback((key: string, value: any) => {
    setLocalPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(prefsKeyFor(user?.id), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [user?.id]);
  const targetToPrefKey: Record<ColorTarget, string> = useMemo(() => ({
    accent: 'accent_color',
    text: 'text_color',
    ring: 'ring_color',
    outer: 'card_outer_color',
    inner: 'card_inner_color',
  }), []);

  const applyColor = useCallback((hex: string) => {
    if (pickerTarget === 'text') setDraftText(hex);
    else if (pickerTarget === 'ring') setDraftRing(hex);
    else if (pickerTarget === 'outer') setDraftOuter(hex);
    else if (pickerTarget === 'inner') setDraftInner(hex);
    else setDraftAccent(hex);
    setHexInput(hex);
    pushRecent(hex);
    persistPrefChange(targetToPrefKey[pickerTarget], hex);
  }, [pickerTarget, pushRecent, persistPrefChange, targetToPrefKey]);

  // Wheel-specific path: update the draft on every tick without pushing
  // to recents (otherwise a single drag would flood the recents row with
  // every intermediate color). Recents commits once on drag release.
  const wheelHexRef = useRef<string | null>(null);
  const handleWheelChange = useCallback((hex: string) => {
    wheelHexRef.current = hex;
    if (pickerTarget === 'text') setDraftText(hex);
    else if (pickerTarget === 'ring') setDraftRing(hex);
    else if (pickerTarget === 'outer') setDraftOuter(hex);
    else if (pickerTarget === 'inner') setDraftInner(hex);
    else setDraftAccent(hex);
    setHexInput(hex);
  }, [pickerTarget]);
  const handleWheelDragChange = useCallback((dragging: boolean) => {
    setWheelDragging(dragging);
    if (!dragging && wheelHexRef.current) {
      const finalHex = wheelHexRef.current;
      pushRecent(finalHex);
      // Persist on release (not on every drag tick) so disk writes
      // don't fire 60×/sec but the final color is guaranteed saved.
      persistPrefChange(targetToPrefKey[pickerTarget], finalHex);
      wheelHexRef.current = null;
    }
  }, [pushRecent, persistPrefChange, pickerTarget, targetToPrefKey]);
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
    pendingAvatar ?? prefs.avatar_url ?? profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? undefined;
  // While editing, preview the draft swatches live so the user can see
  // each color's effect across the profile. Fall back to saved values
  // when not editing.
  const savedAccent: string = prefs.accent_color || Navy.DEFAULT;
  const savedText: string = prefs.text_color || '#ffffff';
  const savedRing: string = prefs.ring_color || '#ffffff';
  const savedOuter: string = prefs.card_outer_color || prefs.card_color || prefs.accent_color || Navy.DEFAULT;
  const savedInner: string = prefs.card_inner_color || prefs.card_color || prefs.accent_color || Navy.DEFAULT;
  const savedCardStyle: 'solid' | 'dashed' = prefs.card_border_style === 'solid' ? 'solid' : 'dashed';
  const savedOuterStyle: 'solid' | 'dashed' = prefs.card_outer_border_style === 'dashed' ? 'dashed' : 'solid';
  const accentColor: string = editing ? draftAccent : savedAccent;
  const rawTextColor: string = editing ? draftText : savedText;
  const rawRingColor: string = editing ? draftRing : savedRing;
  const outerColor: string = editing ? draftOuter : savedOuter;
  const innerColor: string = editing ? draftInner : savedInner;
  const cardBorderStyle: 'solid' | 'dashed' = editing ? draftCardStyle : savedCardStyle;
  const outerBorderStyle: 'solid' | 'dashed' = editing ? draftOuterStyle : savedOuterStyle;
  // Contrast guard for the header text only — text on the accent band
  // would be unreadable if it matched the band color. The avatar ring
  // intentionally uses `rawRingColor` directly so the picked color
  // always shows, even when low-contrast.
  const textColor: string = readable(rawTextColor, accentColor);

  // Keep drafts in sync with saved values whenever we're NOT actively
  // editing. This way:
  //   • Entering edit mode never has stale drafts to clobber the saved
  //     values on Save.
  //   • A late AsyncStorage hydration mid-launch updates the drafts
  //     before the user can hit Edit, not after.
  //   • In-progress edits aren't overwritten when react-query refetches
  //     `profile.preferences` (drafts only update while editing=false).
  useEffect(() => {
    if (editing) return;
    setDraftQuote(customQuote ?? '');
    setDraftAccent(savedAccent);
    setDraftText(savedText);
    setDraftRing(savedRing);
    setDraftOuter(savedOuter);
    setDraftInner(savedInner);
    setDraftCardStyle(savedCardStyle);
    setDraftOuterStyle(savedOuterStyle);
    setHexInput(savedAccent);
  }, [editing, customQuote, savedAccent, savedText, savedRing, savedOuter, savedInner, savedCardStyle, savedOuterStyle]);

  const applyHex = useCallback(() => {
    const trimmed = hexInput.trim();
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      applyColor(hex);
    }
  }, [hexInput, applyColor]);

  // Load favorites for the signed-in user. Re-runs on user.id change so
  // a sign-out → sign-in switches lists rather than carrying the previous
  // user's saves over.
  useEffect(() => {
    setFavoriteIds([]);
    AsyncStorage.getItem(favoritesKeyFor(user?.id))
      .then((val) => {
        if (val) {
          try {
            const ids = JSON.parse(val);
            if (Array.isArray(ids)) setFavoriteIds(ids);
          } catch {}
        }
      })
      .catch(() => {});
  }, [user?.id]);

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
    // Count across every source the country modal also walks so the
    // "Places" stat matches what the user can actually see in their
    // passport drilldown:
    //   - trip_context.itinerary[].slots[].poi.name
    //   - trip_context.explore_items[].name|title
    //   - trip_context.foursquare_venues[].name|title
    // Previously only itinerary slots counted, so trips with mostly
    // explore_items + venue saves looked under-counted.
    for (const t of trips) {
      const country = (t.destination || '').split(',').slice(-1)[0]?.trim();
      if (country) countries.add(country);
      const ctx = (t.trip_context as any) ?? {};
      const itinerary = (ctx.itinerary ?? []) as any[];
      for (const day of itinerary) {
        for (const slot of day?.slots ?? []) {
          const name = slot?.poi?.name ?? slot?.title;
          if (name) places.add(String(name).trim().toLowerCase());
        }
      }
      for (const it of (ctx.explore_items ?? [])) {
        const name = it?.name ?? it?.title;
        if (name) places.add(String(name).trim().toLowerCase());
      }
      for (const v of (ctx.foursquare_venues ?? [])) {
        const name = v?.name ?? v?.title;
        if (name) places.add(String(name).trim().toLowerCase());
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
    setUploadingAvatar(true);
    const uri = await pickAndUploadImage('avatar', user?.id);
    setUploadingAvatar(false);
    if (uri) setPendingAvatar(uri);
  }, [user?.id]);

  const handlePickCover = useCallback(async () => {
    setUploadingCover(true);
    const uri = await pickAndUploadImage('cover', user?.id);
    setUploadingCover(false);
    if (uri) setPendingCover(uri);
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    // Visual prefs (accent, quote, cover, avatar) get saved to two layers:
    //   1. AsyncStorage — instant local fallback, works offline + anon
    //   2. Supabase profiles.preferences — so the same look loads on web
    // The Supabase write is best-effort: we don't block save UX on it.
    //
    // Re-read AsyncStorage at save time so we always merge against the
    // CURRENT disk state, not whatever stale `localPrefs` is in this
    // closure. Fixes the "edits erase each time" bug where Save fired
    // before the initial AsyncStorage hydration finished and overwrote
    // the disk-saved values with default drafts.
    let currentLocal: Record<string, any> = localPrefs;
    try {
      const stored = await AsyncStorage.getItem(prefsKeyFor(user?.id));
      if (stored) currentLocal = { ...(JSON.parse(stored) || {}), ...localPrefs };
    } catch {}
    const nextLocalPrefs: Record<string, any> = {
      ...currentLocal,
      ...(pendingCover ? { cover_url: pendingCover } : {}),
      ...(pendingAvatar ? { avatar_url: pendingAvatar } : {}),
      ...(draftAccent ? { accent_color: draftAccent } : {}),
      ...(draftText ? { text_color: draftText } : {}),
      ...(draftRing ? { ring_color: draftRing } : {}),
      ...(draftOuter ? { card_outer_color: draftOuter } : {}),
      ...(draftInner ? { card_inner_color: draftInner } : {}),
      ...(draftCardStyle ? { card_border_style: draftCardStyle } : {}),
      ...(draftOuterStyle ? { card_outer_border_style: draftOuterStyle } : {}),
      // Only write the quote when there's something to save. Previously
      // an empty draft explicitly nulled `custom_quote`, which clobbered
      // the saved quote whenever the user opened edit mode before
      // localPrefs hydrated (drafts default to '' until the sync effect
      // runs). Empty draft now means "leave alone"; clearing requires a
      // dedicated action.
      ...(draftQuote.trim() ? { custom_quote: draftQuote.trim() } : {}),
    };
    try {
      await AsyncStorage.setItem(prefsKeyFor(user?.id), JSON.stringify(nextLocalPrefs));
      setLocalPrefs(nextLocalPrefs);
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Save failed', e?.message ?? 'Could not save preferences locally.');
      return;
    }
    // Sync to Supabase profiles.preferences for cross-device + web parity.
    // Skipped silently for anon users (no user.id) and on network errors —
    // local copy already saved, so the user sees their changes either way.
    if (user?.id) {
      try {
        const merged = { ...((profile?.preferences ?? {}) as Record<string, any>), ...nextLocalPrefs };
        await updateProfile(user.id, { preferences: merged });
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      } catch {}
    }
    setSaving(false);
    setEditing(false);
    setPendingAvatar(null);
    setPendingCover(null);
  }, [localPrefs, pendingAvatar, pendingCover, draftAccent, draftText, draftRing, draftOuter, draftInner, draftCardStyle, draftQuote, user?.id, profile?.preferences, queryClient]);

  // Snapshot of localPrefs at the moment the user entered edit mode.
  // Auto-save writes color changes to disk live, so Cancel needs to
  // restore the snapshot (otherwise "Cancel" would have no effect).
  const editSnapshotRef = useRef<Record<string, any> | null>(null);
  useEffect(() => {
    if (editing && editSnapshotRef.current === null) {
      editSnapshotRef.current = { ...localPrefs };
    } else if (!editing) {
      editSnapshotRef.current = null;
    }
  }, [editing, localPrefs]);

  const handleCancel = useCallback(() => {
    // Restore localPrefs (and disk) to the pre-edit snapshot so any
    // auto-saved color changes are reverted.
    if (editSnapshotRef.current) {
      const snapshot = editSnapshotRef.current;
      setLocalPrefs(snapshot);
      AsyncStorage.setItem(prefsKeyFor(user?.id), JSON.stringify(snapshot)).catch(() => {});
    }
    setEditing(false);
    setPendingAvatar(null);
    setPendingCover(null);
    setDraftQuote(customQuote ?? '');
    setDraftAccent(savedAccent);
    setDraftText(savedText);
    setDraftRing(savedRing);
    setDraftOuter(savedOuter);
    setDraftInner(savedInner);
    setDraftCardStyle(savedCardStyle);
    setDraftOuterStyle(savedOuterStyle);
  }, [customQuote, savedAccent, savedText, savedRing, savedOuter, savedInner, savedCardStyle, savedOuterStyle]);

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
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* ─── Top header — Edit | username | Settings, flush on one row.
          Replaces the system Stack header for an Instagram-style top bar. */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 14,
          backgroundColor: colors.surface,
          borderBottomWidth: 1, borderBottomColor: colors.borderLight,
        }}
      >
        {/* Left — Edit / Cancel */}
        {editing ? (
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text style={{ ...TextStyles.bodyEm, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setEditing(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <FontAwesome name="pencil" size={13} color={colors.text} />
            <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Edit</Text>
          </Pressable>
        )}

        {/* Center — username */}
        <Text style={{ ...TextStyles.title, color: colors.text }} numberOfLines={1}>{displayName}</Text>

        {/* Right — Save (in edit mode) / Settings */}
        {editing ? (
          <Pressable onPress={handleSave} disabled={saving} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {saving && <ActivityIndicator color={accentColor} size="small" />}
            <Text style={{ ...TextStyles.bodyEm, color: accentColor, fontWeight: '700' }}>Save</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/profile/settings')} hitSlop={8}>
            <FontAwesome name="cog" size={20} color={colors.text} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!wheelDragging}
        keyboardShouldPersistTaps="handled"
      >
      {/* ─── Identity block — sits flush at the top (no cover band). An
          optional cover photo renders behind the row when set; otherwise
          the band is solid accent. Instagram-style row: avatar + stats
          inline, with the quote below. */}
      <View style={{ backgroundColor: accentColor, position: 'relative' }}>
        {coverUrl && (
          <Image
            source={{ uri: coverUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        )}
        {/* Top + bottom scrim for text legibility on bright cover photos.
            The TOP scrim makes the edit-toolbar / username band readable;
            the BOTTOM scrim does the same for the avatar/stats/quote.
            The middle band stays crisp so the photo still reads as the
            photo. */}
        {coverUrl && (
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.28, 0.6, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            pointerEvents="none"
          />
        )}
        {/* Edit-mode toolbar — own row at the top of the gold band so it
            never overlaps the stats. Theme button on the LEFT, header
            upload on the RIGHT (icon-only — the camera-on-photo metaphor
            already conveys what it does). */}
        {editing && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10 }}>
            <Pressable
              onPress={() => {
                setPickerOpen(true);
                setPickerTarget('accent');
                setHexInput(draftAccent);
              }}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome name="paint-brush" size={13} color="#fff" />
            </Pressable>
            <Pressable
              onPress={handlePickCover}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {uploadingCover ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <FontAwesome name="image" size={13} color="#fff" />
              )}
            </Pressable>
          </View>
        )}
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 }}>

        {/* Row 1 — avatar (left) + 4-col stats (right), exactly like
            Instagram's profile header. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={editing ? handlePickAvatar : undefined}>
            <View
              style={{
                width: 74, height: 74, borderRadius: 37,
                backgroundColor: rawRingColor,
                borderWidth: 3, borderColor: rawRingColor,
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 70, height: 70, borderRadius: 35 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ ...TextStyles.title, color: '#fff' }}>{initials}</Text>
                </View>
              )}
            </View>
            {(editing || !avatarUrl) && (
              <View
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: editing ? '#fff' : colors.info,
                  borderWidth: 2, borderColor: accentColor,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator color={accentColor} size="small" />
                ) : (
                  <FontAwesome name="camera" size={10} color={editing ? accentColor : '#fff'} />
                )}
              </View>
            )}
          </Pressable>

          {/* Stats — equal-width 4-col, evenly spaced across the row */}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { value: compactNum(stats.countries), label: 'Countries' },
              { value: compactNum(stats.places), label: 'Places' },
              { value: compactNum(stats.favorites), label: 'Favorites' },
              { value: compactNum(stats.trips), label: 'Trips' },
            ].map((stat) => (
              <View key={stat.label} style={{ alignItems: 'center', minWidth: 50 }}>
                <Text style={{ ...TextStyles.subhead, color: textColor, textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }}>{stat.value}</Text>
                <Text style={{ ...TextStyles.xs, color: textColor, opacity: 0.95, letterSpacing: 0.5, marginTop: 1, textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }} numberOfLines={1}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Row 2 — quote. While editing, render as a flat single-line
            input (no plate) so it feels like just italic text on the
            band. A thin underline reads as the affordance instead. */}
        {editing ? (
          <View style={{ width: '100%', marginTop: 14, borderBottomWidth: 1, borderBottomColor: onAccent(accentColor, 0.35) }}>
            <TextInput
              value={draftQuote}
              onChangeText={setDraftQuote}
              placeholder="Write your travel quote…"
              placeholderTextColor={onAccent(accentColor, 0.55)}
              maxLength={140}
              style={{
                ...TextStyles.caption, color: textColor, fontStyle: 'italic',
                textAlign: 'center',
                paddingHorizontal: 0, paddingVertical: 6,
              }}
            />
          </View>
        ) : displayedQuote ? (
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Text
              style={{
                ...TextStyles.caption, color: textColor, opacity: 0.95, fontStyle: 'italic', flexShrink: 1,
                textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              "{displayedQuote.content}"
            </Text>
            <Text
              style={{
                ...TextStyles.caption, color: textColor, opacity: 0.75,
                textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
              }}
              numberOfLines={1}
            >
              — {displayedQuote.author}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 14, height: 36, justifyContent: 'center' }}>
            <ActivityIndicator color="rgba(255,255,255,0.3)" size="small" />
          </View>
        )}


        </View>
        {/* Accent ribbon — thin bar at the bottom of the band that always
            uses the live accent color, so the user can see their accent
            choice even when a cover photo hides the band background. */}
        <View style={{ height: 4, backgroundColor: accentColor }} />
      </View>

      {/* Tab bar — Passport (countries collected) + Favorites (saved places) */}
      <View style={{ backgroundColor: colors.cardBackground, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable
          onPress={() => setProfileTab('passport')}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: profileTab === 'passport' ? accentColor : 'transparent' }}
        >
          <Text style={profileTab === 'passport' ? { ...TextStyles.bodyEm, color: accentColor } : { ...TextStyles.body, color: colors.textTertiary }}>
            Passport
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setProfileTab('favorites')}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: profileTab === 'favorites' ? accentColor : 'transparent' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="heart" size={10} color={profileTab === 'favorites' ? accentColor : colors.textTertiary} />
            <Text style={profileTab === 'favorites' ? { ...TextStyles.bodyEm, color: accentColor } : { ...TextStyles.body, color: colors.textTertiary }}>
              Favorites
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
                    accentColor={outerColor}
                    innerColor={innerColor}
                    textColor={rawTextColor}
                    innerBorderStyle={cardBorderStyle}
                    outerBorderStyle={outerBorderStyle}
                    onPress={() => setOpenCountry(group)}
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
              {/* Tiny progress hint while pages still loading — non-blocking. */}
              {favoritedPlaces.length < favoriteIds.length && (discoverLoading || isFetchingDiscoverNext) && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <ActivityIndicator color={colors.textSecondary} size="small" />
                </View>
              )}
            </View>
          )
        )}
      </View>
      </ScrollView>

      {/* Tap-a-stamp → trip-map for that country */}
      <PassportCountryModal
        group={openCountry}
        trips={trips}
        accentColor={accentColor}
        favoriteIds={favoriteIds}
        favoritePool={discoveredPlaces}
        onClose={() => setOpenCountry(null)}
      />

      {/* Theme picker — pops from the bottom and uses the page's accent
          as the sheet background so it feels native instead of a floating
          dialog. Tabs across the top let the user switch targets without
          dismissing. */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setPickerOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: accentColor,
              borderTopLeftRadius: 22, borderTopRightRadius: 22,
              paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28,
              shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.25, shadowRadius: 14,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingBottom: 10 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: onAccent(accentColor, 0.35) }} />
            </View>

            {/* Target tabs — Accent / Text / Avatar / Outer / Inner. Each
                tab activates a separate draft so the user can pick a
                different color for the outer solid ring vs the inner
                dashed/solid ring of the passport stamp. */}
            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {([
                { key: 'accent' as const, label: 'Accent', value: draftAccent },
                { key: 'text' as const, label: 'Text', value: draftText },
                { key: 'ring' as const, label: 'Avatar', value: draftRing },
                { key: 'outer' as const, label: 'Outer', value: draftOuter },
                { key: 'inner' as const, label: 'Inner', value: draftInner },
              ]).map((t) => {
                const active = pickerTarget === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => {
                      setPickerTarget(t.key);
                      setHexInput(t.value);
                    }}
                    style={{
                      flex: 1, alignItems: 'center', gap: 4,
                      paddingVertical: 8, borderRadius: 8,
                      backgroundColor: active ? 'rgba(0,0,0,0.35)' : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 16, height: 16, borderRadius: 8,
                        backgroundColor: t.value,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                      }}
                    />
                    <Text style={{ ...TextStyles.xs, color: onAccent(accentColor, active ? 1 : 0.7), letterSpacing: 0.5, fontWeight: active ? '700' : '500' }}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Preset row */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              {ACCENT_PALETTE.map((color) => {
                const current =
                  pickerTarget === 'text' ? draftText :
                  pickerTarget === 'ring' ? draftRing :
                  pickerTarget === 'outer' ? draftOuter :
                  pickerTarget === 'inner' ? draftInner :
                  draftAccent;
                const selected = current === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => applyColor(color)}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: selected ? 2.5 : 1.5,
                      borderColor: selected ? '#fff' : onAccent(accentColor, 0.35),
                    }}
                  >
                    {selected && <FontAwesome name="check" size={12} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>

            {/* Wheel */}
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              <ColorWheel
                size={150}
                value={
                  pickerTarget === 'text' ? draftText :
                  pickerTarget === 'ring' ? draftRing :
                  pickerTarget === 'outer' ? draftOuter :
                  pickerTarget === 'inner' ? draftInner :
                  draftAccent
                }
                onChange={handleWheelChange}
                onDragChange={handleWheelDragChange}
              />
            </View>

            {/* Brightness row — the HSL wheel is locked at l=0.5 so it can
                only produce mid-tones. This row gives quick access to the
                pure-luminance values (black, dark, mid, light, white) that
                the wheel can't reach. */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
              {['#000000', '#444444', '#888888', '#cccccc', '#ffffff'].map((color) => {
                const current =
                  pickerTarget === 'text' ? draftText :
                  pickerTarget === 'ring' ? draftRing :
                  pickerTarget === 'outer' ? draftOuter :
                  pickerTarget === 'inner' ? draftInner :
                  draftAccent;
                const selected = current.toLowerCase() === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => applyColor(color)}
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: selected ? 2.5 : 1,
                      borderColor: selected ? '#fff' : onAccent(accentColor, 0.35),
                    }}
                  >
                    {selected && <FontAwesome name="check" size={11} color={color === '#ffffff' || color === '#cccccc' ? '#000' : '#fff'} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Inner ring border style — only visible on the Inner tab.
                Pick whether the dashed/solid line is dashed or solid.
                (Dotted dropped — RN renders it identical to dashed on
                iOS, so it was duplicated visually.) */}
            {(pickerTarget === 'inner' || pickerTarget === 'outer') && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ ...TextStyles.caption, color: onAccent(accentColor, 0.7), marginBottom: 6, letterSpacing: 0.5 }}>
                  Stamp border
                </Text>
                <Pressable
                  onPress={() => {
                    if (pickerTarget === 'outer') {
                      setDraftOuterStyle((s) => {
                        const next = s === 'solid' ? 'dashed' : 'solid';
                        persistPrefChange('card_outer_border_style', next);
                        return next;
                      });
                    } else {
                      setDraftCardStyle((s) => {
                        const next = s === 'solid' ? 'dashed' : 'solid';
                        persistPrefChange('card_border_style', next);
                        return next;
                      });
                    }
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 10,
                    paddingHorizontal: 14, paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      width: 60, height: 0,
                      borderTopWidth: 2,
                      borderTopColor: pickerTarget === 'outer' ? draftOuter : draftInner,
                      borderStyle: pickerTarget === 'outer' ? draftOuterStyle : draftCardStyle,
                    }}
                  />
                  <Text style={{ ...TextStyles.xs, color: onAccent(accentColor, 0.95), textTransform: 'capitalize', fontWeight: '700' }}>
                    {pickerTarget === 'outer' ? draftOuterStyle : draftCardStyle}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Recents — shows the colors the user has picked previously
                (any tab) so they don't have to re-find them on the wheel
                or re-type the hex each time. Persisted across sessions. */}
            {recentColors.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ ...TextStyles.caption, color: onAccent(accentColor, 0.7), marginBottom: 6, letterSpacing: 0.5 }}>
                  Recent
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {recentColors.map((color) => {
                    const current =
                      pickerTarget === 'text' ? draftText :
                      pickerTarget === 'ring' ? draftRing :
                      pickerTarget === 'outer' ? draftOuter :
                      pickerTarget === 'inner' ? draftInner :
                      draftAccent;
                    const selected = current.toLowerCase() === color.toLowerCase();
                    return (
                      <Pressable
                        key={color}
                        onPress={() => applyColor(color)}
                        style={{
                          width: 28, height: 28, borderRadius: 14,
                          backgroundColor: color,
                          borderWidth: selected ? 2.5 : 1,
                          borderColor: selected ? '#fff' : onAccent(accentColor, 0.35),
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {selected && <FontAwesome name="check" size={11} color={luma(color) > 160 ? '#000' : '#fff'} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Hex input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : 'rgba(255,255,255,0.15)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                }}
              />
              <TextInput
                value={hexInput}
                onChangeText={(text) => {
                  setHexInput(text);
                  const trimmed = text.trim();
                  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
                  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                    applyColor(hex);
                  }
                }}
                onSubmitEditing={applyHex}
                placeholder="#3498db"
                placeholderTextColor={onAccent(accentColor, 0.45)}
                autoCapitalize="none"
                maxLength={7}
                returnKeyType="done"
                style={{
                  flex: 1,
                  borderWidth: 1, borderColor: onAccent(accentColor, 0.35), borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 10,
                  ...TextStyles.body, color: onAccent(accentColor, 1), fontFamily: 'monospace',
                  backgroundColor: 'rgba(0,0,0,0.18)',
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

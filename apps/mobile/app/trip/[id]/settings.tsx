import { useState, useContext, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, Switch, Alert, TextInput, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, TextStyles, FontSize, deleteTrip, useSettingsStore, getWebApiBase } from '@travyl/shared';
import { PageTransition, TabCtx } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ThemePicker } from '../../../components/trip/ThemePicker';

const SETTINGS_COLOR = '#6b7280';

interface SettingToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  defaultValue: boolean;
}

const NOTIFICATION_SETTINGS: SettingToggle[] = [
  { key: 'flightAlerts', label: 'Flight Alerts', description: 'Gate changes, delays, and boarding', icon: 'plane', defaultValue: true },
  { key: 'hotelReminders', label: 'Hotel Reminders', description: 'Check-in/out reminders', icon: 'building', defaultValue: true },
  { key: 'activityReminders', label: 'Activity Reminders', description: '30 min before each activity', icon: 'bell', defaultValue: true },
  { key: 'budgetAlerts', label: 'Budget Alerts', description: 'When spending exceeds threshold', icon: 'pie-chart', defaultValue: false },
  { key: 'weatherUpdates', label: 'Weather Updates', description: 'Daily forecast for destination', icon: 'cloud', defaultValue: true },
];

const SHARING_SETTINGS: SettingToggle[] = [
  { key: 'shareItinerary', label: 'Share Itinerary', description: 'Allow collaborators to view your itinerary', icon: 'calendar', defaultValue: true },
  { key: 'shareLocation', label: 'Share Location', description: 'Show your location to trip members', icon: 'map-marker', defaultValue: false },
  { key: 'sharePhotos', label: 'Auto-Share Photos', description: 'Share trip photos with group', icon: 'camera', defaultValue: false },
];

// ─── Empty initial state — populated from real user data when available ──

const INITIAL_PROFILE = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  nationality: '',
};

const INITIAL_DOCUMENTS = {
  passportNumber: '',
  passportExpiry: '',
};

const INITIAL_EMERGENCY = {
  name: '',
  phone: '',
  relationship: '',
};

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

const INITIAL_CARDS: SavedCard[] = [];

// ─── Reusable components ──────────────────────────────────────

function SettingsSection({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ backgroundColor: color, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={icon} size={14} color="#fff" />
        <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{title}</Text>
      </View>
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

function ToggleRow({
  setting,
  value,
  onToggle,
  accentColor,
  isLast,
}: {
  setting: SettingToggle;
  value: boolean;
  onToggle: () => void;
  accentColor: string;
  isLast: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <FontAwesome name={setting.icon} size={12} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>{setting.label}</Text>
        <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>{setting.description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: accentColor + '60' }}
        thumbColor={value ? accentColor : colors.border}
        ios_backgroundColor="#e5e7eb"
      />
    </View>
  );
}

function SettingsInput({
  label,
  value,
  onChangeText,
  icon,
  keyboardType,
  placeholder,
  autoCapitalize,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <FontAwesome name={icon} size={11} color={colors.textSecondary} />
        <Text style={{ ...TextStyles.body, fontWeight: '500', color: colors.textSecondary }}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: FontSize.bodyLg,
          color: colors.text,
          backgroundColor: colors.surface,
        }}
      />
    </View>
  );
}

// ─── Preferred Airport row — searchable picker ─────────────────
//
// The IATA-only text input was unfriendly: users had to know that "SFO"
// stands for San Francisco. This row opens a modal that searches the
// /api/airports endpoint by city/airport name and writes back the IATA.

type AirportHit = { code: string; name: string; city: string };

function PreferredAirportRow() {
  const colors = useThemeColors();
  const preferredAirport = useSettingsStore((s) => s.preferredAirport);
  const setPreferredAirport = useSettingsStore((s) => s.setPreferredAirport);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AirportHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedHit, setSavedHit] = useState<AirportHit | null>(null);

  // Search /api/airports as user types (debounced).
  useEffect(() => {
    if (!open) return;
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const WEB_API = getWebApiBase();
    const timer = setTimeout(() => {
      fetch(`${WEB_API}/api/airports?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) => {
          const mapped = data
            .map((a) => ({
              code: a.iata || a.iata_code || a.code || '',
              name: a.name || '',
              city: a.city || a.city_name || '',
            }))
            .filter((a) => a.code);
          const seen = new Set<string>();
          const deduped = mapped.filter((a) =>
            seen.has(a.code) ? false : (seen.add(a.code), true),
          );
          setResults(deduped);
          setLoading(false);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSelect = (hit: AirportHit) => {
    setPreferredAirport(hit.code);
    setSavedHit(hit);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    setPreferredAirport('');
    setSavedHit(null);
  };

  // Display label: prefer the most recently selected hit (full city/name);
  // fall back to the bare IATA code we have on disk; finally an empty placeholder.
  const labelTop = preferredAirport || 'Tap to choose';
  const labelBottom =
    savedHit && savedHit.code === preferredAirport
      ? `${savedHit.city}${savedHit.name ? ` — ${savedHit.name}` : ''}`
      : preferredAirport
      ? 'Tap to change'
      : 'Search by city or airport name';

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <FontAwesome name="plane" size={11} color={colors.textSecondary} />
        <Text style={{ ...TextStyles.body, fontWeight: '500', color: colors.textSecondary }}>
          Preferred Airport
        </Text>
      </View>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 10,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            minWidth: 44,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: preferredAirport ? '#0ea5e9' : colors.borderLight,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              ...TextStyles.captionEm,
              fontWeight: '700',
              color: preferredAirport ? '#fff' : colors.textTertiary,
            }}
          >
            {preferredAirport || '— —'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...TextStyles.bodyLg, color: colors.text }} numberOfLines={1}>
            {labelTop}
          </Text>
          <Text style={{ ...TextStyles.xs, color: colors.textTertiary }} numberOfLines={1}>
            {labelBottom}
          </Text>
        </View>
        {preferredAirport ? (
          <Pressable hitSlop={8} onPress={handleClear}>
            <FontAwesome name="times-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        ) : (
          <FontAwesome name="search" size={13} color={colors.textTertiary} />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '70%',
              paddingBottom: 34,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ ...TextStyles.title, color: colors.text }}>Preferred Airport</Text>
              <Pressable onPress={() => setOpen(false)}>
                <FontAwesome name="times" size={18} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <TextInput
                placeholder="Search by city or airport (e.g. San Francisco, JFK)"
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                autoFocus
                style={{
                  ...TextStyles.body,
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.code}-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text
                      style={{ ...TextStyles.bodyLg, fontWeight: '700', color: '#0ea5e9', width: 44 }}
                    >
                      {item.code}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TextStyles.body, color: colors.text }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{item.city}</Text>
                    </View>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>
                    {loading
                      ? 'Searching...'
                      : query.trim().length < 2
                      ? 'Type at least 2 characters'
                      : 'No airports found'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function SettingsScreen() {
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { trip, isLoading } = useItineraryScreen(id);
  const { theme, setTripTheme, tabColorOverrides, setTabColor, resetTabColors, itineraryColorOverrides, setItineraryColor, resetItineraryColors } = useContext(TabCtx);
  const colors = useThemeColors();

  // Existing state
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.key, s.defaultValue]))
  );
  const [sharing, setSharing] = useState<Record<string, boolean>>(
    Object.fromEntries(SHARING_SETTINGS.map((s) => [s.key, s.defaultValue]))
  );
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState<'MM/DD' | 'DD/MM'>('MM/DD');

  // New state: profile, documents, emergency, cards
  const [profile, setProfile] = useState({ ...INITIAL_PROFILE });
  const [documents, setDocuments] = useState({ ...INITIAL_DOCUMENTS });
  const [emergency, setEmergency] = useState({ ...INITIAL_EMERGENCY });
  const [cards, setCards] = useState<SavedCard[]>(INITIAL_CARDS.map((c) => ({ ...c })));

  // New state: expanded preferences
  const [language, setLanguage] = useState('en');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [distanceUnit, setDistanceUnit] = useState('mi');
  const [temperatureUnit, setTemperatureUnit] = useState('F');

  // Dirty tracking
  const [dirty, setDirty] = useState(false);

  const toggleNotification = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const toggleSharing = (key: string) => {
    setSharing((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(id);
              queryClient.invalidateQueries({ queryKey: ['trips'] });
              router.replace('/(tabs)/trips');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Save / Discard handlers — persist preference state locally so the user
  // gets real feedback and the chosen units/currency stick across launches.
  // (Profile/documents/emergency/cards remain in-memory until a backend
  // endpoint exists; surfacing an alert is more honest than a silent no-op.)
  const handleSave = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(
        `travyl-trip-prefs-${id}`,
        JSON.stringify({ currency, dateFormat, language, timeFormat, distanceUnit, temperatureUnit, notifications }),
      );
      setDirty(false);
      Alert.alert('Saved', 'Your trip settings have been saved.');
    } catch (e) {
      Alert.alert('Save failed', 'Could not save settings. Please try again.');
    }
  };

  const handleDiscard = () => {
    setProfile({ ...INITIAL_PROFILE });
    setDocuments({ ...INITIAL_DOCUMENTS });
    setEmergency({ ...INITIAL_EMERGENCY });
    setCards(INITIAL_CARDS.map((c) => ({ ...c })));
    setCurrency('USD');
    setDateFormat('MM/DD');
    setLanguage('en');
    setTimeFormat('12h');
    setDistanceUnit('mi');
    setTemperatureUnit('F');
    setNotifications(Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.key, s.defaultValue])));
    setSharing(Object.fromEntries(SHARING_SETTINGS.map((s) => [s.key, s.defaultValue])));
    setDirty(false);
  };

  // Card helpers
  const handleSetDefaultCard = (cardId: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === cardId })));
    setDirty(true);
  };

  const handleRemoveCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setDirty(true);
  };

  const handleAddCard = () => {
    // Real card collection requires PCI-compliant tokenization (Stripe, etc.)
    // — never generate fake card numbers in the UI. Surface a coming-soon
    // notice instead of pretending the action worked.
    Alert.alert(
      'Coming soon',
      'Adding payment cards requires secure billing setup. We\'ll wire this up before launch.',
    );
  };

  if (isLoading) {
    return (
      <PageTransition>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: colors.borderLight, borderRadius: 12, height: 100, marginBottom: 12 }} />
        ))}
      </ScrollView>
      </PageTransition>
    );
  }

  const brandIcon = (brand: string): React.ComponentProps<typeof FontAwesome>['name'] => {
    switch (brand) {
      case 'Visa': return 'cc-visa';
      case 'Mastercard': return 'cc-mastercard';
      case 'Amex': return 'cc-amex';
      default: return 'credit-card';
    }
  };

  return (
    <PageTransition>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: dirty ? 80 : 32 }}>
        {/* Trip Settings header */}
        <View style={{ backgroundColor: SETTINGS_COLOR + '10', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: SETTINGS_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="cog" size={20} color={SETTINGS_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TextStyles.subhead, fontWeight: '700', color: theme.base }}>Trip Settings</Text>
            <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 2 }}>
              {trip?.destination ?? 'Trip'} preferences
            </Text>
          </View>
        </View>

        {/* Trip Theme */}
        <SettingsSection title="Trip Theme" icon="paint-brush" color={theme.base}>
          <ThemePicker
            currentTheme={theme.id}
            customColor={theme.id === 'custom' ? theme.base : null}
            onSelect={(themeId, customColor) => {
              setTripTheme(themeId, customColor);
              setDirty(true);
            }}
            tabColors={theme.tabColors}
            tabColorOverrides={tabColorOverrides}
            onTabColorChange={(tabName, color) => { setTabColor(tabName, color); setDirty(true); }}
            onResetTabColors={() => { resetTabColors(); setDirty(true); }}
            itineraryColors={theme.itineraryColors}
            itineraryColorOverrides={itineraryColorOverrides}
            onItineraryColorChange={(section, color) => { setItineraryColor(section, color); setDirty(true); }}
            onResetItineraryColors={() => { resetItineraryColors(); setDirty(true); }}
          />
        </SettingsSection>

        {/* Profile */}
        <SettingsSection title="Profile" icon="user" color={theme.base}>
          <SettingsInput label="First Name" value={profile.firstName} icon="user" onChangeText={(t) => { setProfile((p) => ({ ...p, firstName: t })); setDirty(true); }} />
          <SettingsInput label="Last Name" value={profile.lastName} icon="user" onChangeText={(t) => { setProfile((p) => ({ ...p, lastName: t })); setDirty(true); }} />
          <SettingsInput label="Email" value={profile.email} icon="envelope" keyboardType="email-address" onChangeText={(t) => { setProfile((p) => ({ ...p, email: t })); setDirty(true); }} />
          <SettingsInput label="Phone" value={profile.phone} icon="phone" keyboardType="phone-pad" onChangeText={(t) => { setProfile((p) => ({ ...p, phone: t })); setDirty(true); }} />
          <SettingsInput label="Date of Birth" value={profile.dob} icon="calendar" onChangeText={(t) => { setProfile((p) => ({ ...p, dob: t })); setDirty(true); }} />
          <SettingsInput label="Nationality" value={profile.nationality} icon="globe" onChangeText={(t) => { setProfile((p) => ({ ...p, nationality: t })); setDirty(true); }} />
        </SettingsSection>

        {/* Travel Preferences — global, shared across all trips */}
        <SettingsSection title="Travel Preferences" icon="cog" color="#0ea5e9">
          <PreferredAirportRow />
          <Text style={{ ...TextStyles.xs, color: colors.textTertiary, marginTop: -6, marginBottom: 6, paddingHorizontal: 14 }}>
            Auto-fills the departure airport on every flight search.
          </Text>
        </SettingsSection>

        {/* Travel Documents */}
        <SettingsSection title="Travel Documents" icon="file-text" color="#10b981">
          <SettingsInput label="Passport Number" value={documents.passportNumber} icon="id-card" onChangeText={(t) => { setDocuments((p) => ({ ...p, passportNumber: t })); setDirty(true); }} />
          <SettingsInput label="Passport Expiry" value={documents.passportExpiry} icon="calendar" onChangeText={(t) => { setDocuments((p) => ({ ...p, passportExpiry: t })); setDirty(true); }} />
        </SettingsSection>

        {/* Emergency Contact */}
        <SettingsSection title="Emergency Contact" icon="phone" color="#ef4444">
          <SettingsInput label="Contact Name" value={emergency.name} icon="user" onChangeText={(t) => { setEmergency((p) => ({ ...p, name: t })); setDirty(true); }} />
          <SettingsInput label="Phone" value={emergency.phone} icon="phone" keyboardType="phone-pad" onChangeText={(t) => { setEmergency((p) => ({ ...p, phone: t })); setDirty(true); }} />
          <SettingsInput label="Relationship" value={emergency.relationship} icon="heart" onChangeText={(t) => { setEmergency((p) => ({ ...p, relationship: t })); setDirty(true); }} />
        </SettingsSection>

        {/* Payment Methods */}
        <SettingsSection title="Payment Methods" icon="credit-card" color="#f59e0b">
          {cards.map((card) => (
            <View
              key={card.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              <FontAwesome name={brandIcon(card.brand)} size={20} color={card.isDefault ? theme.base : colors.textTertiary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>
                  {card.brand} ending in {card.last4}
                </Text>
                {card.isDefault && (
                  <Text style={{ ...TextStyles.caption, fontWeight: '500', color: theme.base, marginTop: 1 }}>Default</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {!card.isDefault && (
                  <Pressable
                    onPress={() => handleSetDefaultCard(card.id)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.textSecondary }}>Set Default</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleRemoveCard(card.id)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: colors.errorBg,
                  }}
                >
                  <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.error }}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            onPress={handleAddCard}
            style={{
              marginTop: 12,
              backgroundColor: theme.base,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FontAwesome name="plus" size={12} color="#fff" />
            <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Add New Card</Text>
          </Pressable>
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences" icon="sliders" color={theme.base}>
          {/* Currency */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.base + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="dollar" size={12} color={theme.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Currency</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>Display currency for budget</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['USD', 'EUR', 'GBP'] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { setCurrency(c); setDirty(true); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: currency === c ? theme.base : colors.borderLight,
                  }}
                >
                  <Text style={{ ...TextStyles.captionEm, color: currency === c ? '#fff' : colors.textSecondary }}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date Format */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.base + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="calendar-o" size={12} color={theme.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Date Format</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>How dates are displayed</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['MM/DD', 'DD/MM'] as const).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => { setDateFormat(f); setDirty(true); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: dateFormat === f ? theme.base : colors.borderLight,
                  }}
                >
                  <Text style={{ ...TextStyles.captionEm, color: dateFormat === f ? '#fff' : colors.textSecondary }}>{f}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Language */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.base + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="language" size={12} color={theme.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Language</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>App display language</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {([
                { key: 'en', label: 'English' },
                { key: 'fr', label: 'French' },
                { key: 'es', label: 'Spanish' },
                { key: 'de', label: 'German' },
              ] as const).map((l) => (
                <Pressable
                  key={l.key}
                  onPress={() => { setLanguage(l.key); setDirty(true); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: language === l.key ? theme.base : colors.borderLight,
                  }}
                >
                  <Text style={{ ...TextStyles.captionEm, color: language === l.key ? '#fff' : colors.textSecondary }}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Time Format */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.base + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="clock-o" size={12} color={theme.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Time Format</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>Clock display format</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['12h', '24h'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => { setTimeFormat(t); setDirty(true); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: timeFormat === t ? theme.base : colors.borderLight,
                  }}
                >
                  <Text style={{ ...TextStyles.captionEm, color: timeFormat === t ? '#fff' : colors.textSecondary }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Distance Unit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.base + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="road" size={12} color={theme.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Distance Unit</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>Measurement system</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['mi', 'km'] as const).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { setDistanceUnit(d); setDirty(true); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: distanceUnit === d ? theme.base : colors.borderLight,
                  }}
                >
                  <Text style={{ ...TextStyles.captionEm, color: distanceUnit === d ? '#fff' : colors.textSecondary }}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Temperature Unit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.base + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="thermometer" size={12} color={theme.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: colors.text }}>Temperature Unit</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 1 }}>Temperature display</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['F', 'C'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => { setTemperatureUnit(u); setDirty(true); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: temperatureUnit === u ? theme.base : colors.borderLight,
                  }}
                >
                  <Text style={{ ...TextStyles.captionEm, color: temperatureUnit === u ? '#fff' : colors.textSecondary }}>{u === 'F' ? '\u00B0F' : '\u00B0C'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications" icon="bell" color="#f59e0b">
          {NOTIFICATION_SETTINGS.map((setting, i) => (
            <ToggleRow
              key={setting.key}
              setting={setting}
              value={notifications[setting.key]!}
              onToggle={() => toggleNotification(setting.key)}
              accentColor="#f59e0b"
              isLast={i === NOTIFICATION_SETTINGS.length - 1}
            />
          ))}
        </SettingsSection>

        {/* Sharing */}
        <SettingsSection title="Sharing & Privacy" icon="lock" color="#8b5cf6">
          {SHARING_SETTINGS.map((setting, i) => (
            <ToggleRow
              key={setting.key}
              setting={setting}
              value={sharing[setting.key]!}
              onToggle={() => toggleSharing(setting.key)}
              accentColor="#8b5cf6"
              isLast={i === SHARING_SETTINGS.length - 1}
            />
          ))}
        </SettingsSection>

        {/* Collaborators placeholder */}
        <SettingsSection title="Collaborators" icon="users" color="#3b82f6">
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f615', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <FontAwesome name="user-plus" size={18} color="#3b82f6" />
            </View>
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 4 }}>Invite Travelers</Text>
            <Text style={{ ...TextStyles.body, color: colors.textTertiary, textAlign: 'center', marginBottom: 12 }}>
              Share this trip with friends and family to plan together.
            </Text>
            <Pressable
              onPress={async () => {
                const { Share } = await import('react-native');
                const tripUrl = `https://gotravyl.com/trip/${id}`;
                const dest = trip?.destination ? `to ${trip.destination}` : '';
                try {
                  await Share.share({
                    message: `Join me planning my trip ${dest} on Travyl: ${tripUrl}`,
                    url: tripUrl,
                  });
                } catch {}
              }}
              style={{ backgroundColor: colors.info, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <FontAwesome name="envelope" size={12} color="#fff" />
              <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Send Invite</Text>
            </Pressable>
          </View>
        </SettingsSection>

        {/* Danger zone */}
        <View style={{ backgroundColor: colors.errorBg, borderRadius: 12, borderWidth: 1, borderColor: colors.error, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FontAwesome name="exclamation-triangle" size={14} color="#ef4444" />
            <Text style={{ ...TextStyles.bodyXlEm, color: colors.error }}>Danger Zone</Text>
          </View>
          <Pressable
            onPress={handleDeleteTrip}
            style={{
              backgroundColor: colors.error,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <FontAwesome name="trash" size={14} color="#fff" />
            <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Delete Trip</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Save / Discard bar */}
      {dirty && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 12,
          }}
        >
          <Pressable
            onPress={handleDiscard}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FontAwesome name="times" size={14} color={colors.textSecondary} />
            <Text style={{ ...TextStyles.bodyXlEm, color: colors.textSecondary }}>Discard</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: theme.base,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FontAwesome name="check" size={14} color="#fff" />
            <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Save Changes</Text>
          </Pressable>
        </View>
      )}
    </View>
    </PageTransition>
  );
}

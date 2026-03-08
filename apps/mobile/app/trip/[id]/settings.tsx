import { useState } from 'react';
import { View, ScrollView, Text, Pressable, Switch, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, Navy } from '@travyl/shared';

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

// ─── Initial mock data ────────────────────────────────────────

const INITIAL_PROFILE = {
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex.rivera@email.com',
  phone: '+1 (555) 123-4567',
  dob: '1992-06-15',
  nationality: 'United States',
};

const INITIAL_DOCUMENTS = {
  passportNumber: 'X12345678',
  passportExpiry: '2029-03-20',
};

const INITIAL_EMERGENCY = {
  name: 'Jordan Rivera',
  phone: '+1 (555) 987-6543',
  relationship: 'Sibling',
};

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

const INITIAL_CARDS: SavedCard[] = [
  { id: '1', brand: 'Visa', last4: '4242', isDefault: true },
  { id: '2', brand: 'Mastercard', last4: '8888', isDefault: false },
  { id: '3', brand: 'Amex', last4: '1234', isDefault: false },
];

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
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ backgroundColor: color, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={icon} size={14} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{title}</Text>
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
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#f3f4f6',
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <FontAwesome name={setting.icon} size={12} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>{setting.label}</Text>
        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{setting.description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e5e7eb', true: accentColor + '60' }}
        thumbColor={value ? accentColor : '#f4f3f4'}
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
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <FontAwesome name={icon} size={11} color="#6b7280" />
        <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280' }}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 13,
          color: '#374151',
          backgroundColor: '#f9fafb',
        }}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trip, isLoading } = useItineraryScreen(id);

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
          onPress: () => {
            // TODO: Wire to API
            router.back();
          },
        },
      ]
    );
  };

  // Save / Discard handlers
  const handleSave = () => {
    // TODO: Wire to API
    setDirty(false);
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
    const newId = String(Date.now());
    setCards((prev) => [
      ...prev,
      { id: newId, brand: 'Visa', last4: String(Math.floor(1000 + Math.random() * 9000)), isDefault: false },
    ]);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: '#f3f4f6', borderRadius: 12, height: 100, marginBottom: 12 }} />
        ))}
      </ScrollView>
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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: dirty ? 80 : 32 }}>
        {/* Trip Settings header */}
        <View style={{ backgroundColor: SETTINGS_COLOR + '10', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: SETTINGS_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="cog" size={20} color={SETTINGS_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: Navy.DEFAULT }}>Trip Settings</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {trip?.destination ?? 'Trip'} preferences
            </Text>
          </View>
        </View>

        {/* Profile */}
        <SettingsSection title="Profile" icon="user" color={Navy.DEFAULT}>
          <SettingsInput label="First Name" value={profile.firstName} icon="user" onChangeText={(t) => { setProfile((p) => ({ ...p, firstName: t })); setDirty(true); }} />
          <SettingsInput label="Last Name" value={profile.lastName} icon="user" onChangeText={(t) => { setProfile((p) => ({ ...p, lastName: t })); setDirty(true); }} />
          <SettingsInput label="Email" value={profile.email} icon="envelope" keyboardType="email-address" onChangeText={(t) => { setProfile((p) => ({ ...p, email: t })); setDirty(true); }} />
          <SettingsInput label="Phone" value={profile.phone} icon="phone" keyboardType="phone-pad" onChangeText={(t) => { setProfile((p) => ({ ...p, phone: t })); setDirty(true); }} />
          <SettingsInput label="Date of Birth" value={profile.dob} icon="calendar" onChangeText={(t) => { setProfile((p) => ({ ...p, dob: t })); setDirty(true); }} />
          <SettingsInput label="Nationality" value={profile.nationality} icon="globe" onChangeText={(t) => { setProfile((p) => ({ ...p, nationality: t })); setDirty(true); }} />
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
                borderBottomColor: '#f3f4f6',
              }}
            >
              <FontAwesome name={brandIcon(card.brand)} size={20} color={card.isDefault ? Navy.DEFAULT : '#9ca3af'} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                  {card.brand} ending in {card.last4}
                </Text>
                {card.isDefault && (
                  <Text style={{ fontSize: 11, fontWeight: '500', color: Navy.DEFAULT, marginTop: 1 }}>Default</Text>
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
                      borderColor: '#d1d5db',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#6b7280' }}>Set Default</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleRemoveCard(card.id)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: '#fef2f2',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#ef4444' }}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            onPress={handleAddCard}
            style={{
              marginTop: 12,
              backgroundColor: Navy.DEFAULT,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FontAwesome name="plus" size={12} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add New Card</Text>
          </Pressable>
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences" icon="sliders" color={Navy.DEFAULT}>
          {/* Currency */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Navy.DEFAULT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="dollar" size={12} color={Navy.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Currency</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Display currency for budget</Text>
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
                    backgroundColor: currency === c ? Navy.DEFAULT : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: currency === c ? '#fff' : '#6b7280' }}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date Format */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Navy.DEFAULT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="calendar-o" size={12} color={Navy.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Date Format</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>How dates are displayed</Text>
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
                    backgroundColor: dateFormat === f ? Navy.DEFAULT : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dateFormat === f ? '#fff' : '#6b7280' }}>{f}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Language */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Navy.DEFAULT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="language" size={12} color={Navy.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Language</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>App display language</Text>
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
                    backgroundColor: language === l.key ? Navy.DEFAULT : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: language === l.key ? '#fff' : '#6b7280' }}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Time Format */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Navy.DEFAULT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="clock-o" size={12} color={Navy.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Time Format</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Clock display format</Text>
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
                    backgroundColor: timeFormat === t ? Navy.DEFAULT : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: timeFormat === t ? '#fff' : '#6b7280' }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Distance Unit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Navy.DEFAULT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="road" size={12} color={Navy.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Distance Unit</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Measurement system</Text>
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
                    backgroundColor: distanceUnit === d ? Navy.DEFAULT : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: distanceUnit === d ? '#fff' : '#6b7280' }}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Temperature Unit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Navy.DEFAULT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <FontAwesome name="thermometer" size={12} color={Navy.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Temperature Unit</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Temperature display</Text>
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
                    backgroundColor: temperatureUnit === u ? Navy.DEFAULT : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: temperatureUnit === u ? '#fff' : '#6b7280' }}>{u === 'F' ? '\u00B0F' : '\u00B0C'}</Text>
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
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Invite Travelers</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 12 }}>
              Share this trip with friends and family to plan together.
            </Text>
            <Pressable style={{ backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FontAwesome name="envelope" size={12} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Send Invite</Text>
            </Pressable>
          </View>
        </SettingsSection>

        {/* Danger zone */}
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FontAwesome name="exclamation-triangle" size={14} color="#ef4444" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Danger Zone</Text>
          </View>
          <Pressable
            onPress={handleDeleteTrip}
            style={{
              backgroundColor: '#ef4444',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <FontAwesome name="trash" size={14} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Delete Trip</Text>
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
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
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
              borderColor: '#d1d5db',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FontAwesome name="times" size={14} color="#6b7280" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Discard</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: Navy.DEFAULT,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FontAwesome name="check" size={14} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Save Changes</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

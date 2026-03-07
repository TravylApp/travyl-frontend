import { useState } from 'react';
import { View, ScrollView, Text, Pressable, Switch, Alert } from 'react-native';
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

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trip, isLoading } = useItineraryScreen(id);

  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.key, s.defaultValue]))
  );
  const [sharing, setSharing] = useState<Record<string, boolean>>(
    Object.fromEntries(SHARING_SETTINGS.map((s) => [s.key, s.defaultValue]))
  );
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState<'MM/DD' | 'DD/MM'>('MM/DD');

  const toggleNotification = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSharing = (key: string) => {
    setSharing((prev) => ({ ...prev, [key]: !prev[key] }));
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

  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: '#f3f4f6', borderRadius: 12, height: 100, marginBottom: 12 }} />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
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
                onPress={() => setCurrency(c)}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
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
                onPress={() => setDateFormat(f)}
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
  );
}

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthStore, useSettingsStore, Navy, CURRENCIES } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

const TERMS_URL = 'https://travyl.app/terms';
const PRIVACY_URL = 'https://travyl.app/privacy';

function SectionHeader({ title }: { title: string }) {
  const colors = useThemeColors();
  return (
    <Text className="text-xs font-semibold uppercase tracking-wider px-4 pt-6 pb-2" style={{ color: colors.textSecondary }}>
      {title}
    </Text>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between h-14 px-4 active:opacity-80"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <Text className="text-base" style={{ color: danger ? '#dc2626' : colors.text }}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        {value && (
          <Text className="text-sm" style={{ color: colors.textSecondary }}>{value}</Text>
        )}
        {onPress && <FontAwesome name="chevron-right" size={12} color={colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

function SettingsToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center justify-between h-14 px-4" style={{ backgroundColor: colors.cardBackground }}>
      <Text className="text-base" style={{ color: colors.text }}>{label}</Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: Navy.DEFAULT }}
        thumbColor="#fff"
      />
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <Pressable className="flex-1" onPress={onClose} />
      <View className="mx-4 mb-8 rounded-2xl overflow-hidden" style={{ backgroundColor: colors.cardBackground }}>
        <View className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <Text className="text-base font-semibold text-center" style={{ color: colors.text }}>{title}</Text>
        </View>
        <ScrollView className="max-h-80">
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
              className="flex-row items-center justify-between px-4 h-12 border-b active:opacity-60"
              style={{ borderColor: colors.border }}
            >
              <Text style={{ color: colors.text }}>{opt.label}</Text>
              {selected === opt.value && <FontAwesome name="check" size={16} color={Navy.DEFAULT} />}
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          onPress={onClose}
          className="px-4 h-12 items-center justify-center border-t active:opacity-60"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text className="text-base font-medium" style={{ color: Navy.DEFAULT }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const currency = useSettingsStore((s) => s.currency);
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const travelStyle = useSettingsStore((s) => s.travelStyle);
  const pushNotifications = useSettingsStore((s) => s.pushNotifications);
  const emailNotifications = useSettingsStore((s) => s.emailNotifications);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const setDistanceUnits = useSettingsStore((s) => s.setDistanceUnits);
  const setTravelStyle = useSettingsStore((s) => s.setTravelStyle);
  const togglePush = useSettingsStore((s) => s.togglePushNotifications);
  const toggleEmail = useSettingsStore((s) => s.toggleEmailNotifications);

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showUnitsPicker, setShowUnitsPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);

  const email = user?.email ?? 'Not signed in';

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call delete account API when available
              Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOpenUrl = async (url: string, label: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', `Cannot open ${label}`);
    }
  };

  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} — ${c.name}`,
  }));

  const unitOptions = [
    { value: 'miles', label: 'Miles (mi)' },
    { value: 'kilometers', label: 'Kilometers (km)' },
  ];

  const styleOptions = [
    { value: 'balanced', label: 'Balanced — Mix of everything' },
    { value: 'budget', label: 'Budget — Save money, spend less' },
    { value: 'luxury', label: 'Luxury — Premium experiences' },
    { value: 'adventure', label: 'Adventure — Thrills and exploration' },
    { value: 'relaxed', label: 'Relaxed — Take it easy' },
  ];

  const formatStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView className="flex-1">
        {/* Account */}
        <SectionHeader title="Account" />
        <View className="border-t border-b" style={{ borderColor: colors.border }}>
          <SettingsRow label="Email" value={email} />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsRow
            label="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'Password change will be available in a future update.')}
          />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsRow label="Delete Account" danger onPress={handleDeleteAccount} />
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View className="border-t border-b" style={{ borderColor: colors.border }}>
          <SettingsRow
            label="Currency"
            value={currency}
            onPress={() => setShowCurrencyPicker(true)}
          />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsRow
            label="Distance Units"
            value={distanceUnits === 'miles' ? 'Miles' : 'Kilometers'}
            onPress={() => setShowUnitsPicker(true)}
          />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsRow
            label="Default Travel Style"
            value={formatStyleLabel(travelStyle)}
            onPress={() => setShowStylePicker(true)}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View className="border-t border-b" style={{ borderColor: colors.border }}>
          <SettingsToggle
            label="Push Notifications"
            enabled={pushNotifications}
            onToggle={togglePush}
          />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsToggle
            label="Email Notifications"
            enabled={emailNotifications}
            onToggle={toggleEmail}
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View className="border-t border-b" style={{ borderColor: colors.border }}>
          <SettingsRow label="Version" value="1.0.0" />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsRow
            label="Terms of Service"
            onPress={() => handleOpenUrl(TERMS_URL, 'Terms of Service')}
          />
          <View className="h-px ml-4" style={{ backgroundColor: colors.border }} />
          <SettingsRow
            label="Privacy Policy"
            onPress={() => handleOpenUrl(PRIVACY_URL, 'Privacy Policy')}
          />
        </View>

        {/* Sign Out */}
        <View className="px-4 py-8">
          <Pressable
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ]);
            }}
            className="h-12 rounded-xl items-center justify-center active:opacity-80"
            style={{ backgroundColor: colors.errorBackground ?? '#fef2f2' }}
          >
            <Text className="text-base font-medium" style={{ color: colors.error ?? '#dc2626' }}>Sign Out</Text>
          </Pressable>
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Pickers */}
      <PickerModal
        visible={showCurrencyPicker}
        title="Select Currency"
        options={currencyOptions}
        selected={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />
      <PickerModal
        visible={showUnitsPicker}
        title="Distance Units"
        options={unitOptions}
        selected={distanceUnits}
        onSelect={(v) => setDistanceUnits(v as 'miles' | 'kilometers')}
        onClose={() => setShowUnitsPicker(false)}
      />
      <PickerModal
        visible={showStylePicker}
        title="Travel Style"
        options={styleOptions}
        selected={travelStyle}
        onSelect={(v) => setTravelStyle(v as typeof travelStyle)}
        onClose={() => setShowStylePicker(false)}
      />
    </View>
  );
}

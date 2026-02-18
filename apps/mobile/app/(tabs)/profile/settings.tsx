import { View, Text, Pressable, ScrollView, Switch } from 'react-native';

// TODO: Read/write preferences from Zustand store + Supabase user metadata

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 pt-6 pb-2">
      {title}
    </Text>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between h-14 px-4 bg-white dark:bg-black active:opacity-80"
    >
      <Text className="text-base text-gray-900 dark:text-white">{label}</Text>
      {value && <Text className="text-sm text-gray-400">{value}</Text>}
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
  return (
    <View className="flex-row items-center justify-between h-14 px-4 bg-white dark:bg-black">
      <Text className="text-base text-gray-900 dark:text-white">{label}</Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: '#003594' }}
        // TODO: Wire up toggle handler
      />
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-100 dark:bg-gray-950">
      {/* Account */}
      <SectionHeader title="Account" />
      <View className="border-t border-b border-gray-200 dark:border-gray-800">
        {/* TODO: Navigate to email change screen */}
        <SettingsRow label="Email" value="jane@example.com" onPress={() => {}} />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        {/* TODO: Navigate to password change screen */}
        <SettingsRow label="Change Password" onPress={() => {}} />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        {/* TODO: Confirm + call Supabase delete user */}
        <Pressable
          onPress={() => {}}
          className="h-14 px-4 justify-center bg-white dark:bg-black active:opacity-80"
        >
          <Text className="text-base text-red-600 dark:text-red-400">Delete Account</Text>
        </Pressable>
      </View>

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      <View className="border-t border-b border-gray-200 dark:border-gray-800">
        {/* TODO: Open currency picker */}
        <SettingsRow label="Currency" value="USD" onPress={() => {}} />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        {/* TODO: Open distance unit picker */}
        <SettingsRow label="Distance Units" value="Miles" onPress={() => {}} />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        {/* TODO: Open travel style picker */}
        <SettingsRow label="Default Travel Style" value="Balanced" onPress={() => {}} />
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View className="border-t border-b border-gray-200 dark:border-gray-800">
        <SettingsToggle label="Push Notifications" enabled={true} onToggle={() => {}} />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        <SettingsToggle label="Email Notifications" enabled={false} onToggle={() => {}} />
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View className="border-t border-b border-gray-200 dark:border-gray-800">
        <SettingsRow label="Version" value="1.0.0" />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        {/* TODO: Open terms URL in browser */}
        <SettingsRow label="Terms of Service" onPress={() => {}} />
        <View className="h-px bg-gray-200 dark:bg-gray-800 ml-4" />
        {/* TODO: Open privacy URL in browser */}
        <SettingsRow label="Privacy Policy" onPress={() => {}} />
      </View>

      <View className="h-12" />
    </ScrollView>
  );
}

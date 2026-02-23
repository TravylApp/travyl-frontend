import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useProfile, useTrips, useSavedItems } from '@travyl/shared';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile } = useProfile();
  const { data: trips } = useTrips();
  const { data: savedItems } = useSavedItems();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-sm text-gray-500">Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black px-8">
        <View className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-800 items-center justify-center mb-6">
          <Text className="text-3xl text-gray-400 dark:text-gray-600">?</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Sign in to view your profile
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
          Create an account to save trips, track favorites, and sync across devices.
        </Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="h-12 w-full rounded-xl bg-[#003594] items-center justify-center active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      <View className="items-center pt-8 pb-6 px-8">
        {/* Avatar */}
        <View className="h-24 w-24 rounded-full bg-[#003594] items-center justify-center mb-4">
          <Text className="text-3xl font-bold text-white">{initials}</Text>
        </View>

        {/* Name & Email */}
        <Text className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</Text>

        {/* Stats Row */}
        <View className="flex-row mt-6 gap-8">
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {trips?.length ?? 0}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Trips</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {savedItems?.length ?? 0}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Favorites</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="px-6 gap-2">
        {/* Settings */}
        <Pressable
          onPress={() => router.push('/profile/settings')}
          className="flex-row items-center justify-between h-14 px-4 rounded-xl bg-gray-50 dark:bg-gray-900 active:opacity-80"
        >
          <Text className="text-base text-gray-900 dark:text-white">Settings</Text>
          <Text className="text-gray-400">&rsaquo;</Text>
        </Pressable>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          className="flex-row items-center justify-center h-14 px-4 rounded-xl bg-red-50 dark:bg-red-950 active:opacity-80 mt-4"
        >
          <Text className="text-base font-medium text-red-600 dark:text-red-400">Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

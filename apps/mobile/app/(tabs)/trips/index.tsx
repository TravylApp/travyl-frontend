import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useTrips } from '@travyl/shared';

export default function TripsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const { data: trips, isLoading } = useTrips();

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
        <Text className="text-4xl mb-4">✈️</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Sign in to see your trips
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
          Create an account to plan trips and access them anywhere.
        </Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="h-12 w-full rounded-xl bg-[#003594] items-center justify-center active:opacity-80 mb-3"
        >
          <Text className="text-base font-semibold text-white">Sign In</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/signup')}
          className="h-12 w-full rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center active:opacity-80"
        >
          <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
            Create Account
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-sm text-gray-500">Loading trips…</Text>
      </View>
    );
  }

  if (!trips?.length) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-4xl mb-4">🗺️</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">My Trips</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">No trips yet. Start planning!</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-3"
            onPress={() => router.push(`/trip/${item.id}`)}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.destination}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

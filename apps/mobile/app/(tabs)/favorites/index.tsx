import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useSavedItems } from '@travyl/shared';

export default function FavoritesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const { data: savedItems, isLoading } = useSavedItems();

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
        <Text className="text-4xl mb-4">❤️</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Sign in to see your favorites
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
          Save places you love across trips.
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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-sm text-gray-500">Loading favorites…</Text>
      </View>
    );
  }

  if (!savedItems?.length) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">Favorites</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">Save places you love across trips</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <FlatList
        data={savedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-900 dark:text-white">{item.item_type}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.item_id}</Text>
          </View>
        )}
      />
    </View>
  );
}

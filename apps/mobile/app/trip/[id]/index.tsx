import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function OverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">Overview</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400">Trip: {id}</Text>
    </View>
  );
}

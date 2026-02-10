import { View, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">Profile</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400">Sign in to manage your account</Text>
    </View>
  );
}

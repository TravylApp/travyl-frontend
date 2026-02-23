import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black px-6">
      <Text className="text-3xl font-bold text-[#003594] mb-2">Travyl</Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mb-8 text-center">
        Your AI-powered travel assistant
      </Text>
      <Pressable
        className="bg-[#003594] rounded-xl px-6 py-3 active:opacity-80"
        onPress={() => router.push('/trip/demo')}
      >
        <Text className="text-white font-semibold text-base">View Demo Trip</Text>
      </Pressable>
    </View>
  );
}

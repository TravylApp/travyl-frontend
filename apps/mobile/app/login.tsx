import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@travyl/shared';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = () => {
    router.replace('/signup');
  };

  // TODO: Implement Google OAuth via Supabase
  const handleGoogleSignIn = () => {};

  // TODO: Implement Apple Sign-In via Supabase
  const handleAppleSignIn = () => {};

  const handleContinueAsGuest = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 justify-center px-8">
        {/* Logo & Title */}
        <View className="items-center mb-12">
          <View className="h-20 w-20 rounded-2xl bg-[#003594] items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-white">T</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">Travyl</Text>
          <Text className="text-base text-gray-500 dark:text-gray-400 mt-1">
            Your AI travel companion
          </Text>
        </View>

        {/* Email Input */}
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</Text>
        <TextInput
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 text-gray-900 dark:text-white mb-4"
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        {/* Password Input */}
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</Text>
        <TextInput
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 text-gray-900 dark:text-white mb-6"
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Sign In Button */}
        <Pressable
          onPress={handleSignIn}
          disabled={submitting}
          className="h-12 rounded-xl bg-[#003594] items-center justify-center mb-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? 'Signing In…' : 'Sign In'}
          </Text>
        </Pressable>

        {/* Sign Up Link */}
        <Pressable onPress={handleSignUp} className="items-center mb-8">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Text className="text-[#003594] dark:text-[#FFC72C] font-semibold">Sign Up</Text>
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <Text className="mx-4 text-sm text-gray-400">or</Text>
          <View className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </View>

        {/* Social Login Buttons */}
        <Pressable
          onPress={handleGoogleSignIn}
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center mb-3 active:opacity-80"
        >
          <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
            Continue with Google
          </Text>
        </Pressable>

        <Pressable
          onPress={handleAppleSignIn}
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center mb-6 active:opacity-80"
        >
          <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
            Continue with Apple
          </Text>
        </Pressable>

        {/* Continue as Guest */}
        <Pressable onPress={handleContinueAsGuest} className="items-center">
          <Text className="text-sm text-gray-400 underline">Continue as Guest</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

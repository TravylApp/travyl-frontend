import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@travyl/shared';

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signUp(email, password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // TODO: Implement Google OAuth via Supabase
  const handleGoogleSignUp = () => {};

  // TODO: Implement Apple Sign-In via Supabase
  const handleAppleSignUp = () => {};

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 justify-center px-8">
        {/* Logo & Title */}
        <View className="items-center mb-12">
          <View className="h-20 w-20 rounded-2xl bg-[#003594] items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-white">T</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">Create Account</Text>
          <Text className="text-base text-gray-500 dark:text-gray-400 mt-1">
            Start planning your next adventure
          </Text>
        </View>

        {/* Full Name Input */}
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</Text>
        <TextInput
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 text-gray-900 dark:text-white mb-4"
          placeholder="Jane Doe"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          autoComplete="name"
          value={name}
          onChangeText={setName}
        />

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
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 text-gray-900 dark:text-white mb-2"
          placeholder="Create a password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Text className="text-xs text-gray-400 mb-6">Must be at least 8 characters</Text>

        {/* Sign Up Button */}
        <Pressable
          onPress={handleSignUp}
          disabled={submitting}
          className="h-12 rounded-xl bg-[#003594] items-center justify-center mb-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? 'Creating Account…' : 'Create Account'}
          </Text>
        </Pressable>

        {/* Sign In Link */}
        <Pressable onPress={() => router.replace('/login')} className="items-center mb-8">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Text className="text-[#003594] dark:text-[#FFC72C] font-semibold">Sign In</Text>
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <Text className="mx-4 text-sm text-gray-400">or</Text>
          <View className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </View>

        {/* Social Sign-Up Buttons */}
        <Pressable
          onPress={handleGoogleSignUp}
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center mb-3 active:opacity-80"
        >
          <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
            Continue with Google
          </Text>
        </Pressable>

        <Pressable
          onPress={handleAppleSignUp}
          className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center active:opacity-80"
        >
          <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
            Continue with Apple
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

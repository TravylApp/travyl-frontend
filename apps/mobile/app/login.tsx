import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Linking from 'expo-linking';
import { useAuthStore, supabase, Navy, TextStyles, FontSize, FontFamily } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

function SocialButton({ label, iconName, iconColor, onPress }: {
  label: string; iconName: string; iconColor?: string; onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight,
        backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 8,
      }}
    >
      <FontAwesome name={iconName as any} size={16} color={iconColor ?? Navy.DEFAULT} />
      <Text style={{ ...TextStyles.bodyLg, color: Navy.DEFAULT }}>{label}</Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password, name || undefined);
      } else {
        await signIn(email, password);
      }
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? (isSignUp ? 'Sign up failed.' : 'Sign in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const redirectTo = Linking.createURL('login-callback');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) Alert.alert('Sign in failed', error.message);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }} keyboardShouldPersistTaps="handled">

          {/* Branding */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ ...TextStyles.headline, fontFamily: FontFamily.sansBlack, fontWeight: '900', color: Navy.DEFAULT, letterSpacing: 2 }}>TRAVYL</Text>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(30,58,95,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name="send" size={14} color={Navy.DEFAULT} />
              </View>
            </View>
          </View>

          {/* Heading */}
          <Text style={{ ...TextStyles.title, fontFamily: FontFamily.sansBlack, fontWeight: '900', color: Navy.DEFAULT, marginBottom: 4 }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={{ ...TextStyles.bodyLg, color: 'rgba(30,58,95,0.5)', marginBottom: 20 }}>
            {isSignUp ? 'Start planning your dream trips today.' : 'Sign in to continue your journey.'}
          </Text>

          {/* Error */}
          {error ? (
            <View style={{ backgroundColor: colors.errorBg, padding: 10, borderRadius: 10, marginBottom: 12 }}>
              <Text style={{ ...TextStyles.body, color: colors.error }}>{error}</Text>
            </View>
          ) : null}

          {/* Social login */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <View style={{ flex: 1 }}><SocialButton label="Google" iconName="google" iconColor="#EA4335" onPress={handleGoogleSignIn} /></View>
            <View style={{ flex: 1 }}><SocialButton label="Apple" iconName="apple" iconColor="#000" onPress={() => {}} /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            <View style={{ flex: 1 }}><SocialButton label="Facebook" iconName="facebook" iconColor="#1877F2" onPress={() => {}} /></View>
            <View style={{ flex: 1 }}><SocialButton label="Microsoft" iconName="windows" iconColor="#00a4ef" onPress={() => {}} /></View>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.borderLight }} />
            <Text style={{ ...TextStyles.sm, color: 'rgba(30,58,95,0.3)', letterSpacing: 1 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.borderLight }} />
          </View>

          {/* Name (sign up only) */}
          {isSignUp && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 }}>
                <FontAwesome name="user" size={14} color="rgba(30,58,95,0.3)" />
                <TextInput
                  placeholder="Full name"
                  placeholderTextColor="rgba(30,58,95,0.3)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  style={{ flex: 1, height: 48, paddingHorizontal: 10, fontSize: FontSize.bodyLg, color: Navy.DEFAULT }}
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 }}>
              <FontAwesome name="envelope" size={14} color="rgba(30,58,95,0.3)" />
              <TextInput
                placeholder="Email address"
                placeholderTextColor="rgba(30,58,95,0.3)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{ flex: 1, height: 48, paddingHorizontal: 10, fontSize: FontSize.bodyLg, color: Navy.DEFAULT }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 }}>
              <FontAwesome name="lock" size={14} color="rgba(30,58,95,0.3)" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="rgba(30,58,95,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={{ flex: 1, height: 48, paddingHorizontal: 10, fontSize: FontSize.bodyLg, color: Navy.DEFAULT }}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={14} color="rgba(30,58,95,0.3)" />
              </Pressable>
            </View>
          </View>

          {!isSignUp && (
            <Pressable style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
              <Text style={{ ...TextStyles.caption, color: 'rgba(30,58,95,0.5)' }}>Forgot password?</Text>
            </Pressable>
          )}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              height: 48, borderRadius: 12, backgroundColor: Navy.DEFAULT,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              opacity: submitting ? 0.5 : 1,
              shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
            }}
          >
            <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>
              {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
            <FontAwesome name="send" size={12} color="#fff" />
          </Pressable>

          {/* Toggle */}
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ ...TextStyles.bodyLg, color: 'rgba(30,58,95,0.4)' }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text onPress={() => setIsSignUp(!isSignUp)} style={{ color: Navy.DEFAULT, fontWeight: '600' }}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </Text>
          </View>

          {/* Continue as Guest */}
          <Pressable onPress={() => router.replace('/')} style={{ alignItems: 'center', marginTop: 12 }}>
            <Text style={{ ...TextStyles.caption, color: 'rgba(30,58,95,0.3)', textDecorationLine: 'underline' }}>Continue as Guest</Text>
          </Pressable>

          {/* Terms */}
          <Text style={{ ...TextStyles.xs, textAlign: 'center', marginTop: 16, color: 'rgba(30,58,95,0.25)' }}>
            By continuing, you agree to Travyl's Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

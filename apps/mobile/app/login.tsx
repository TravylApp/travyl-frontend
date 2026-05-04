import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Linking from 'expo-linking';
import { useAuthStore, supabase, Navy, TextStyles, FontFamily } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

// OAuth providers available on this build. Update when adding/removing
// providers in Supabase Dashboard → Authentication → Providers.
const OAUTH_PROVIDERS = [
  { label: 'Google', iconName: 'google', iconColor: '#EA4335', provider: 'google' as const },
  { label: 'Apple', iconName: 'apple', iconColor: '#000', provider: 'apple' as const },
  { label: 'Facebook', iconName: 'facebook', iconColor: '#1877F2', provider: 'facebook' as const },
  { label: 'Microsoft', iconName: 'windows', iconColor: '#00a4ef', provider: 'azure' as const },
];

function SocialButton({ label, iconName, iconColor, loading, onPress }: {
  label: string; iconName: string; iconColor?: string; loading?: boolean; onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={{
        height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight,
        backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 8,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.tint} />
      ) : (
        <FontAwesome name={iconName as any} size={16} color={iconColor ?? colors.text} />
      )}
      <Text style={{ ...TextStyles.bodyLg, color: colors.text }}>{label}</Text>
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
  const [resetEmailSent, setResetEmailSent] = useState(false);

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

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter your email', 'Type your email address in the field above, then tap Forgot password.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const [oauthLoading, setOAuthLoading] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: typeof OAUTH_PROVIDERS[number]['provider']) => {
    setOAuthLoading(provider);
    setError('');
    try {
      const redirectTo = Linking.createURL('login-callback');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (data?.url) {
        // Open the OAuth URL in the system browser
        const WebBrowser = await import('expo-web-browser');
        await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      }
    } catch (err: any) {
      const msg = err.message?.includes('not configured') || err.message?.includes('not enabled')
        ? `${provider} sign-in is not available yet. Try email instead.`
        : err.message || 'Sign in failed';
      setError(msg);
    }
    setOAuthLoading(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }} keyboardShouldPersistTaps="handled">

          {/* Branding */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: 3 }}>TRAVYL</Text>
              <FontAwesome name="send" size={20} color={colors.tint} />
            </View>
          </View>

          {/* Heading */}
          <Text style={{ ...TextStyles.title, fontFamily: FontFamily.sansBlack, fontWeight: '900', color: colors.text, marginBottom: 4 }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, marginBottom: 20 }}>
            {isSignUp ? 'Start planning your dream trips today.' : 'Sign in to continue your journey.'}
          </Text>

          {/* Error */}
          {error ? (
            <View style={{ backgroundColor: colors.errorBg, padding: 10, borderRadius: 10, marginBottom: 12 }}>
              <Text style={{ ...TextStyles.body, color: colors.error }}>{error}</Text>
            </View>
          ) : null}

          {/* Social login */}
          <View style={{ gap: 8, marginBottom: 20 }}>
            {Array.from({ length: Math.ceil(OAUTH_PROVIDERS.length / 2) }, (_, rowIdx) => {
              const rowProviders = OAUTH_PROVIDERS.slice(rowIdx * 2, rowIdx * 2 + 2);
              return (
                <View key={rowIdx} style={{ flexDirection: 'row', gap: 8 }}>
                  {rowProviders.map((p) => (
                    <View key={p.label} style={{ flex: 1 }}>
                      <SocialButton
                        label={p.label}
                        iconName={p.iconName}
                        iconColor={p.iconColor}
                        loading={oauthLoading === p.provider}
                        onPress={() => handleOAuthSignIn(p.provider)}
                      />
                    </View>
                  ))}
                </View>
              );
            })}
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.borderLight }} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, letterSpacing: 1 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.borderLight }} />
          </View>

          {/* Name (sign up only) */}
          {isSignUp && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 }}>
                <FontAwesome name="user" size={14} color={colors.textTertiary} />
                <TextInput
                  placeholder="Full name"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  style={{ flex: 1, height: 48, paddingHorizontal: 10, ...TextStyles.bodyLg, color: colors.text }}
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 }}>
              <FontAwesome name="envelope" size={14} color={colors.textTertiary} />
              <TextInput
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{ flex: 1, height: 48, paddingHorizontal: 10, ...TextStyles.bodyLg, color: colors.text }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 }}>
              <FontAwesome name="lock" size={14} color={colors.textTertiary} />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={{ flex: 1, height: 48, paddingHorizontal: 10, ...TextStyles.bodyLg, color: colors.text }}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {!isSignUp && (
            <Pressable
              onPress={handleForgotPassword}
              disabled={submitting}
              style={{ alignSelf: 'flex-end', marginBottom: 16 }}
            >
              <Text style={{ ...TextStyles.caption, color: resetEmailSent ? colors.success : colors.textSecondary }}>
                {resetEmailSent ? 'Check your email for a reset link.' : 'Forgot password?'}
              </Text>
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
            <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text onPress={() => setIsSignUp(!isSignUp)} style={{ color: colors.tint, fontWeight: '600' }}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </Text>
          </View>

          {/* Continue as Guest */}
          <Pressable onPress={() => router.replace('/')} style={{ alignItems: 'center', marginTop: 12 }}>
            <Text style={{ ...TextStyles.bodyLg, color: colors.textTertiary, textDecorationLine: 'underline' }}>Continue as Guest</Text>
          </Pressable>

          {/* Terms */}
          <Text style={{ ...TextStyles.caption, textAlign: 'center', marginTop: 16, color: colors.textTertiary }}>
            By continuing, you agree to Travyl's Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

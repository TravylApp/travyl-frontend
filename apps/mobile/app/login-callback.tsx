import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@travyl/shared';
import { Navy } from '@travyl/shared';

function parseCodeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

export default function LoginCallback() {
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async (url: string) => {
      if (processedRef.current) return;
      processedRef.current = true;

      console.log('OAuth callback URL:', url);
      const code = parseCodeFromUrl(url);

      if (code) {
        console.log('Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Exchange code error:', error.message);
          router.replace('/login');
          return;
        }
        if (data.session) {
          console.log('OAuth login success:', data.user?.email);
          router.replace('/');
          return;
        }
      }

      // No code in URL — try initializing to pick up any stored session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/');
      } else {
        router.replace('/login');
      }
    };

    // Handle cold start (app was closed, opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleCallback(url);
      } else {
        router.replace('/login');
      }
    });

    // Handle warm start (app was backgrounded, brought to foreground via deep link)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleCallback(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color={Navy.DEFAULT} />
      <Text style={{ marginTop: 16, color: Navy.DEFAULT }}>Signing you in...</Text>
    </View>
  );
}

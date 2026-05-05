import '../global.css';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { LogBox, Text, TextInput } from 'react-native';
import { useAuthStore, configureSupabase } from '@travyl/shared';
import { Platform } from 'react-native';

// Reanimated 4 fires a (currently false-positive) warning whenever a
// style array combines a static object with a `useAnimatedStyle` result.
// We do this throughout the app (e.g. PlaceCard crossfade, MosaicTile
// press scale, FlipCard) and confirmed each `.value` access is inside a
// worklet. Suppress the warning so it stops drowning out real logs.
LogBox.ignoreLogs([
  'It looks like you might be using shared value\'s .value inside reanimated inline style',
]);

// Set Satoshi as the default font for all Text and TextInput components
const originalTextRender = (Text as any).render;
if (originalTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    const style = Array.isArray(props.style) ? props.style : [props.style];
    const hasFont = style.some((s: any) => s?.fontFamily);
    return originalTextRender.call(this, {
      ...props,
      style: hasFont ? props.style : [{ fontFamily: 'Satoshi-Regular' }, ...style],
    }, ref);
  };
}
const defaultTextInputProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps = {
  ...defaultTextInputProps,
  style: [{ fontFamily: 'Satoshi-Regular' }, defaultTextInputProps.style],
};

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Track if supabase has been configured
let _supabaseConfigured = false;

export default function RootLayout() {
  const queryClientRef = useRef(new QueryClient());
  const initialize = useAuthStore((s) => s.initialize);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Satoshi-Light': require('../assets/fonts/Satoshi-Light.ttf'),
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('../assets/fonts/Satoshi-Black.ttf'),
    'Lustria-Regular': require('../assets/fonts/Lustria-Regular.ttf'),
    FontAwesome: require('../assets/fonts/FontAwesome.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      if (__DEV__) console.log('Front-end developed by JPB Developments — https://www.jpbdevelopments.com');
    }
  }, [loaded]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      // Configure Supabase with AsyncStorage on native platforms
      if (!_supabaseConfigured && Platform.OS !== 'web') {
        _supabaseConfigured = true;
        try {
          const [{ createClient }, { default: AsyncStorage }] = await Promise.all([
            import('@supabase/supabase-js'),
            import('@react-native-async-storage/async-storage'),
          ]);
          const sb = createClient(
            process.env.EXPO_PUBLIC_SUPABASE_URL!,
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
            { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
          );
          configureSupabase(sb);
        } catch {}
      }
      // Initialize auth AFTER supabase is configured
      unsubscribe = initialize();
    };

    setup();
    return () => unsubscribe?.();
  }, [initialize]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, freezeOnBlur: false }} />
        <Stack.Screen name="trip/[id]" options={{ headerShown: false, gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="login-callback" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

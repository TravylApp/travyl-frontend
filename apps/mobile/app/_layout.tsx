import '../global.css';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { Text, TextInput } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@travyl/shared';

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
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
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
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[id]" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="signup" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

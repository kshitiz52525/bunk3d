import { DarkTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Inter_500Medium, Inter_600SemiBold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { color } from '@bunk3d/ui';

SplashScreen.preventAutoHideAsync();

// The app is dark only. There is no light theme.
const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: color.bg, card: color.bg, text: color.ink, border: color.line, primary: color.lime },
};

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_500Medium, Inter_600SemiBold, Inter_800ExtraBold, Unbounded_800ExtraBold });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      {/* Real stack navigation: Back always returns to the previous screen. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    </ThemeProvider>
  );
}

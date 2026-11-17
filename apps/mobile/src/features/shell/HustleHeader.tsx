import { router } from 'expo-router';
import { useMemo } from 'react';
import { PanResponder, Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { HidingHeader } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';

/** Hustle header: the photo is violet here. Tap opens the profile; swipe down returns to The Vibe. */
export function HustleHeader({ title }: { title: string }) {
  const api = useApi();
  const me = useAsync(() => api.you.me(), []);
  const pan = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => { if (g.dy > 30) router.replace('/tea'); },
    }),
  [],
  );
  return (
    <HidingHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 12, height: 86 }}>
        <View {...pan.panHandlers}>
          <Pressable accessibilityRole="button" accessibilityLabel="Your Hustle portfolio. Swipe down for The Vibe" onPress={() => router.push('/portfolio')} style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}>
            <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.onLime }}>{me.data?.initials ?? ''}</RNText>
          </Pressable>
        </View>
        <RNText accessibilityRole="header" style={{ flex: 1, fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, letterSpacing: -0.8, color: color.ink }}>{title}</RNText>
      </View>
    </HidingHeader>
  );
}

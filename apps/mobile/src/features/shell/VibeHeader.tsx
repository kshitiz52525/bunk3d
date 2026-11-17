import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { PanResponder, Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { HidingHeader, Icon } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession } from '@bunk3d/api';

const SEEN_KEY = 'bunk3d.seenModeSwitch';

/** Switch to The Hustle. First time shows MS1 (the mode-switch screen), then goes straight in. */
export async function goToHustle() {
  let seen = false;
  try { seen = (await AsyncStorage.getItem(SEEN_KEY)) === '1'; } catch { /* storage unavailable */ }
  router.push(seen ? '/gigs' : '/mode-switch');
}
export async function markModeSwitchSeen() {
  try { await AsyncStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ }
}

function IconBtn({ icon, label, onPress, badge, dot }: { icon: 'chat' | 'search' | 'bell'; label: string; onPress: () => void; badge?: number; dot?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} />
      {dot ? <View style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: color.lime }} /> : null}
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.hot, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{badge}</RNText>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Vibe header on every tab: photo (tap = profile, swipe up = Hustle), DMs, Search, Notices. */
export function VibeHeader() {
  const api = useApi();
  const session = useSession();
  const me = useAsync(() => api.you.me(), []);
  const badges = useAsync(() => api.you.badges(), []);
  const canHustle = (session?.wave ?? 1) >= 3; // The Hustle is hidden until wave 3.
  const pan = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => { if (g.dy < -30) goToHustle(); },
    }),
  [],
  );
  const initials = me.data?.initials ?? '';
  return (
    <HidingHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 12, height: 86 }}>
        <View {...(canHustle ? pan.panHandlers : {})}>
          <Pressable accessibilityRole="button" accessibilityLabel={canHustle ? 'Your profile. Swipe up for The Hustle' : 'Your profile'} onPress={() => router.push('/me')} accessibilityActions={canHustle ? [{ name: 'activate', label: 'Open profile' }, { name: 'magicTap', label: 'Switch to The Hustle' }] : undefined} onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'magicTap') goToHustle(); }} style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}>
            <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.onLime }}>{initials}</RNText>
            {canHustle ? <View style={{ position: 'absolute', bottom: -10, alignSelf: 'center', backgroundColor: color.bg, borderRadius: 8, width: 24, height: 14, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevronUp" size={12} color={color.ink} stroke={3} /></View> : null}
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <RNText accessibilityRole="header" accessibilityLabel="Bunk3d" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, letterSpacing: -0.8, color: color.ink }}>bunk<RNText style={{ color: color.lime }}>3</RNText>d</RNText>
          <RNText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{me.data?.campusName ?? ''}</RNText>
        </View>
        <IconBtn icon="chat" label="Messages" dot={badges.data?.unreadDms} onPress={() => router.push('/dms')} />
        <IconBtn icon="search" label="Search" onPress={() => router.push('/search')} />
        <IconBtn icon="bell" label="Notices" badge={badges.data?.unreadNotices || undefined} onPress={() => router.push('/notices')} />
      </View>
    </HidingHeader>
  );
}

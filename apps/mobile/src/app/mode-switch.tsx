import { router } from 'expo-router';
import { Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Icon } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { markModeSwitchSeen } from '@/features/shell/VibeHeader';
import { Btn, Display, Pill, T, VIOLET, f } from '@/features/hustle/kit';

const NOTES = [
  'Works from the photo on any screen that has the header.',
  'Your photo turns lime in The Vibe and violet in The Hustle, so you always know where you are.',
  'Tap = profile. Swipe up = switch. A haptic tick confirms it. VoiceOver/TalkBack users get a “Switch to …” action on the photo.',
  'Hidden until the campus reaches wave 3 — no Hustle, no swipe.',
];

/** MS1: shown the first time someone swipes up to The Hustle. */
export default function ModeSwitch() {
  const api = useApi();
  const me = useAsync(() => api.you.me(), []);
  const go = async (setup: boolean) => {
    await markModeSwitchSeen();
    router.replace('/gigs');
    if (setup) router.push('/payout-setup');
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
          <RNText style={{ fontFamily: f.display, fontSize: 16, color: color.onLime }}>{me.status === 'ready' ? me.data.initials : ''}</RNText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RNText accessibilityLabel="Bunk3d" style={{ fontFamily: f.display, fontSize: 20, color: color.ink }}>bunk<RNText style={{ color: color.lime }}>3</RNText>d</RNText>
            <Pill label="HUSTLE" bg={VIOLET} />
          </View>
          <T size={12} c={color.inkMuted}>{me.status === 'ready' ? me.data.campusName : ''}</T>
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 4 }} accessibilityElementsHidden>
          <Icon name="arrowUp" size={28} color={VIOLET} />
          <T size={12} weight="bold" c={VIOLET}>swipe up on your photo</T>
        </View>
        <Display size={32}>You’re in The Hustle.</Display>
        <T size={15} c="#C9C9C3">Gigs, My Work, The Swap and My Bag. Swipe up again to go back to campus life.</T>
        <View style={{ gap: 10 }}>
          {NOTES.map((n, i) => (
            <View key={n} style={{ flexDirection: 'row', gap: 10 }}>
              <T size={12} weight="bold" c={VIOLET}>{String(i + 1).padStart(2, '0')}</T>
              <T size={13} c={color.inkMuted} style={{ flex: 1 }}>{n}</T>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 10, paddingBottom: 12 }}>
        <T size={13} c="#C9C9C3">First time here? Set up payouts once (PAN + UPI, about 2 minutes) so you can apply to paid gigs.</T>
        <Btn label="Set up payouts" kind="violet" onPress={() => go(true)} />
        <Btn label="Just browse gigs for now" kind="ghost" onPress={() => go(false)} />
      </View>
    </SafeAreaView>
  );
}

import { router } from 'expo-router';
import { Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { Banner, Icon } from '@bunk3d/ui/native';
import { Btn } from '@/features/you/ui';

/** Opt-in gate. Discover is off by default; nothing about the person is visible until they turn it on. */
export function Gate({ eligible, busy, failed, onTurnOn }: { eligible: boolean; busy: boolean; failed: boolean; onTurnOn: () => void }) {
  return (
    <View style={{ gap: 14, paddingTop: 8 }}>
      <View style={{ backgroundColor: color.surface, borderRadius: 24, borderWidth: 1, borderColor: '#2E2E36', padding: 20, gap: 10 }}>
        <View aria-hidden style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: '#26262D', alignItems: 'center', justifyContent: 'center' }}><Icon name="compass" size={28} /></View>
        <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, letterSpacing: -0.6, color: color.ink }}>Discover is off</RNText>
        <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21, color: '#C9C9C3' }}>Off by default. Nobody sees you until you switch this on.</RNText>
        <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted }}>Spark is for friends, study partners and squads. It’s not a dating app — romantic or sexual approaches get you removed.</RNText>
        <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>18+ verified students only · Blocked people never see you</RNText>
      </View>
      {!eligible ? <Banner text="Discover is for verified students aged 18 or over. Finish verification to switch it on." /> : null}
      {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error }}>Couldn’t switch it on. Try again.</RNText> : null}
      <Btn label={busy ? 'Turning on…' : 'Turn on Discover'} onPress={onTurnOn} disabled={!eligible || busy} />
      <Btn label="Discover settings" kind="ghost" onPress={() => router.push('/spark-prefs')} />
    </View>
  );
}

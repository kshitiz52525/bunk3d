import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, Icon, PrimaryCta, Screen, Spacer, StepHeader } from '@bunk3d/ui/native';
import { useApi } from '@bunk3d/api';

const RULES: [string, string, string][] = [
  ['01', 'No hate. Not for anyone, not as a joke.', color.lime],
  ['02', 'Anon? Don’t name or point at a real student.', color.violet],
  ['03', 'No harassment, in posts or in DMs.', color.hot],
  ['04', 'No doxxing — numbers, rooms, addresses.', color.info],
  ['05', 'Report it, don’t retaliate.', color.warning],
];
const STRIKES: [string, string, string, string][] = [
  ['1', 'Warning', color.line, color.ink],
  ['2', '24 h mute', '#3D2E0D', color.warning],
  ['3', '7-day ban', '#3A1626', color.hot],
  ['4', 'Gone', '#3A1618', color.error],
];

// A9 The vibe check. "Enter Bunk3d" stays disabled until the box is ticked.
export default function Guidelines() {
  const api = useApi();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const enter = async () => { setBusy(true); await api.onboarding.acceptGuidelines(); setBusy(false); router.replace('/'); };
  return (
    <Screen>
      <StepHeader step={7} onBack={() => router.back()} />
      <View style={{ marginTop: 30, marginBottom: 6 }}><H1>The vibe check</H1></View>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: color.inkMuted, marginBottom: 16 }}>5 rules. Your campus Mods enforce them.</RNText>
      <View style={{ gap: 8 }}>
        {RULES.map(([n, t, c]) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 48 }}>
            <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: c }}>{n}</RNText>
            <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, lineHeight: 19, color: color.ink }}>{t}</RNText>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 12, gap: 10 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: 1.2, color: color.inkMuted }}>STRIKES · EXPIRE AFTER 90 DAYS</RNText>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STRIKES.map(([n, l, bg, fg]) => (
            <View key={n} style={{ flex: 1, backgroundColor: bg, borderRadius: 12, paddingVertical: 8, alignItems: 'center' }}>
              <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: fg }}>{n}</RNText>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: fg }}>{l}</RNText>
            </View>
          ))}
        </View>
        <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted }}>Anonymous unlocks at 20 karma after 7 days. Anon to students — never to Bunk3d staff.</RNText>
      </View>
      <Spacer />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ok }} accessibilityLabel="I’m in. No cap." onPress={() => setOk(!ok)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, marginBottom: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: ok ? color.lime : color.ink, alignItems: 'center', justifyContent: 'center' }}>{ok ? <Icon name="check" size={18} color={color.onLime} stroke={3} /> : null}</View>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>I’m in. No cap.</RNText>
      </Pressable>
      <PrimaryCta label="Enter Bunk3d" disabled={!ok} loading={busy} onPress={enter} />
    </Screen>
  );
}

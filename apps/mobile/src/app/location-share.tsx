import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Avatar, Btn, Pill, SectionLabel, Switch, TopBar } from '@/features/you/ui';
import { getDevicePosition } from '@/features/discover/position';

/** R5 Location sharing. Ghost mode is on by default. Opt-in, per person, 15/30/60 min, approximate, switches off by itself. */
export default function LocationShare() {
  const api = useApi();
  const st = useAsync(() => api.discover.locationSharing(), []);
  const targets = useAsync(() => api.discover.shareTargets(), []);
  const [picked, setPicked] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const d = st.data;
  const active = d?.active;

  // Pick up the auto switch-off without the person doing anything.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => st.reload(), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!active]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const ghost = async (on: boolean) => { try { await api.discover.setGhost(on); st.reload(); } catch { setProblem('Couldn’t change ghost mode. Try again.'); } };
  const start = async () => {
    setBusy(true); setProblem(null);
    try {
      if (active) await api.discover.extendLocationShare();
      else {
        const position = await getDevicePosition();
        const r = await api.discover.startLocationShare({ personIds: picked, minutes, position });
        if (!r.ok) setProblem(r.reason === 'nobody' ? 'Pick at least one person.' : 'Pick 15, 30 or 60 minutes.');
      }
      st.reload();
    } catch { setProblem('Couldn’t start sharing. Try again.'); } finally { setBusy(false); }
  };
  const stop = async () => { try { await api.discover.stopLocationShare(); setPicked([]); st.reload(); } catch { setProblem('Couldn’t stop sharing. Try again.'); } };

  const cta = active ? 'Sharing · tap to extend 15 min' : `Share for ${minutes} min`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      {active ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#12301F', paddingHorizontal: 18, minHeight: 48 }}>
          <View aria-hidden style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.success }} />
          <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.success }}>Sharing approx. location with {active.names.join(', ')} · {active.minutesLeft} min left</RNText>
          <Pressable accessibilityRole="button" accessibilityLabel="Stop sharing" onPress={stop} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>Stop</RNText></Pressable>
        </View>
      ) : null}
      <View style={{ paddingHorizontal: 18 }}><TopBar title="Location" /></View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {st.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {st.status === 'error' ? <ErrorState onRetry={st.reload} /> : null}
        {d ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: d.ghost ? color.surface : '#12301F', borderRadius: 20, padding: 16, marginTop: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.ink }}>Ghost mode</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>{d.ghost ? 'On — you’re invisible on Radar. Default for everyone.' : 'Off — campus sees “around Library” level only.'}</RNText>
              </View>
              <Switch on={d.ghost} label="Ghost mode" onChange={ghost} />
            </View>
            <SectionLabel>SHARE WITH</SectionLabel>
            {targets.status === 'loading' ? <SkeletonList rows={2} /> : null}
            {targets.status === 'error' ? <ErrorState onRetry={targets.reload} /> : null}
            <View style={{ gap: 6 }}>
              {(targets.data ?? []).map((p) => {
                const on = active ? active.personIds.includes(p.id) : picked.includes(p.id);
                return (
                  <Pressable key={p.id} accessibilityRole="checkbox" accessibilityLabel={p.name} accessibilityState={{ checked: on, disabled: !!active }} disabled={!!active} onPress={() => toggle(p.id)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: on ? color.lime : '#2E2E36', opacity: active && !on ? 0.5 : 1 }}>
                    <Avatar initials={p.initials} tint={p.tint} size={36} />
                    <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{p.name}</RNText>
                    {on ? <Icon name="check" size={18} color={color.lime} stroke={3} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <SectionLabel>FOR HOW LONG</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>{[15, 30, 60].map((m) => <Pill key={m} tone="lime" label={`${m} min`} selected={m === minutes} onPress={() => !active && setMinutes(m)} />)}</View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Icon name="shield" size={18} color={color.inkMuted} />
              <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted }}>Approximate only — rounded to about 150 m. It switches off by itself when time runs out. Never visible to people you haven’t picked.</RNText>
            </View>
            {problem ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error, marginTop: 8 }}>{problem}</RNText> : null}
          </View>
        ) : null}
      </ScrollView>
      {d ? <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}><Btn label={busy ? 'Working…' : cta} onPress={start} disabled={busy || (!active && picked.length === 0)} /></View> : null}
    </SafeAreaView>
  );
}

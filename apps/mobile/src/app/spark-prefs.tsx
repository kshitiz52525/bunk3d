import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Banner, ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { SPARK_INTENTS, useApi, useAsync, type SparkPrefs } from '@bunk3d/api';
import { Btn, Pill, SectionLabel, Switch, TopBar } from '@/features/you/ui';

const WEEK = 7 * 24 * 3_600_000;
const YEAR: [SparkPrefs['year'], string][] = [['any', 'Any year'], ['plusminus1', 'My year ±1'], ['same', 'My year only']];
const SCOPE: [SparkPrefs['scope'], string][] = [['campus', 'My campus'], ['nearby', 'Nearby campuses']];
const PRIO: [SparkPrefs['priority'], string][] = [['anyone', 'Anyone'], ['clubs', 'Shared clubs first']];

function Cycle<T extends string>({ label, sub, value, options, onChange }: { label: string; sub: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex((o) => o[0] === value));
  const cur = options[i][1];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${cur}. Tap to change`} onPress={() => onChange(options[(i + 1) % options.length][0])} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#222228' }}>
      <View style={{ flex: 1 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{label}</RNText>
        <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{sub}</RNText>
      </View>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>{cur} ›</RNText>
    </Pressable>
  );
}

/** SP2 Spark settings. Discover is off by default. */
export default function SparkPrefsScreen() {
  const api = useApi();
  const s = useAsync(() => api.discover.sparkPrefs(), []);
  const [patch, setPatch] = useState<Partial<SparkPrefs>>({});
  const [now] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const d: SparkPrefs | null = s.data ? { ...s.data, ...patch } : null;
  const set = (p: Partial<SparkPrefs>) => setPatch((x) => ({ ...x, ...p }));
  const save = async () => {
    if (!d) return;
    setSaving(true); setFailed(false);
    try { await api.discover.updateSparkPrefs({ discoverOn: d.discoverOn, intents: d.intents, year: d.year, scope: d.scope, priority: d.priority, pausedUntil: d.pausedUntil }); router.back(); } catch { setFailed(true); setSaving(false); }
  };
  const paused = !!d?.pausedUntil && d.pausedUntil > now;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: 18 }}><TopBar title="Spark settings" /></View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {s.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {s.status === 'error' ? <ErrorState onRetry={s.reload} /> : null}
        {d ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: d.discoverOn ? color.lime : color.surface, borderRadius: 20, padding: 16, marginTop: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: d.discoverOn ? color.onLime : color.ink }}>{d.discoverOn ? 'You’re in the deck' : 'Discover is off'}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: d.discoverOn ? color.onLime : color.inkMuted }}>{d.discoverOn ? 'Verified students on your campus can see your Spark card.' : 'Off by default. Nobody sees you until you switch this on.'}</RNText>
              </View>
              <Switch on={d.discoverOn} label="Show me in Discover" onChange={(v) => set({ discoverOn: v })} />
            </View>
            {!d.eligible ? <View style={{ marginTop: 10 }}><Banner text="Discover is for verified students aged 18 or over." /></View> : null}
            <SectionLabel>I’M HERE FOR</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {SPARK_INTENTS.map((i) => {
                const on = d.intents.includes(i);
                return <Pill key={i} tone="lime" label={(on ? '✓ ' : '') + i} selected={on} onPress={() => set({ intents: on ? d.intents.filter((x) => x !== i) : [...d.intents, i] })} />;
              })}
            </View>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted, marginTop: 10 }}>Spark is for friends, study partners and squads. It’s not a dating app — romantic or sexual approaches get you removed.</RNText>
            <SectionLabel>WHO CAN SEE ME</SectionLabel>
            <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line }}>
              <Cycle label="Year" sub="Batch range shown to you" value={d.year} options={YEAR} onChange={(year) => set({ year })} />
              <Cycle label="Campus" sub="Inter-college once your campus is in wave 4" value={d.scope} options={SCOPE} onChange={(scope) => set({ scope })} />
              <Cycle label="Priority" sub="How the deck is ordered" value={d.priority} options={PRIO} onChange={(priority) => set({ priority })} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14 }}>
              <View style={{ flex: 1 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Pause for a week</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Hidden from decks; chats stay</RNText>
              </View>
              <Btn label={paused ? 'Paused · undo' : 'Pause'} kind="ghost" small onPress={() => set({ pausedUntil: paused ? null : now + WEEK })} />
            </View>
            <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted, marginTop: 14 }}>18+ verified students only · Blocked people never see you</RNText>
            {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error, marginTop: 8 }}>Couldn’t save. Try again.</RNText> : null}
          </View>
        ) : null}
      </ScrollView>
      {d ? <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}><Btn label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} /></View> : null}
    </SafeAreaView>
  );
}

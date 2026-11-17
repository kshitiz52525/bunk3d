import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, SkeletonList, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Gate } from '@/features/discover/Gate';
import { RadarView } from '@/features/discover/RadarView';
import { SparkDeck } from '@/features/discover/SparkDeck';

/** Discover tab: People (Spark) and Places (Radar). Off by default; the opt-in gate comes first. */
export default function Discover() {
  const api = useApi();
  const { onScroll } = useChrome();
  const prefs = useAsync(() => api.discover.sparkPrefs(), []);
  const invites = useAsync(() => api.discover.invites(), []);
  const [mode, setMode] = useState<'spark' | 'radar'>('spark');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const turnOn = async () => {
    setBusy(true); setFailed(false);
    try { await api.discover.updateSparkPrefs({ discoverOn: true }); prefs.reload(); } catch { setFailed(true); } finally { setBusy(false); }
  };
  const newInvites = invites.data?.received.filter((i) => !i.reply).length ?? 0;
  const on = prefs.data?.discoverOn;

  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace(), paddingHorizontal: 16, gap: 12 }} style={{ backgroundColor: color.bg }}>
      {prefs.status === 'loading' ? <SkeletonList rows={3} /> : null}
      {prefs.status === 'error' ? <ErrorState onRetry={prefs.reload} /> : null}
      {prefs.status === 'ready' && !on ? <Gate eligible={prefs.data.eligible} busy={busy} failed={failed} onTurnOn={turnOn} /> : null}
      {prefs.status === 'ready' && on ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View accessibilityRole="tablist" style={{ flex: 1, flexDirection: 'row', backgroundColor: color.surface, borderRadius: 999, borderWidth: 1, borderColor: color.line, padding: 3 }}>
              {([['spark', 'People · Spark'], ['radar', 'Places · Radar']] as const).map(([k, label]) => (
                <Pressable key={k} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: mode === k }} onPress={() => setMode(k)} style={{ flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === k ? color.ink : 'transparent' }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: mode === k ? color.onLime : '#C9C9C3' }}>{label}</RNText>
                </Pressable>
              ))}
            </View>
            {mode === 'spark' ? (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel={newInvites ? `Invites, ${newInvites} new` : 'Invites'} onPress={() => router.push('/spark-invites')} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="send" size={18} />
                  {newInvites ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime }}>{newInvites}</RNText></View> : null}
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Discover settings" onPress={() => router.push('/spark-prefs')} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="filter" size={18} />
                </Pressable>
              </>
            ) : null}
          </View>
          {mode === 'spark' ? <SparkDeck /> : <RadarView />}
        </>
      ) : null}
    </ScrollView>
  );
}

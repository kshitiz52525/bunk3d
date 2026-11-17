import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { SPARK_INTENTS, useApi, useAsync, type SparkIntent } from '@bunk3d/api';
import { Btn, Pill } from '@/features/you/ui';

/** SP1 Spark deck: friends, study partners, sports, events, hangouts. Not dating. */
export function SparkDeck() {
  const api = useApi();
  const [intent, setIntent] = useState<SparkIntent>('Friends');
  const [i, setI] = useState(0);
  const [sent, setSent] = useState(false);
  const deck = useAsync(() => api.discover.sparkDeck(intent), [intent]);
  const quota = useAsync(() => api.discover.inviteQuota(), []);
  const pick = (x: SparkIntent) => { setIntent(x); setI(0); setSent(false); };

  const cards = deck.data ?? [];
  const c = cards[i];
  const next = () => { setI((n) => n + 1); setSent(false); };
  const pass = async () => { if (!c) return; api.discover.sparkPass(c.id).catch(() => {}); next(); };
  const connect = async () => {
    if (!c) return;
    if (sent) return next();
    try { await api.discover.sparkConnect(c.id); setSent(true); } catch { deck.reload(); }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {SPARK_INTENTS.map((x) => <Pill key={x} label={x} selected={x === intent} onPress={() => pick(x)} />)}
      </View>
      {deck.status === 'loading' ? <SkeletonList rows={3} /> : null}
      {deck.status === 'error' ? <ErrorState onRetry={deck.reload} /> : null}
      {deck.status === 'ready' && c ? (
        <View style={{ gap: 12 }}>
          <View accessibilityLabel={`${c.name}, ${c.year}, ${c.branch}. Looking for ${c.prompt}`} style={{ backgroundColor: color.surface, borderRadius: 26, borderWidth: 1, borderColor: '#2E2E36', overflow: 'hidden' }}>
            <View style={{ height: 8, backgroundColor: c.tint }} />
            <View style={{ padding: 18, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted }}>{c.intent.toUpperCase()}</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.success }}>✓ Verified · {c.year}</RNText>
              </View>
              <View aria-hidden style={{ width: 84, height: 84, borderRadius: 30, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 28, color: color.onLime }}>{c.initials}</RNText>
              </View>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, letterSpacing: -0.8, color: color.ink }}>{c.name}</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>{c.branch}</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22, color: '#E4E4DE' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold' }}>Looking for:</RNText> {c.prompt}</RNText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {c.common.map((t) => <View key={t} style={{ borderRadius: 999, borderWidth: 1, borderColor: '#2E2E36', paddingHorizontal: 10, paddingVertical: 6 }}><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9C9C3' }}>{t}</RNText></View>)}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Pass" onPress={pass} style={{ width: 56, height: 56, borderRadius: 18, borderWidth: 1, borderColor: '#2E2E36', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={24} /></Pressable>
            <Btn label={sent ? 'Request sent ✓' : 'Connect'} onPress={connect} style={{ flex: 1 }} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Shoot your shot, ${quota.data?.left ?? 0} invites left today`} onPress={() => router.push({ pathname: '/shoot-your-shot', params: { to: c.id } })} style={{ minHeight: 56, borderRadius: 16, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.onLime }}>Shoot your shot</RNText>
            {quota.data ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#4A4A54' }}>{quota.data.left} invites left today</RNText> : null}
          </Pressable>
        </View>
      ) : null}
      {deck.status === 'ready' && !c ? (
        <EmptyState title="That’s everyone for now" body="New people show up as they turn Discover on. Try another intent or check Radar for meetups." action={{ label: 'Start over', onPress: () => { setI(0); setSent(false); deck.reload(); } }} />
      ) : null}
    </View>
  );
}

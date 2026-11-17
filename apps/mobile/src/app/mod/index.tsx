import { router } from 'expo-router';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type ModQueueItem } from '@bunk3d/api';
import { ago, TopBar } from '@/features/you/ui';

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 }}>
      <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.ink }}>{n}</RNText>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted, marginTop: 2 }}>{label}</RNText>
    </View>
  );
}

function Row({ it }: { it: ModQueueItem }) {
  const votes = it.votesSoFar.remove + it.votesSoFar.keep;
  const meta = it.notLiveYet
    ? 'Not live yet · no votes'
    : `${it.targetKind[0].toUpperCase()}${it.targetKind.slice(1)} · ${it.authorLabel}${votes ? ` · ${it.votesSoFar.remove} Remove vote${it.votesSoFar.remove === 1 ? '' : 's'} so far` : ''}`;
  const body = (
    <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: it.notLiveYet ? color.line : '#2E2E36', padding: 14, gap: 6, opacity: it.notLiveYet ? 0.8 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: it.source === 'ai' ? color.modInk : color.hot }}>{it.headline}</RNText>
        <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{ago(it.reportedAt)}</RNText>
      </View>
      <RNText numberOfLines={2} style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, color: color.ink }}>{it.excerpt}</RNText>
      <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{meta}</RNText>
    </View>
  );
  if (it.notLiveYet) return body;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Review: ${it.headline}`} onPress={() => router.push({ pathname: '/mod/[id]', params: { id: it.id } })}>{body}</Pressable>;
}

/** M1 Mod queue. Campus Mods only. */
export default function ModQueueScreen() {
  const api = useApi();
  const q = useAsync(async () => {
    const s = await api.safety.modStatus();
    return s.isMod ? await api.safety.modQueue() : null;
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <TopBar title="Mod queue" subtitle="Atria University · Campus Mods" />
        {q.status === 'loading' ? <View style={{ marginTop: 16 }}><SkeletonList rows={3} /></View> : null}
        {q.status === 'error' ? <ErrorState onRetry={q.reload} /> : null}
        {q.status === 'ready' && q.data === null ? <EmptyState title="This is for Campus Mods." body="Mods are students your campus has asked to review reports." action={{ label: 'Back', onPress: () => router.back() }} /> : null}
        {q.status === 'ready' && q.data ? (
          <View style={{ gap: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stat n={String(q.data.waiting)} label="WAITING" />
              <Stat n={q.data.oldestMinutes === null ? '–' : `${q.data.oldestMinutes}m`} label="OLDEST" />
              <Stat n={String(q.data.modsOn)} label="MODS ON" />
            </View>
            {q.data.items.length === 0 ? (
              <EmptyState title="Nothing waiting." body="Every report has been reviewed. Thanks for keeping campus kind." action={{ label: 'Back to profile', onPress: () => router.back() }} />
            ) : (
              <>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted }}>OLDEST FIRST</RNText>
                {q.data.items.map((it) => <Row key={it.id} it={it} />)}
              </>
            )}
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted }}>You never see who posted, and never see your own posts here. Two matching votes decide; anything split goes to Bunk3d ops.</RNText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

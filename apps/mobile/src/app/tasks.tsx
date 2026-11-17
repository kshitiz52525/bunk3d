import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type TaskFilter } from '@bunk3d/api';
import { BackBar, ClubTile, Pill, T, fmtDate, fmtShortDate, useLive, useLoadedAgo, useOnline } from '@/features/crew/parts';
import { RewardTag, STATUS } from '@/features/crew/task-ui';

/** C4 My tasks. */
export default function MyTasks() {
  const api = useApi();
  const [filter, setFilter] = useState<TaskFilter>('Open');
  const state = useAsync(() => api.crew.listMyTasks(filter), [filter]);
  useLive(api.crew.subscribe, state.reload);
  const online = useOnline();
  const ago = useLoadedAgo(state.status === 'ready');
  const clubCount = state.status === 'ready' ? new Set(state.data.flatMap((g) => g.items.map((t) => t.clubId))).size : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <BackBar title="My tasks" right={state.status === 'ready' && clubCount ? <T size={12} c={color.inkMuted}>{`${clubCount} club${clubCount === 1 ? '' : 's'}`}</T> : undefined} />
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        {(['Open', 'Paid', 'Done'] as TaskFilter[]).map((f) => <Pill key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />)}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}>
        {!online ? <OfflineBanner message={`You’re offline · showing tasks from ${ago()}`} /> : null}
        {state.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {state.status === 'error' ? <ErrorState onRetry={state.reload} /> : null}
        {state.status === 'ready' && state.data.length === 0 ? (
          <EmptyState title={filter === 'Done' ? 'Nothing finished yet.' : filter === 'Paid' ? 'No paid tasks right now.' : 'No open tasks.'} body="Club admins assign tasks to members. Join a club to get some." action={{ label: 'Browse clubs', onPress: () => router.navigate('/crew' as never) }} />
        ) : null}
        {state.status === 'ready' ? state.data.map((g) => (
          <View key={g.key} style={{ gap: 8 }}>
            <T size={11} f="bold" c={g.key === 'this_week' ? color.hot : color.inkMuted} style={{ letterSpacing: 1, marginTop: 8 }}>{g.label}</T>
            {g.items.map((t) => (
              <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.title}, ${STATUS[t.status].label}`} onPress={() => router.push({ pathname: '/task/[id]', params: { id: t.id } })} style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ClubTile short={t.clubShort} tint={t.tint} size={36} />
                  <T size={12} c={color.inkMuted} style={{ flex: 1 }} numberOfLines={1}>{`${t.clubName} · from ${t.from}`}</T>
                  <RewardTag r={t.reward} />
                </View>
                <T size={15} f="bold">{t.title}</T>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T size={12} f="bold" c={STATUS[t.status].color}>{STATUS[t.status].label}</T>
                  <T size={12} c={color.inkMuted}>{t.status === 'approved' ? fmtShortDate(t.dueMs) : fmtDate(t.dueMs)}</T>
                </View>
              </Pressable>
            ))}
          </View>
        )) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

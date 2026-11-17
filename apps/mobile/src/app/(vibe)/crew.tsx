import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, OfflineBanner, SkeletonList, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession, type ClubFilter, type ClubSummary } from '@bunk3d/api';
import { ClubTile, Pill, T, useLive, useLoadedAgo, useOnline } from '@/features/crew/parts';

const FILTERS: ClubFilter[] = ['All', 'Tech', 'Cultural', 'Sports', 'Social'];

function myClubSub(c: ClubSummary) {
  if (c.state === 'pending') return 'Pending';
  if (c.role === 'lead' || c.role === 'coordinator') return c.newCount ? `Admin · ${c.newCount} new` : 'Admin';
  return 'Member';
}

/** C1 Clubs: the Crew tab body. */
export default function CrewTab() {
  const api = useApi();
  const session = useSession();
  const { onScroll } = useChrome();
  const [filter, setFilter] = useState<ClubFilter>('All');
  const [busy, setBusy] = useState<string | null>(null);
  const state = useAsync(() => api.crew.listClubs(filter), [filter]);
  useLive(api.crew.subscribe, state.reload);
  const online = useOnline();
  const ago = useLoadedAgo(state.status === 'ready');
  const wave2 = (session?.wave ?? 1) >= 2;

  async function cta(c: ClubSummary) {
    if (c.state !== 'none') return;
    setBusy(c.id);
    try { await api.crew.joinClub(c.id); } finally { setBusy(null); state.reload(); }
  }

  const link = (label: string, onPress: () => void, count?: number) => (
    <Pressable key={label} accessibilityRole="link" accessibilityLabel={count ? `${label}, ${count} open` : label} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <T size={13} f="bold">{label}</T>
      {count ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.hot, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T size={11} f="bold" c={color.onLime}>{count}</T></View> : null}
    </Pressable>
  );

  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace() + 16, paddingHorizontal: 16, gap: 14 }}>
      <T size={28} f="display" accessibilityRole="header">The Crew</T>
      {!online ? <OfflineBanner message={`You’re offline · showing clubs from ${ago()}`} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {link('My tasks', () => router.push('/tasks'), state.data?.openTaskCount)}
        {wave2 ? link('Side Quests', () => router.push('/quests')) : null}
        {wave2 ? link('Clout', () => router.push('/clout')) : null}
      </View>

      {state.status === 'loading' ? <SkeletonList rows={5} /> : null}
      {state.status === 'error' ? <ErrorState onRetry={state.reload} /> : null}
      {state.status === 'ready' ? (
        <>
          <T size={11} f="bold" c={color.inkMuted} style={{ letterSpacing: 1 }}>MY CLUBS</T>
          {state.data.mine.length === 0 ? (
            <EmptyState title="No clubs yet." body="Join one below to see its posts and chat." action={{ label: 'Browse clubs', onPress: () => setFilter('All') }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {state.data.mine.map((c) => (
                <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}, ${myClubSub(c)}`} onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })} style={{ width: 104, minHeight: 96, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, padding: 10, gap: 8, alignItems: 'flex-start' }}>
                  <ClubTile short={c.short} tint={c.tint} size={40} />
                  <T size={11} f="semi" c={c.state === 'pending' ? color.warning : '#C9C9C3'} numberOfLines={1}>{myClubSub(c)}</T>
                </Pressable>
              ))}
            </View>
          )}

          <T size={11} f="bold" c={color.inkMuted} style={{ letterSpacing: 1, marginTop: 4 }}>DISCOVER</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FILTERS.map((f) => <Pill key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />)}
          </View>
          {state.data.discover.length === 0 ? (
            <EmptyState title="No clubs in this category yet." body="Try another category." action={{ label: 'Show all clubs', onPress: () => setFilter('All') }} />
          ) : (
            <View style={{ gap: 8 }}>
              {state.data.discover.map((c) => {
                const label = c.state === 'pending' ? 'Pending' : c.join === 'approval' ? 'Request' : 'Join';
                return (
                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${c.name}, ${c.category}, ${c.members} members`} onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
                      <ClubTile short={c.short} tint={c.tint} size={44} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <T size={15} f="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{c.name}</T>
                          {c.verified ? <Icon name="check" size={14} color={color.lime} stroke={3} /> : null}
                        </View>
                        <T size={12} c={color.inkMuted}>{`${c.category} · ${c.members} members · ${c.join === 'open' ? 'open' : 'approval'}`}</T>
                      </View>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${c.name}`} accessibilityState={{ disabled: c.state !== 'none' || busy === c.id }} disabled={c.state !== 'none' || busy === c.id} onPress={() => cta(c)} style={{ minHeight: 44, minWidth: 76, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.state === 'pending' ? 'transparent' : color.lime, borderWidth: c.state === 'pending' ? 1 : 0, borderColor: color.line }}>
                      <T size={13} f="bold" c={c.state === 'pending' ? color.warning : color.onLime}>{label}</T>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

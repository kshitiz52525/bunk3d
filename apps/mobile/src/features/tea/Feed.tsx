import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, OfflineBanner, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession, type FeedSort, type ModerationNotice, type Post, type TeaScope } from '@bunk3d/api';
import { PostCard, type PostActions } from './PostCard';
import { goPending, untilText, useNow, useOfflineQueue, useOnline, useTeaChanged } from './util';

type FeedData = Awaited<ReturnType<ReturnType<typeof useApi>['tea']['getFeed']>>;
const cache = new Map<string, FeedData>();

/** Feed data with local optimistic overrides, offline cache and the new-posts count. */
export function useTeaFeed(scope: TeaScope, sort: FeedSort, topic: string) {
  const api = useApi();
  const online = useOnline();
  const enqueue = useOfflineQueue(online);
  const key = `${JSON.stringify(scope)}|${sort}|${topic}`;
  const [stale, setStale] = useState(false);
  const state = useAsync(async () => {
    try {
      const r = await api.tea.getFeed({ scope, sort, topic });
      cache.set(key, r);
      setStale(false);
      return r;
    } catch (e) {
      const c = cache.get(key);
      if (c) { setStale(true); return c; }
      throw e;
    }
  }, [key]);
  useTeaChanged(state.reload);
  const [overState, setOverState] = useState<{ src: unknown; map: Record<string, Partial<Post>> }>({ src: null, map: {} });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const dataRef = state.data;
  const patch = useCallback((id: string, p: Partial<Post>) => setOverState((o) => { const base = o.src === dataRef ? o.map : {}; return { src: dataRef, map: { ...base, [id]: { ...base[id], ...p } } }; }), [dataRef]);

  const posts = useMemo(() => (state.data?.posts ?? []).filter((p) => !hidden.has(p.id)).map((p) => ({ ...p, ...(overState.src === state.data ? overState.map[p.id] : undefined) })), [state.data, overState, hidden]);

  const actions: PostActions = useMemo(() => ({
    vote: (p, v) => {
      const next = p.myVote === v ? 0 : v;
      patch(p.id, { myVote: next, score: p.score + (next - p.myVote) });
      void enqueue(() => api.tea.vote(p.id, v));
    },
    votePoll: (p, optionId) => {
      if (!p.poll || p.poll.myChoice) return;
      patch(p.id, { poll: { ...p.poll, myChoice: optionId, total: p.poll.total + 1, options: p.poll.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)) } });
      void enqueue(() => api.tea.votePoll(p.id, optionId));
    },
    save: (p) => { patch(p.id, { saved: !p.saved }); void api.tea.toggleSave(p.id); },
    editHeld: (p) => router.push({ pathname: '/post/new', params: { editId: p.id, text: p.body, topic: p.topic } }),
    dismiss: (p) => setHidden((h) => new Set(h).add(p.id)),
  }), [api, enqueue, patch]);

  return { state, posts, actions, online, stale, fetchedAt: state.data?.fetchedAt };
}

export function useCanAct() {
  const session = useSession();
  return session?.verified === 'verified';
}

export function NewPostsPill({ scope, topic, since, onPress }: { scope: TeaScope; topic: string; since: number | undefined; onPress: () => void }) {
  const api = useApi();
  const [cnt, setCnt] = useState<{ since: number | undefined; n: number }>({ since: undefined, n: 0 });
  const n = cnt.since === since ? cnt.n : 0;
  useEffect(() => {
    if (since === undefined) return;
    let live = true;
    const tick = () => { api.tea.countNewSince({ scope, topic }, since).then((c) => live && setCnt({ since, n: c }), () => undefined); };
    tick();
    const id = setInterval(tick, 15_000);
    return () => { live = false; clearInterval(id); };
  }, [api, scope, topic, since]);
  if (!n) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 4 }}>
      <RNText accessibilityRole="button" accessibilityLabel={`${n} new posts. Scroll to top`} onPress={onPress} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime, backgroundColor: color.lime, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, overflow: 'hidden', boxShadow: `3px 3px 0 ${color.violet}` }}>↑ {n} new {n === 1 ? 'post' : 'posts'}</RNText>
    </View>
  );
}

/** The list body: loading, error, empty (one button), offline banner, posts. */
export function FeedBody({ feed, topic, emptyAction, burstId, onBurst, caughtUp = true }: { feed: ReturnType<typeof useTeaFeed>; topic: string; emptyAction: { label: string; onPress: () => void }; burstId: string; onBurst: (id: string) => void; caughtUp?: boolean }) {
  const canAct = useCanAct();
  const { state, posts, actions, online, stale, fetchedAt } = feed;
  const now = useNow();
  const mins = fetchedAt ? Math.max(1, Math.round((now - fetchedAt) / 60_000)) : 1;
  return (
    <View style={{ gap: 12 }}>
      {!online || stale ? (
        <View style={{ gap: 4 }}>
          <OfflineBanner message={`You’re offline · showing posts from ${mins} min ago`} />
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted, paddingHorizontal: 4 }}>Votes and replies send when you’re back.</RNText>
        </View>
      ) : null}
      {state.status === 'loading' ? <SkeletonList rows={4} /> : null}
      {state.status === 'error' ? <ErrorState onRetry={state.reload} /> : null}
      {state.status === 'ready' && posts.length === 0 ? (
        <EmptyState title={topic === 'All' ? 'Nothing here yet.' : `Nothing in ${topic} yet`} body="Be the first: tap Spill it" action={emptyAction} />
      ) : null}
      {posts.map((p) => <PostCard key={p.id} post={p} actions={actions} canAct={canAct} onNeedVerify={goPending} burstId={burstId} onBurst={onBurst} />)}
      {state.status === 'ready' && posts.length > 0 && caughtUp ? (
        <View style={{ alignItems: 'center', paddingVertical: 18 }}>
          <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.ink }}>You’re all caught up</RNText>
        </View>
      ) : null}
    </View>
  );
}

const RULE: Record<string, string> = { abuse: 'it broke the rule on abuse', naming_student: 'it broke rule 2 (naming a student)' };

/** S1 cards for my moderation notices: removed (strike), appeal decided, muted. */
export function ModerationCards() {
  const api = useApi();
  const n = useAsync(() => api.tea.myModeration(), []);
  useTeaChanged(n.reload);
  const [why, setWhy] = useState(false);
  const now = useNow();
  const notices: ModerationNotice[] = useMemo(() => n.data ?? [], [n.data]);
  useEffect(() => {
    if (!notices.some((x) => x.kind === 'removed' && x.appeal === 'pending')) return;
    const id = setInterval(n.reload, 1500);
    return () => clearInterval(id);
  }, [notices, n.reload]);
  if (!notices.length) return null;
  const appealable = notices.find((x) => x.kind === 'removed' && x.appeal === 'available');
  return (
    <View style={{ gap: 10 }}>
      {notices.map((x) => {
        if (x.kind === 'muted') {
          return (
            <View key={x.id} style={{ gap: 8 }}>
              <StateCard domain="TEA" kind="err" title="Muted for 24 hours" body={`Strike ${x.strike} of 4. You can read and DM but can’t post or comment till ${untilText(x.until, now)}.`} cta={{ label: 'See why', onPress: () => setWhy((w) => !w) }} alt={appealable ? { label: 'Appeal', onPress: () => { void api.tea.appealRemoval(appealable.id).then(() => { n.reload(); }); } } : undefined} />
              {why ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted, paddingHorizontal: 4 }}>Two of your posts were removed in the last 90 days. A second strike mutes you for 24 hours. Strikes expire after 90 days.</RNText> : null}
            </View>
          );
        }
        if (x.kind === 'removed') {
          return (
            <StateCard key={x.id} domain="SAFETY" kind="err" title={`Post removed · strike ${x.strike}`}
              body={x.appeal === 'pending' ? 'Appeal sent. Bunk3d ops will decide.' : `Our safety check found ${RULE[x.rule] ?? 'it broke the rules'}. Strikes expire after 90 days.`}
              cta={x.appeal === 'available' ? { label: 'Appeal once', onPress: () => { void api.tea.appealRemoval(x.id).then(n.reload); } } : { label: 'Got it', onPress: () => { void api.tea.dismissNotice(x.id).then(n.reload); } }}
              alt={{ label: 'Rules', onPress: () => router.push('/onboarding/guidelines') }} />
          );
        }
        if (x.kind === 'appeal_decided') {
          const ok = x.outcome === 'restored';
          return (
            <StateCard key={x.id} domain="SAFETY" kind="info" title="Appeal decided" body={ok ? 'Bunk3d ops restored your post and removed the strike. Sorry about that.' : 'Bunk3d ops reviewed it and the removal stands. The strike stays.'}
              cta={ok ? { label: 'View post', onPress: () => router.push(`/post/${x.postId}`) } : { label: 'Got it', onPress: () => { void api.tea.dismissNotice(x.id).then(n.reload); } }}
              alt={ok ? { label: 'Got it', onPress: () => { void api.tea.dismissNotice(x.id).then(n.reload); } } : undefined} />
          );
        }
        return null;
      })}
    </View>
  );
}

export function PendingStateCard() {
  return <StateCard domain="TEA" kind="wait" title="Verification pending" body="You can read Tea, notices and public events. Posting, votes and DMs unlock when you’re verified." cta={{ label: 'Check status', onPress: goPending }} />;
}

export function SortSwitch({ sort, onChange }: { sort: FeedSort; onChange: (s: FeedSort) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: 14, padding: 3 }}>
      {(['hot', 'new'] as const).map((s) => (
        <Pressable key={s} accessibilityRole="tab" accessibilityLabel={s === 'hot' ? 'Hot' : 'New'} accessibilityState={{ selected: sort === s }} onPress={() => onChange(s)} style={{ minHeight: 44, minWidth: 52, paddingHorizontal: 12, borderRadius: 11, justifyContent: 'center', alignItems: 'center', backgroundColor: sort === s ? color.lime : 'transparent' }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: sort === s ? color.onLime : color.inkMuted }}>{s === 'hot' ? 'Hot' : 'New'}</RNText>
        </Pressable>
      ))}
    </View>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type Comment, type Post } from '@bunk3d/api';
import { PostCard, type PostActions } from '@/features/tea/PostCard';
import { MutedCard, PendingCard, useMyTea } from '@/features/tea/gate';
import { ago, goPending, goReport, notifyTeaChanged } from '@/features/tea/util';

// T2 Post detail.
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const my = useMyTea();
  const q = useAsync(() => api.tea.getPost(id), [id]);
  const [post, setPost] = useState<Partial<Post>>({});
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [extra, setExtra] = useState<Comment[]>([]);
  const [votes, setVotes] = useState<Record<string, { myVote: number; score: number }>>({});
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [burst, setBurst] = useState('');

  const base = q.data?.post;
  const p: Post | undefined = base ? { ...base, ...post } : undefined;
  const all = useMemo(() => [...(q.data?.comments ?? []), ...extra].map((c) => ({ ...c, ...votes[c.id] })) as Comment[], [q.data, extra, votes]);
  const roots = all.filter((c) => !c.parentId);
  const ordered = [...roots].sort((a, b) => (sort === 'top' ? b.score - a.score : b.createdAt - a.createdAt));
  const anonOk = !!my.status?.anonUnlocked;
  const canAct = my.verified;

  const actions: PostActions = {
    vote: (po, v) => { const next = po.myVote === v ? 0 : v; setPost((s) => ({ ...s, myVote: next, score: po.score + (next - po.myVote) })); void api.tea.vote(po.id, v).then(notifyTeaChanged); },
    votePoll: (po, optionId) => { void api.tea.votePoll(po.id, optionId).then((r) => { if (r.ok) setPost((s) => ({ ...s, poll: r.poll })); }); },
    save: (po) => { setPost((s) => ({ ...s, saved: !po.saved })); void api.tea.toggleSave(po.id); },
    editHeld: () => undefined,
    dismiss: () => router.back(),
  };

  const send = async () => {
    if (!p || !text.trim() || sending) return;
    setSending(true); setError('');
    const r = await api.tea.addComment(p.id, { body: text, anon: anon && anonOk, parentId: replyTo?.id });
    setSending(false);
    if (r.ok) { notifyTeaChanged(); setExtra((e) => [...e, r.comment]); setText(''); setReplyTo(null); setPost((s) => ({ ...s, comments: (s.comments ?? p.comments) + 1 })); }
    else setError(r.reason === 'muted' ? 'You’re muted right now.' : r.reason === 'not_verified' ? 'Verify to comment.' : r.reason === 'anon_locked' ? 'Anon is still locked.' : 'Write something first.');
  };
  const voteC = (c: Comment, v: 1 | -1) => {
    if (!canAct) return goPending();
    const next = c.myVote === v ? 0 : v;
    setVotes((s) => ({ ...s, [c.id]: { myVote: next, score: c.score + (next - c.myVote) } }));
    void api.tea.voteComment(c.id, v);
  };

  const row = (c: Comment, depth: number) => {
    const a = c.author;
    const name = a.kind === 'op' ? 'OP' : a.kind === 'anon' ? a.label : a.name;
    const sub = a.kind === 'named' && a.meta ? ` · ${a.meta} · ${ago(c.createdAt)}` : ` · ${ago(c.createdAt)}`;
    return (
      <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginLeft: depth * 28 }}>
        <View aria-hidden style={{ width: 30, height: 30, borderRadius: a.kind === 'named' ? 15 : 10, backgroundColor: a.kind === 'named' ? a.tint : a.kind === 'op' ? color.lime : color.anonTile, alignItems: 'center', justifyContent: 'center' }}>
          {a.kind === 'named' ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{a.initials}</RNText> : a.kind === 'op' ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime }}>OP</RNText> : <Icon name="mask" size={15} color={color.violet} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: a.kind === 'anon' ? color.anonInk : color.ink }}>{name}<RNText style={{ fontFamily: 'Inter_600SemiBold', color: color.inkMuted, fontSize: 11 }}>{sub}</RNText></RNText>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, color: color.ink }}>{c.body}</RNText>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Upvote comment, ${c.score}`} accessibilityState={{ selected: c.myVote === 1 }} onPress={() => voteC(c, 1)} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: c.myVote === 1 ? color.lime : color.inkMuted }}>▲ {c.score}</RNText>
            </Pressable>
            {depth === 0 && canAct && !my.muted ? <Pressable accessibilityRole="button" accessibilityLabel="Reply" onPress={() => setReplyTo(c)} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>Reply</RNText></Pressable> : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 }}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>Post</RNText>
        <IconButton icon="flag" label="Report or block" onPress={() => goReport(id)} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 12, gap: 14 }} keyboardShouldPersistTaps="handled">
          {q.status === 'loading' ? <SkeletonList rows={4} /> : null}
          {q.status === 'error' ? <ErrorState onRetry={q.reload} /> : null}
          {q.status === 'ready' && !p ? <EmptyState title="This post isn’t here anymore." body="It may have been removed." action={{ label: 'Back to Tea', onPress: () => router.back() }} /> : null}
          {p ? <PostCard detail post={p} actions={actions} canAct={canAct} onNeedVerify={goPending} burstId={burst} onBurst={(i) => { setBurst(i); setTimeout(() => setBurst(''), 900); }} /> : null}
          {p ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{all.length} {all.length === 1 ? 'reply' : 'replies'}</RNText>
              <Pressable accessibilityRole="button" accessibilityLabel={`Sort comments, ${sort === 'top' ? 'Top' : 'New'}`} onPress={() => setSort((s) => (s === 'top' ? 'new' : 'top'))} style={{ minHeight: 44, justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.inkMuted }}>{sort === 'top' ? 'Top' : 'New'} ▾</RNText>
              </Pressable>
            </View>
          ) : null}
          {ordered.map((c) => (
            <View key={c.id} style={{ gap: 12 }}>
              {row(c, 0)}
              {all.filter((r) => r.parentId === c.id).sort((a, b) => a.createdAt - b.createdAt).map((r) => row(r, 1))}
            </View>
          ))}
          {p && all.length === 0 && q.status === 'ready' ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted, paddingHorizontal: 4 }}>No replies yet. Add your two cents.</RNText> : null}
        </ScrollView>

        {p && p.status === 'live' ? (
          <View style={{ borderTopWidth: 1, borderTopColor: color.line, padding: 12, gap: 8, backgroundColor: color.bg }}>
            {!canAct ? <PendingCard /> : my.muted && my.mutedUntil ? <MutedCard until={my.mutedUntil} /> : (
              <>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Pill label={`As ${my.first}`} on={!anon} onPress={() => setAnon(false)} />
                  <Pill label={anonOk ? 'Anonymously' : 'Anonymously (locked)'} on={anon && anonOk} violet disabled={!anonOk} onPress={() => setAnon(true)} />
                  <RNText style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>{anon && anonOk ? 'You’ll show as an Anon number' : 'Name shown'}</RNText>
                </View>
                {!anonOk ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Anon unlocks at 20 karma and a 7-day-old account.</RNText> : null}
                {replyTo ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }} onPress={() => setReplyTo(null)}>Replying to a comment. Tap to cancel.</RNText> : null}
                {error ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.error }}>{error}</RNText> : null}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput accessibilityLabel="Write a reply" placeholder="Add your two cents" placeholderTextColor={color.inkMuted} value={text} onChangeText={setText} maxLength={1000} style={{ flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: color.surface, paddingHorizontal: 16, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 14, borderWidth: 1, borderColor: color.line }} />
                  <Pressable accessibilityRole="button" accessibilityLabel="Send reply" disabled={!text.trim() || sending} onPress={send} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? color.lime : color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="send" size={18} color={text.trim() ? color.onLime : color.inkMuted} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Pill({ label, on, onPress, violet, disabled }: { label: string; on: boolean; onPress: () => void; violet?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on, disabled: !!disabled }} onPress={disabled ? undefined : onPress} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? (violet ? color.violet : color.ink) : color.surfaceRaised, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {disabled ? <Icon name="lock" size={14} color="#5A5A64" /> : null}
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: on ? color.onLime : disabled ? '#5A5A64' : '#C9C9C3' }}>{label}</RNText>
    </Pressable>
  );
}

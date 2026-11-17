import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STORY_VIDEO_MAX_SECONDS } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession, type StoryGroup } from '@bunk3d/api';
import { MediaTile } from '@/features/tea/Media';
import { ago, goPending, useNow } from '@/features/tea/util';

const IMAGE_MS = 5000;
const REACTS = ['W', 'fr', 'no way', 'same'];

// T10 Stories. Auto-advance, hold to pause, tap sides to move. Stories are never anonymous.
export default function Stories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const session = useSession();
  const q = useAsync(() => api.tea.getStories(), []);
  if (q.status === 'loading') return <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}><View accessibilityLabel="Loading" accessibilityRole="progressbar" style={{ flex: 1 }} /></SafeAreaView>;
  if (q.status === 'error') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><ErrorState onRetry={q.reload} /></SafeAreaView>;
  const groups = q.data!;
  const start = groups.findIndex((g) => g.id === id);
  if (start < 0) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><EmptyState title="That story is gone." body="Stories disappear after 24 hours." action={{ label: 'Back to Tea', onPress: () => router.back() }} /></SafeAreaView>;
  return <Player groups={groups} start={start} verified={session?.verified === 'verified'} />;
}

function Player({ groups, start, verified }: { groups: StoryGroup[]; start: number; verified: boolean }) {
  const api = useApi();
  const now = useNow(60_000);
  const [g, setG] = useState(start);
  const [f, setF] = useState(0);
  const [t, setT] = useState(0);
  const [held, setHeld] = useState(false);
  const [reply, setReply] = useState('');
  const [sentReact, setSentReact] = useState('');
  const [votes, setVotes] = useState<Record<string, string>>({});
  const group = groups[g]!;
  const item = group.items[f]!;
  const dur = item.media.kind === 'video' ? Math.min(item.media.durationSec ?? IMAGE_MS / 1000, STORY_VIDEO_MAX_SECONDS) * 1000 : IMAGE_MS;
  const ref = useRef({ g, f });
  const tRef = useRef(0);
  useEffect(() => { ref.current = { g, f }; });

  const next = () => {
    const { g: cg, f: cf } = ref.current;
    const gr = groups[cg]!;
    setT(0); tRef.current = 0; setSentReact('');
    if (cf + 1 < gr.items.length) setF(cf + 1);
    else if (cg + 1 < groups.length) { setG(cg + 1); setF(0); } else router.back();
  };
  const prev = () => {
    const { g: cg, f: cf } = ref.current;
    setT(0); tRef.current = 0;
    if (cf > 0) setF(cf - 1); else if (cg > 0) { setG(cg - 1); setF(0); }
  };
  useEffect(() => { void api.tea.markStorySeen(group.id); }, [api, group.id]);
  useEffect(() => {
    if (held) return;
    const iv = setInterval(() => {
      tRef.current += 100;
      if (tRef.current >= dur) next(); else setT(tRef.current);
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held, g, f, dur]);

  const send = (text: string) => {
    if (!verified) return goPending();
    if (!text.trim()) return;
    void api.tea.replyToStory(item.id, text).then((r) => { if (r.ok) { setSentReact(text); setReply(''); } });
  };
  const choice = votes[item.id] ?? item.poll?.myChoice ?? null;
  const total = item.poll ? item.poll.options.reduce((a, o) => a + o.votes, 0) + (choice && !item.poll.myChoice ? 1 : 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <MediaTile media={item.media} contain playing={item.media.kind === 'video'} style={{ position: 'absolute', inset: 0 }} iconSize={64} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 8 }} accessibilityRole="progressbar" accessibilityLabel={`Story ${f + 1} of ${group.items.length}`}>
          {group.items.map((_, k) => <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}><View style={{ height: 3, width: `${k < f ? 100 : k === f ? Math.min(100, (t / dur) * 100) : 0}%`, backgroundColor: color.ink }} /></View>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, opacity: held ? 0.35 : 1 }}>
          <View aria-hidden style={{ width: 38, height: 38, borderRadius: group.club ? 12 : 19, backgroundColor: group.tint, borderWidth: 2, borderColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{group.initials}</RNText></View>
          <View style={{ flex: 1 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{group.mine ? 'Your story' : group.name}</RNText>
            <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: 'rgba(245,245,240,0.8)' }}>{ago(item.createdAt, now)} · {item.audience === 'close' ? 'CLOSE CONNECTIONS' : 'CAMPUS'}</RNText>
          </View>
          {held ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.ink }}>PAUSED</RNText> : null}
          <IconButton icon="close" label="Close stories" onPress={() => router.back()} />
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={prev} onPressIn={() => setHeld(true)} onPressOut={() => setHeld(false)} style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={next} onPressIn={() => setHeld(true)} onPressOut={() => setHeld(false)} style={{ flex: 2 }} />
        </View>

        {item.caption ? <RNText style={{ position: 'absolute', left: 20, right: 20, bottom: 130, fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.ink, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 }}>{item.caption}</RNText> : null}
        {item.poll ? (
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 150, gap: 6, backgroundColor: 'rgba(245,245,240,0.92)', borderRadius: 18, padding: 12 }}>
            {item.poll.question ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.onLime }}>{item.poll.question}</RNText> : null}
            {item.poll.options.map((o) => {
              const votesN = o.votes + (choice === o.id && !item.poll!.myChoice ? 1 : 0);
              const pct = total ? Math.round((votesN / total) * 100) : 0;
              return (
                <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={o.label} disabled={!!choice} onPress={() => { if (!verified) return goPending(); setVotes((v) => ({ ...v, [item.id]: o.id })); void api.tea.voteStoryPoll(item.id, o.id); }} style={{ minHeight: 44, borderRadius: 12, backgroundColor: '#CFCCC2', overflow: 'hidden', justifyContent: 'center' }}>
                  <View aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: choice ? `${pct}%` : 0, backgroundColor: choice === o.id ? color.lime : '#E4E1D6' }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>{o.label}</RNText><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>{choice ? `${pct}%` : ''}</RNText></View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {item.sharedPostId ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open the post" onPress={() => router.push(`/post/${item.sharedPostId}`)} style={{ position: 'absolute', left: 20, right: 20, bottom: 150, backgroundColor: 'rgba(23,23,27,0.9)', borderRadius: 18, padding: 14 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.ink }}>{group.name} · Tea</RNText>
            <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>Tap the card to open the post</RNText>
          </Pressable>
        ) : null}

        {!group.mine ? (
          <View style={{ padding: 12, gap: 8, opacity: held ? 0.35 : 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {REACTS.map((r) => (
                <Pressable key={r} accessibilityRole="button" accessibilityLabel={`React ${r}`} onPress={() => send(r)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: sentReact === r ? color.lime : 'rgba(0,0,0,0.4)' }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: sentReact === r ? color.onLime : color.ink }}>{r}</RNText>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput accessibilityLabel="Reply" placeholder={`Reply to ${group.firstName}…`} placeholderTextColor="rgba(245,245,240,0.7)" value={reply} onChangeText={setReply} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} style={{ flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(245,245,240,0.5)', paddingHorizontal: 16, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 14 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(reply)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><Icon name="send" size={18} color={color.onLime} /></Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

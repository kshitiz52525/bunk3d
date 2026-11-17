import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text as RNText, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton } from '@bunk3d/ui/native';
import { useApi, useAsync, type Post } from '@bunk3d/api';
import { MediaTile } from '@/features/tea/Media';
import { goPending, notifyTeaChanged } from '@/features/tea/util';
import { useMyTea } from '@/features/tea/gate';

// T9 Photo viewer. Opens with a scale-in; shows the original, never cropped.
// Someone else's photo can only be Sent in DMs. Only your own post can be added to your story.
export default function PhotoViewer() {
  const { id, i } = useLocalSearchParams<{ id: string; i?: string }>();
  const api = useApi();
  const my = useMyTea();
  const { width, height } = useWindowDimensions();
  const q = useAsync(() => api.tea.getPost(id), [id]);
  const [idx, setIdx] = useState(Number(i ?? 0) || 0);
  const [chrome, setChrome] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [share, setShare] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [patch, setPatch] = useState<Partial<Post>>({});
  const [storyNote, setStoryNote] = useState('');
  const [scale] = useState(() => new Animated.Value(0.92));
  const [fade] = useState(() => new Animated.Value(0));
  const last = useRef(0);
  const targets = useAsync(() => (share ? api.tea.listSendTargets() : Promise.resolve([])), [share]);

  useEffect(() => { Animated.parallel([Animated.spring(scale, { toValue: 1, useNativeDriver: false, bounciness: 4 }), Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false })]).start(); }, [scale, fade]);

  const post = q.data?.post ? { ...q.data.post, ...patch } : undefined;
  const tap = () => { const t = Date.now(); if (t - last.current < 300) { setZoom((z) => !z); setChrome(false); last.current = 0; } else { last.current = t; setTimeout(() => { if (last.current === t) { setChrome((c) => !c); last.current = 0; } }, 310); } };
  const vote = () => {
    if (!post) return;
    if (!my.verified) return goPending();
    const next = post.myVote === 1 ? 0 : 1;
    setPatch({ myVote: next, score: post.score + (next - post.myVote) });
    void api.tea.vote(post.id, 1).then(notifyTeaChanged);
  };

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: fade, transform: [{ scale }] }}>
      <SafeAreaView style={{ flex: 1 }}>
        {q.status === 'error' ? <ErrorState onRetry={q.reload} /> : null}
        {q.status === 'ready' && !post ? <EmptyState title="This photo isn’t here anymore." body="It may have been removed." action={{ label: 'Back', onPress: () => router.back() }} /> : null}
        {post ? (
          <>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: idx * width, y: 0 }} onMomentumScrollEnd={(e) => { setIdx(Math.round(e.nativeEvent.contentOffset.x / width)); setZoom(false); }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {post.media.map((m, k) => (
                <Pressable key={k} accessibilityRole="imagebutton" accessibilityLabel={`${m.alt}. Tap to show or hide controls, double-tap to zoom`} onPress={tap} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
                  <MediaTile media={m} contain playing={m.kind === 'video' && k === idx} style={{ width, height: Math.min(height, width / m.ratio), transform: [{ scale: zoom && k === idx ? 2 : 1 }], backgroundColor: '#000' }} iconSize={48} />
                </Pressable>
              ))}
            </ScrollView>
            <View pointerEvents={chrome ? 'box-none' : 'none'} style={{ flex: 1, justifyContent: 'space-between', opacity: chrome ? 1 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <IconButton icon="close" label="Close" onPress={() => router.back()} />
                <View aria-hidden style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: post.author.anon ? color.anonTile : post.author.tint, alignItems: 'center', justifyContent: 'center' }}>
                  {post.author.anon ? <Icon name="mask" size={16} color={color.violet} /> : <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{post.author.initials}</RNText>}
                </View>
                <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{post.author.anon ? 'Anonymous' : post.author.name}</RNText>
                {post.media.length > 1 ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.ink }}>{idx + 1} / {post.media.length}</RNText> : null}
              </View>
              <View style={{ gap: 10, padding: 14, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                {post.body ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, color: color.ink }}>{post.body}</RNText> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Upvote" accessibilityState={{ selected: post.myVote === 1 }} onPress={vote} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: post.myVote === 1 ? color.lime : 'rgba(31,31,37,0.85)' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: post.myVote === 1 ? color.onLime : color.ink }}>▲ {post.score}</RNText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${post.comments} comments`} onPress={() => router.back()} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: 'rgba(31,31,37,0.85)' }}>
                    <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.ink }}>{post.comments} comments</RNText>
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable accessibilityRole="button" accessibilityLabel="Send to a DM" onPress={() => (my.verified ? setShare(true) : goPending())} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: color.lime }}>
                    <Icon name="send" size={16} color={color.onLime} /><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>Send</RNText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={post.saved ? 'Unsave' : 'Save'} onPress={() => { setPatch({ saved: !post.saved }); void api.tea.toggleSave(post.id); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(31,31,37,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="bookmark" size={18} color={post.saved ? color.lime : color.ink} />
                  </Pressable>
                </View>
                {post.mine && !post.author.anon ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Add to your story" onPress={() => { void api.tea.addPostToStory(post.id).then((r) => setStoryNote(r.ok ? 'Added to your story.' : 'Couldn’t add that to your story.')); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>{storyNote || 'Add to your story'}</RNText>
                  </Pressable>
                ) : null}
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: color.inkMuted, textAlign: 'center' }}>Swipe sideways · double-tap to zoom</RNText>
              </View>
            </View>
          </>
        ) : null}
      </SafeAreaView>

      <Modal visible={share} transparent animationType="slide" onRequestClose={() => setShare(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss send sheet" onPress={() => setShare(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ backgroundColor: color.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 18, color: color.ink }}>Send to</RNText>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{post && !post.author.anon ? `${post.author.name.split(' ')[0]}’s post` : 'Post'} · opens in Tea for people at your campus</RNText>
              </View>
              <IconButton icon="close" label="Close send sheet" onPress={() => setShare(false)} />
            </View>
            {(targets.data ?? []).map((t) => {
              const done = sent.includes(t.id);
              return (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
                  <View aria-hidden style={{ width: 40, height: 40, borderRadius: t.group ? 12 : 20, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{t.initials}</RNText></View>
                  <View style={{ flex: 1 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{t.name}</RNText><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{t.meta}</RNText></View>
                  <Pressable accessibilityRole="button" accessibilityLabel={done ? `Sent to ${t.name}` : `Send to ${t.name}`} onPress={() => { if (done || !post) return; setSent((s) => [...s, t.id]); void api.tea.sendPhoto(post.id, idx, t.id); }} style={{ minHeight: 44, minWidth: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? '#26262D' : color.lime }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: done ? '#C9C9C3' : color.onLime }}>{done ? 'Sent ✓' : 'Send'}</RNText>
                  </Pressable>
                </View>
              );
            })}
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted }}>Other people’s photos can only be sent in DMs, never added to your story. Only your own posts can go to your story.</RNText>
            <Pressable accessibilityRole="button" accessibilityLabel="Open chats" onPress={() => { setShare(false); router.push({ pathname: '/dms', params: { sharePost: id } }); }} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink, textDecorationLine: 'underline' }}>Pick someone else in Chats</RNText></Pressable>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text as RNText, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { color } from '@bunk3d/ui';
import { Icon, StateCard } from '@bunk3d/ui/native';
import type { Post } from '@bunk3d/api';
import { MediaTile, feedRatio } from './Media';
import { ago, goReport, useNow } from './util';

export type PostActions = {
  vote: (p: Post, v: 1 | -1) => void;
  votePoll: (p: Post, optionId: string) => void;
  save: (p: Post) => void;
  editHeld: (p: Post) => void;
  dismiss: (p: Post) => void;
};

function Avatar({ post }: { post: Post }) {
  const a = post.author;
  if (a.anon) return <View aria-hidden style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: color.anonTile, alignItems: 'center', justifyContent: 'center' }}><Icon name="mask" size={18} color={color.violet} /></View>;
  return (
    <View aria-hidden style={{ width: 36, height: 36, borderRadius: a.club ? 12 : 18, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: a.club ? 'Unbounded_800ExtraBold' : 'Inter_800ExtraBold', fontSize: a.club ? 9 : 12, color: color.onLime }}>{a.initials}</RNText>
    </View>
  );
}

export function metaLine(p: Post, now: number): string {
  const bits: string[] = [];
  if (p.scope.type === 'community') bits.push(p.collegeName ?? 'Verified student');
  else if (!p.author.anon && p.author.meta) bits.push(p.author.meta);
  bits.push(ago(p.createdAt, now));
  bits.push(`#${p.topic}`);
  return bits.join(' · ');
}

function Burst({ show }: { show: boolean }) {
  const s = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    if (!show) return;
    s.value = withSequence(withTiming(0.4, { duration: 0 }), withSpring(1.1));
    o.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 700 }));
  }, [show, s, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return (
    <Animated.View aria-hidden pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: '50%', width: 110, height: 110, marginLeft: -55, marginTop: -55, borderRadius: 36, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', boxShadow: `6px 6px 0 ${color.violet}` }, st]}>
      <Icon name="arrowUp" size={54} color={color.onLime} stroke={3} />
    </Animated.View>
  );
}

function Carousel({ post, onOpen, onDouble, burst }: { post: Post; onOpen: (i: number) => void; onDouble: () => void; burst: boolean }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 24 - 2;
  const [i, setI] = useState(0);
  const ratio = feedRatio(post.media[0]!.ratio);
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))} style={{ width: w }}>
        {post.media.map((m, k) => (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${m.alt}. Photo ${k + 1} of ${post.media.length}. Double-tap to upvote`} onPress={() => onOpen(k)} onLongPress={onDouble} style={{ width: w }}>
            <MediaTile media={m} style={{ width: w, aspectRatio: ratio }} />
          </Pressable>
        ))}
      </ScrollView>
      <RNText style={{ position: 'absolute', right: 10, top: 10, fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.ink, backgroundColor: 'rgba(13,13,15,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, overflow: 'hidden' }}>{i + 1} / {post.media.length}</RNText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: 10 }}>
        {post.media.map((_, k) => <View key={k} aria-hidden style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === i ? color.lime : '#4A4A54' }} />)}
      </View>
      <Burst show={burst} />
    </View>
  );
}

export function PostCard({ post, actions, canAct, onNeedVerify, burstId, onBurst, detail }: { detail?: boolean; post: Post; actions: PostActions; canAct: boolean; onNeedVerify: () => void; burstId: string; onBurst: (id: string) => void }) {
  const [reveal, setReveal] = useState(false);
  const now = useNow();
  const lastTap = useRef(0);
  const open = () => { if (!detail) router.push(`/post/${post.id}`); };
  const openPhoto = (i = 0) => router.push(`/photo/${post.id}?i=${i}`);
  const like = () => { if (!canAct) return onNeedVerify(); if (post.myVote !== 1) actions.vote(post, 1); onBurst(post.id); };
  const tapMedia = (i: number) => { const t = Date.now(); if (t - lastTap.current < 320) { lastTap.current = 0; like(); } else { lastTap.current = t; setTimeout(() => { if (lastTap.current === t) { lastTap.current = 0; openPhoto(i); } }, 330); } };

  if (post.status === 'with_mods') {
    return (
      <View style={{ gap: 8 }}>
        <StateCard domain="TEA" kind="info" title="Your post is with the Mods" body="Our safety check flagged it. Two Campus Mods will look, usually within an hour." cta={{ label: 'Got it', onPress: () => actions.dismiss(post) }} alt={{ label: 'Edit post', onPress: () => actions.editHeld(post) }} />
        <Excerpt post={post} />
      </View>
    );
  }
  if (post.status === 'under_review') {
    return (
      <View style={{ gap: 8 }}>
        <StateCard domain="TEA" kind="wait" title="Under review" body="3 people reported this, so it’s hidden from Hot and New until Mods decide. Only you see it." cta={{ label: 'Guidelines', onPress: () => router.push('/onboarding/guidelines') }} />
        <Excerpt post={post} />
      </View>
    );
  }
  if (post.collapsed && !reveal) {
    return <StateCard domain="TEA" kind="empty" title="Low-rated post" body="Net −5 or lower. Collapsed for everyone." cta={{ label: 'Tap to show', onPress: () => setReveal(true) }} />;
  }

  const anon = post.author.anon;
  const named = !post.author.anon ? post.author : null;
  const hours = post.poll ? Math.max(0, Math.round((post.poll.endsAt - now) / 3_600_000)) : 0;
  const voted = post.poll?.myChoice != null;
  const v = post.myVote;
  return (
    <View accessibilityLabel={`Post by ${anon ? 'Anonymous' : named!.name}`} style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 22, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, paddingHorizontal: 14 }}>
        <Avatar post={post} />
        <Pressable accessibilityRole="button" accessibilityLabel="Open post" onPress={open} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: anon ? color.anonInk : color.ink }}>{anon ? 'Anonymous' : named!.name}</RNText>
            {named?.club ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: color.onLime, backgroundColor: color.lime, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>CLUB</RNText> : null}
          </View>
          <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>{metaLine(post, now)}</RNText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Post options" onPress={() => goReport(post.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" size={22} color={color.inkMuted} />
        </Pressable>
      </View>

      {post.body ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open post" onPress={open}>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22, color: color.ink, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 }}>{post.body}</RNText>
        </Pressable>
      ) : null}

      {post.kind === 'photo' || post.kind === 'video' ? (
        <View>
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${post.media[0]!.alt}. Double-tap to upvote`} onPress={() => tapMedia(0)}>
            <MediaTile media={post.media[0]!} style={{ width: '100%', aspectRatio: feedRatio(post.media[0]!.ratio) }} iconSize={36} />
            {post.badge ? <RNText style={{ position: 'absolute', right: 10, top: 10, fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime, backgroundColor: color.lime, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, overflow: 'hidden', transform: [{ rotate: '3deg' }] }}>{post.badge}</RNText> : null}
            <Burst show={burstId === post.id} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => openPhoto(0)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 }}>
            <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>{post.kind === 'video' ? 'Open video ›' : post.media[0]!.ratio < 0.8 ? 'Tap to see the full photo ›' : 'Open photo ›'}</RNText>
          </Pressable>
        </View>
      ) : null}
      {post.kind === 'carousel' ? <Carousel post={post} onOpen={openPhoto} onDouble={like} burst={burstId === post.id} /> : null}

      {post.poll ? (
        <View style={{ gap: 6, paddingHorizontal: 14 }}>
          {post.poll.options.map((o) => {
            const mine = post.poll!.myChoice === o.id;
            const pct = post.poll!.total ? Math.round((o.votes / post.poll!.total) * 100) : 0;
            return (
              <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: mine, disabled: voted }} disabled={voted} onPress={() => (canAct ? actions.votePoll(post, o.id) : onNeedVerify())} style={{ height: 44, borderRadius: 12, backgroundColor: color.surfaceRaised, overflow: 'hidden', justifyContent: 'center' }}>
                <View aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: voted ? `${pct}%` : 0, backgroundColor: mine ? color.lime : '#34343C' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: mine ? color.onLime : color.ink }}>{mine ? '✓ ' : ''}{o.label}</RNText>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: mine ? color.onLime : color.ink }}>{voted ? `${pct}%` : ''}</RNText>
                </View>
              </Pressable>
            );
          })}
          <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>{post.poll.total.toLocaleString('en-IN')} votes · {hours > 0 ? `${hours} h left` : 'ended'}</RNText>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: v === 1 ? color.lime : v === -1 ? '#3A1626' : color.surfaceRaised, borderRadius: 22, padding: 2 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Upvote" accessibilityState={{ selected: v === 1 }} onPress={() => (canAct ? actions.vote(post, 1) : onNeedVerify())} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrowUp" size={18} color={v === 1 ? color.onLime : color.ink} /></Pressable>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, minWidth: 28, textAlign: 'center', color: v === 1 ? color.onLime : v === -1 ? color.hot : color.ink }}>{post.score}</RNText>
          <Pressable accessibilityRole="button" accessibilityLabel="Downvote" accessibilityState={{ selected: v === -1 }} onPress={() => (canAct ? actions.vote(post, -1) : onNeedVerify())} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrowDown" size={18} color={v === 1 ? color.onLime : v === -1 ? color.hot : color.ink} /></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${post.comments} comments`} onPress={open} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.surfaceRaised, paddingHorizontal: 12, minHeight: 44, borderRadius: 22 }}>
          <Icon name="comment" size={16} color={color.ink} /><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.ink }}>{post.comments}</RNText>
        </Pressable>
        {post.eventId ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open event" onPress={() => router.push(`/event/${post.eventId}`)} style={{ backgroundColor: '#1F2410', paddingHorizontal: 12, minHeight: 44, borderRadius: 22, justifyContent: 'center' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.lime }}>Event ›</RNText>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={post.saved ? 'Unsave' : 'Save'} accessibilityState={{ selected: post.saved }} onPress={() => actions.save(post)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={18} color={post.saved ? color.lime : color.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={() => { Share.share({ message: post.body || 'A post on Bunk3d' }).catch(() => undefined); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={18} color={color.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function Excerpt({ post }: { post: Post }) {
  return post.body ? <RNText numberOfLines={3} style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted, paddingHorizontal: 4 }}>{post.body}</RNText> : null;
}

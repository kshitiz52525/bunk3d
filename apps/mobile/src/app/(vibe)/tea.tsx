import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { color } from '@bunk3d/ui';
import { Chip, Icon, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useSession, type FeedSort } from '@bunk3d/api';
import { CommunitiesList } from '@/features/tea/Communities';
import { FeedBody, ModerationCards, NewPostsPill, PendingStateCard, SortSwitch, useTeaFeed } from '@/features/tea/Feed';
import { StoriesRow } from '@/features/tea/Stories';
import { goPending } from '@/features/tea/util';

const TOPICS = ['All', 'Academics', 'Placements', 'Hostel & PG', 'Canteen', 'Events', 'Rant', 'Random'];

// T1 Feed (Campus) and T4 Communities (the switch in the title row).
export default function Tea() {
  const session = useSession();
  const chrome = useChrome();
  const head = useHeaderSpace();
  const tabs = useTabBarSpace();
  const [mode, setMode] = useState<'campus' | 'communities'>('campus');
  const [sort, setSort] = useState<FeedSort>('hot');
  const [topic, setTopic] = useState('All');
  const [burst, setBurst] = useState('');
  const [compact, setCompact] = useState(false);
  const ref = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  const verified = session?.verified === 'verified';
  const pending = !verified;
  const feed = useTeaFeed({ type: 'campus', campusId: session?.campusId ?? 'atria' }, sort, topic);
  const official = feed.state.data?.official;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { chrome.onScroll(e); const c = e.nativeEvent.contentOffset.y > 40; if (c !== compact) setCompact(c); };
  const toTop = () => { ref.current?.scrollTo({ y: 0, animated: true }); feed.state.reload(); };
  const spill = () => (verified ? router.push('/post/new') : goPending());
  const burstNow = (id: string) => { setBurst(''); setTimeout(() => setBurst(id), 0); setTimeout(() => setBurst(''), 900); };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView ref={(r) => { ref.current = r as unknown as typeof ref.current; }} onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }} contentContainerStyle={{ paddingTop: head, paddingBottom: tabs + 90, paddingHorizontal: 12, gap: 12 }}>
        {pending ? (
          <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3D2E0D', borderRadius: 14, paddingLeft: 14, paddingRight: 6, minHeight: 56 }}>
            <Icon name="clock" size={18} color="#FFD58A" />
            <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, color: '#FFD58A' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold' }}>ID under review</RNText> · usually 24 h. Read and RSVP now; posting, votes and DMs unlock after.</RNText>
            <Pressable accessibilityRole="button" accessibilityLabel="Details" onPress={goPending} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#FFD58A', textDecorationLine: 'underline' }}>Details</RNText></Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 14 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'campus' }} accessibilityLabel="Campus" onPress={() => setMode('campus')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: mode === 'campus' ? 20 : 14, letterSpacing: -0.8, color: mode === 'campus' ? color.ink : '#6E6E78' }}>Campus</RNText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'communities' }} accessibilityLabel="Communities" onPress={() => setMode('communities')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: mode === 'communities' ? 20 : 14, letterSpacing: -0.8, color: mode === 'communities' ? color.ink : '#6E6E78' }}>Communities</RNText>
            </Pressable>
          </View>
          {mode === 'campus' ? <SortSwitch sort={sort} onChange={setSort} /> : null}
        </View>

        {mode === 'communities' ? <CommunitiesList /> : (
          <>
            <StoriesRow />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 4 }} style={{ flexGrow: 0 }}>
              {TOPICS.map((t) => <Chip key={t} label={t} selected={t === topic} onPress={() => setTopic(t)} />)}
            </ScrollView>
            {official ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${official.title}. Official notice`} onPress={() => router.push('/notices')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.hot, borderRadius: 16, paddingHorizontal: 12, minHeight: 48 }}>
                <Icon name="bell" size={18} color={color.onLime} />
                <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>{official.title}</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.ink, backgroundColor: color.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' }}>Official</RNText>
              </Pressable>
            ) : null}
            {pending ? <PendingStateCard /> : null}
            <ModerationCards />
            <FeedBody feed={feed} topic={topic} burstId={burst} onBurst={burstNow} emptyAction={{ label: pending ? 'Check status' : 'Spill it', onPress: spill }} />
          </>
        )}
      </ScrollView>

      {mode === 'campus' ? <View pointerEvents="box-none" style={{ position: 'absolute', top: head, left: 0, right: 0 }}><NewPostsPill scope={{ type: 'campus', campusId: session?.campusId ?? 'atria' }} topic={topic} since={feed.fetchedAt} onPress={toTop} /></View> : null}

      {mode === 'campus' ? (
        pending ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Post after verify. Posting unlocks after verification" onPress={goPending} style={{ position: 'absolute', right: 18, bottom: tabs + 12, height: 56, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#26262D', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#5A5A64', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock" size={18} color="#C9C9C3" /><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: '#C9C9C3' }}>Post after verify</RNText>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Spill it. Create a post" onPress={spill} style={{ position: 'absolute', right: 18, bottom: tabs + 12, height: 56, minWidth: 56, paddingHorizontal: compact ? 0 : 18, width: compact ? 56 : undefined, borderRadius: 20, backgroundColor: color.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `4px 4px 0 ${color.violet}`, transform: [{ rotate: '-4deg' }] }}>
            <Icon name="plus" size={22} color={color.onLime} stroke={2.6} />
            {compact ? null : <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.onLime }}>Spill it</RNText>}
          </Pressable>
        )
      ) : null}
    </View>
  );
}

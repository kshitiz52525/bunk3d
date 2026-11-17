import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Chip, EmptyState, ErrorState, Icon, IconButton } from '@bunk3d/ui/native';
import { useApi, useAsync, type FeedSort } from '@bunk3d/api';
import { FeedBody, NewPostsPill, SortSwitch, useCanAct, useTeaFeed } from '@/features/tea/Feed';
import { compactCount, goPending } from '@/features/tea/util';

// T5 Community feed: cross-college. Every post shows the poster's college name. Campus-only posts never appear here.
export default function CommunityFeed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const c = useAsync(() => api.tea.getCommunity(id), [id]);
  const [sort, setSort] = useState<FeedSort>('hot');
  const [tag, setTag] = useState('All');
  const [burst, setBurst] = useState('');
  const feed = useTeaFeed({ type: 'community', communityId: id }, sort, tag);
  const canAct = useCanAct();
  const com = c.data;
  const post = () => router.push({ pathname: '/post/new', params: { communityId: id } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 56 }}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <SortSwitch sort={sort} onChange={setSort} />
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120, gap: 12 }}>
          {c.status === 'error' ? <ErrorState onRetry={c.reload} /> : null}
          {c.status === 'ready' && !com ? <EmptyState title="That community isn’t here." body="It may have been removed." action={{ label: 'Back', onPress: () => router.back() }} /> : null}
          {com ? (
            <View style={{ gap: 4, paddingHorizontal: 4 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.lime }}>COMMUNITY · {com.colleges} COLLEGES · {compactCount(com.members)}</RNText>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, letterSpacing: -0.8, color: color.ink }}>{com.name}</RNText>
              {!com.joined ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Join ${com.name}`} onPress={() => (canAct ? void api.tea.setCommunityMembership(id, true).then(() => { c.reload(); feed.state.reload(); }) : goPending())} style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: color.lime, justifyContent: 'center', marginTop: 6 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>Join</RNText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {com ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 4 }} style={{ flexGrow: 0 }}>
              {['All', ...com.tags].map((t) => <Chip key={t} label={t} selected={t === tag} onPress={() => setTag(t)} />)}
            </ScrollView>
          ) : null}
          {com && !com.joined ? <PendingOrJoin /> : null}
          {com?.joined ? <FeedBody feed={feed} topic={tag} burstId={burst} onBurst={(i) => { setBurst(i); setTimeout(() => setBurst(''), 900); }} emptyAction={{ label: 'Post in this community', onPress: post }} /> : null}
        </ScrollView>
        {com?.joined ? <NewPostsPill scope={{ type: 'community', communityId: id }} topic={tag} since={feed.fetchedAt} onPress={feed.state.reload} /> : null}
        {com?.joined ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Post in this community" onPress={post} style={{ position: 'absolute', right: 18, bottom: 24, width: 56, height: 56, borderRadius: 20, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', boxShadow: `4px 4px 0 ${color.violet}`, transform: [{ rotate: '-4deg' }] }}>
            <Icon name="plus" size={24} color={color.onLime} stroke={2.6} />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function PendingOrJoin() {
  return <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted, paddingHorizontal: 4 }}>Join to see posts from students at other colleges.</RNText>;
}

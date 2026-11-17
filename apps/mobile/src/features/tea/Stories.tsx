import { router } from 'expo-router';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { Icon } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession } from '@bunk3d/api';
import { MediaTile } from './Media';
import { goPending } from './util';

/** Stories row: your story first, then people on your campus. Unseen rings are lime. */
export function StoriesRow() {
  const api = useApi();
  const session = useSession();
  const verified = session?.verified === 'verified';
  const groups = useAsync(() => api.tea.getStories(), []);
  const list = groups.data ?? [];
  const mine = list.find((g) => g.mine);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 2 }} style={{ flexGrow: 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={mine ? 'Add to your story' : 'Your story. Add a photo or video'} onPress={() => (verified ? router.push('/post/photo?mode=story') : goPending())} style={{ alignItems: 'center', gap: 4, minWidth: 60 }}>
        <View style={{ width: 54, height: 54, borderRadius: 19, borderWidth: 2, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={color.lime} /></View>
        <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9C9C3' }}>Your story</RNText>
      </Pressable>
      {list.map((g) => (
        <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.mine ? 'Your story' : g.name}${g.seen ? '' : ', new'}`} onPress={() => router.push(`/stories/${g.id}`)} style={{ alignItems: 'center', gap: 4, minWidth: 60 }}>
          <View style={{ width: 54, height: 54, borderRadius: 19, padding: 3, backgroundColor: g.seen ? '#33333B' : color.lime }}>
            <MediaTile media={g.items[0]!.media} style={{ flex: 1, borderRadius: 16, borderWidth: 2, borderColor: color.bg }} iconSize={16} />
          </View>
          <RNText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: g.seen ? color.inkMuted : color.ink, maxWidth: 64 }}>{g.mine ? 'You' : g.firstName}</RNText>
        </Pressable>
      ))}
      {groups.status === 'loading' ? <View aria-hidden style={{ width: 54, height: 54, borderRadius: 19, backgroundColor: color.surfaceRaised }} /> : null}
    </ScrollView>
  );
}

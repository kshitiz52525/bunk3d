import { router } from 'expo-router';
import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type Community } from '@bunk3d/api';
import { compactCount, goPending } from './util';
import { useCanAct } from './Feed';

function Row({ c, onJoin }: { c: Community; onJoin?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 20, minHeight: 72 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${c.name}, ${c.colleges} colleges`} onPress={() => router.push(`/community/${c.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View aria-hidden style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}><Icon name="users" size={22} color={color.onLime} /></View>
        <View style={{ flex: 1 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{c.name}</RNText>
          <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{c.colleges} colleges{c.joined && c.newPosts ? ` · ${c.newPosts} new` : ` · ${compactCount(c.members)}`}</RNText>
        </View>
        {onJoin ? null : <Icon name="chevronRight" size={18} color={color.inkMuted} />}
      </Pressable>
      {onJoin ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Join ${c.name}`} onPress={onJoin} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.lime, justifyContent: 'center', marginRight: 14 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>Join</RNText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** T4: cross-college communities. */
export function CommunitiesList() {
  const api = useApi();
  const canAct = useCanAct();
  const q = useAsync(() => api.tea.listCommunities(), []);
  const label = (t: string) => <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted, paddingHorizontal: 4 }}>{t}</RNText>;
  return (
    <View style={{ gap: 10 }}>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted, paddingHorizontal: 4 }}>Cross-campus topics. Campus-only posts never show up here.</RNText>
      {q.status === 'loading' ? <SkeletonList rows={3} /> : null}
      {q.status === 'error' ? <ErrorState onRetry={q.reload} /> : null}
      {q.status === 'ready' && q.data.joined.length + q.data.discover.length === 0 ? <EmptyState title="No communities yet." body="Check back soon." action={{ label: 'Try again', onPress: q.reload }} /> : null}
      {q.status === 'ready' && q.data.joined.length ? (<>{label('JOINED')}{q.data.joined.map((c) => <Row key={c.id} c={c} />)}</>) : null}
      {q.status === 'ready' && q.data.discover.length ? (<>{label('DISCOVER')}{q.data.discover.map((c) => <Row key={c.id} c={c} onJoin={() => (canAct ? void api.tea.setCommunityMembership(c.id, true).then(q.reload) : goPending())} />)}</>) : null}
    </View>
  );
}

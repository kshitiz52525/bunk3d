import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { useApi, useAsync, type NoticeKind } from '@bunk3d/api';
import { AsyncBody, ago, Pill, TopBar } from '@/features/you/ui';

const FILTERS: ('All' | NoticeKind)[] = ['All', 'College', 'Clubs'];

/** X1 Notices. Official notices from the college and clubs you follow; urgent ones are marked. */
export default function Notices() {
  const api = useApi();
  const [filter, setFilter] = useState<'All' | NoticeKind>('All');
  const list = useAsync(() => api.you.notices(filter), [filter]);
  const read = async (id: string) => { await api.you.markNoticeRead(id); list.reload(); };
  const readAll = async () => { await api.you.markAllNoticesRead(); list.reload(); };
  const unread = list.data?.some((n) => !n.read) ?? false;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <TopBar
          title="Notices"
          right={unread ? <Pressable accessibilityRole="button" accessibilityLabel="Mark all read" onPress={readAll} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>Mark all read</RNText></Pressable> : undefined}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
          {FILTERS.map((f) => <Pill key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}
        </View>
        <View style={{ gap: 8 }}>
          <AsyncBody state={list} empty={{ when: (d) => d.length === 0, title: filter === 'All' ? 'No notices yet.' : `No ${filter.toLowerCase()} notices.`, body: 'Official updates from your college and the clubs you follow show up here.', action: { label: 'Browse clubs', onPress: () => router.push('/crew') } }}>
            {(items) => items.map((n) => (
              <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={`${n.urgent ? 'Urgent. ' : ''}${n.from}. ${n.title}`} onPress={() => !n.read && read(n.id)} style={{ gap: 6, backgroundColor: n.read ? '#111114' : color.surface, borderRadius: 16, borderWidth: 1, borderColor: n.read ? '#1C1C21' : n.urgent ? color.hot : '#2E2E36', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View aria-hidden style={{ minWidth: 38, height: 38, paddingHorizontal: 4, borderRadius: 12, backgroundColor: n.kind === 'College' ? color.ink : color.lime, alignItems: 'center', justifyContent: 'center' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{n.short}</RNText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>{n.from}</RNText>
                      <View style={{ backgroundColor: n.badge === 'OFFICIAL' ? color.ink : color.lime, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: color.onLime }}>{n.badge === 'CLUB' ? '✓ CLUB' : 'OFFICIAL'}</RNText></View>
                    </View>
                    <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{ago(n.at)}</RNText>
                  </View>
                  {!n.read ? <View accessibilityLabel="Unread" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.lime }} /> : null}
                </View>
                {n.urgent ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.hot }}>URGENT</RNText> : null}
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: n.read ? '#C9C9C3' : color.ink }}>{n.title}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted }}>{n.body}</RNText>
              </Pressable>
            ))}
          </AsyncBody>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

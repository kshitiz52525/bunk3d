import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type SearchResult, type SearchType } from '@bunk3d/api';
import { Pill } from '@/features/you/ui';

const TYPES: SearchType[] = ['All', 'Posts', 'Notes', 'Events', 'Clubs'];

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<RNText style={{ backgroundColor: color.lime, color: color.onLime }}>{text.slice(i, i + q.length)}</RNText>{text.slice(i + q.length)}</>;
}

function Group({ title, total, items, q }: { title: string; total: number; items: SearchResult[]; q: string }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted }}>{title}</RNText>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.inkMuted }}>{total}</RNText>
      </View>
      {items.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.meta}`} onPress={() => router.push(r.href as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 }}>
          <View aria-hidden style={{ minWidth: 44, height: 40, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#26262D', alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.ink }}>{r.tile}</RNText></View>
          <View style={{ flex: 1 }}>
            <RNText numberOfLines={2} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}><Highlight text={r.title} q={q} /></RNText>
            <RNText numberOfLines={1} style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{r.meta}</RNText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** X2 Search across posts, notes, events and clubs. */
export default function Search() {
  const api = useApi();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<SearchType>('All');
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 250); return () => clearTimeout(t); }, [text]);
  const r = useAsync(() => api.you.search(q, type), [q, type]);
  const d = r.data;
  const total = d ? d.notes.length + d.posts.length + d.events.length + (type === 'All' ? 0 : d.clubs.length) : 0;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: '#2E2E36' }}>
          <Icon name="search" size={18} color={color.inkMuted} />
          <TextInput autoFocus accessibilityLabel="Search posts, notes, events, clubs" placeholder="Search posts, notes, events, clubs" placeholderTextColor={color.inkMuted} value={text} onChangeText={setText} returnKeyType="search" style={{ flex: 1, color: color.ink, fontFamily: 'Inter_600SemiBold', fontSize: 15 }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => (router.canGoBack() ? router.back() : router.replace('/tea'))} style={{ minHeight: 44, justifyContent: 'center' }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Cancel</RNText>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10, flexWrap: 'wrap' }}>
          {TYPES.map((t) => <Pill key={t} label={t} selected={type === t} onPress={() => setType(t)} />)}
        </View>
        {!q ? <EmptyState title="Search your campus." body="Posts, notes, events and clubs, all in one place." action={{ label: 'Browse The Crew', onPress: () => router.push('/crew') }} /> : null}
        {q && r.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {q && r.status === 'error' ? <ErrorState onRetry={r.reload} /> : null}
        {q && d ? (
          <View>
            <Group title="NOTES" total={d.notesTotal} items={d.notes} q={q} />
            <Group title="POSTS" total={d.postsTotal} items={d.posts} q={q} />
            <Group title="EVENTS" total={d.eventsTotal} items={d.events} q={q} />
            {type !== 'All' ? <Group title="CLUBS" total={d.clubsTotal} items={d.clubs} q={q} /> : null}
            {type === 'Clubs' && d.clubs.length === 0 ? <EmptyState title={`No clubs match “${q}”`} body="Try “tech” or browse The Crew" action={{ label: 'Browse The Crew', onPress: () => router.push('/crew') }} /> : null}
            {total === 0 && type !== 'Clubs' ? <EmptyState title={`Nothing for “${q}”`} body="Check the spelling or try fewer words." action={{ label: 'Clear search', onPress: () => setText('') }} /> : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

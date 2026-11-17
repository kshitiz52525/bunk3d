import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, OfflineBanner, SkeletonList, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync, type Subject } from '@bunk3d/api';
import { NoteRow, StudyTabs } from '@/features/study/parts';
import { Pill } from '@/features/poppin/ui';
import { ago, useCachedAsync } from '@/features/poppin/cache';

// N1 Notes home. K1-K3 (wave 2) are the other chips and open as their own routes.
function SubjectTile({ s, i, onPress }: { s: Subject; i: number; onPress: () => void }) {
  const lime = s.tint === 'lime';
  const violet = s.tint === 'violet';
  const bg = lime ? color.lime : violet ? color.violet : color.surface;
  const ink = lime || violet ? color.onLime : color.ink;
  const sub = lime || violet ? color.onLime : color.inkMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${s.short}, ${s.code}, ${s.noteCount} notes, ${s.pyqCount} PYQs`}
      onPress={onPress}
      style={{ flexBasis: '48%', flexGrow: 1, minHeight: 100, backgroundColor: bg, borderRadius: 18, padding: 14, borderWidth: lime || violet ? 0 : 1, borderColor: color.line, transform: [{ rotate: lime ? '-1.5deg' : violet ? '1.5deg' : '0deg' }] }}
    >
      <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 18, letterSpacing: -0.5, color: ink }}>{s.short}</RNText>
      <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: sub, marginTop: 2 }}>{s.code}</RNText>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: ink, marginTop: 14 }}>{s.noteCount} notes · {s.pyqCount} PYQs</RNText>
    </Pressable>
  );
}

export default function Study() {
  const api = useApi();
  const { onScroll } = useChrome();
  const top = useHeaderSpace();
  const bottom = useTabBarSpace();
  const home = useCachedAsync('study.home', () => api.study.home(), []);
  const [editing, setEditing] = useState(false);
  const all = useAsync(() => (editing ? api.study.subjects() : Promise.resolve(null)), [editing]);

  const body = () => {
    if (home.status === 'loading') return <SkeletonList rows={5} />;
    if (home.status === 'error') return <ErrorState onRetry={home.reload} />;
    const h = home.data;
    return (
      <View>
        {home.offlineSince ? <OfflineBanner message={`offline · showing notes from ${ago(home.offlineSince)}`} /> : null}
        <Pressable accessibilityRole="search" accessibilityLabel="Search notes" onPress={() => router.push('/search')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 12, paddingHorizontal: 14, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16 }}>
          <Icon name="search" size={18} color={color.inkMuted} />
          <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.inkMuted }}>Search “DBMS PYQ 2024”</RNText>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
          <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>My subjects · {h.semLabel}</RNText>
          <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Done editing subjects' : 'Edit my subjects'} onPress={() => setEditing((v) => !v)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>{editing ? 'Done' : 'Edit'}</RNText>
          </Pressable>
        </View>
        {editing ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(all.data ?? []).map((s) => (
              <Pill key={s.id} label={`${s.short} · ${s.code}`} active={s.isMine} onPress={async () => { await api.study.setMySubject(s.id, !s.isMine); all.reload(); home.reload(); }} />
            ))}
          </View>
        ) : h.mySubjects.length === 0 ? (
          <EmptyState title="No subjects yet." body="Pick your subjects to see their notes and PYQs." action={{ label: 'Edit subjects', onPress: () => setEditing(true) }} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {h.mySubjects.map((s, i) => <SubjectTile key={s.id} s={s} i={i} onPress={() => router.push(`/subject/${s.id}`)} />)}
          </View>
        )}
        <View style={{ marginTop: 18, marginBottom: 10 }}>
          <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>Trending this week</RNText>
        </View>
        {h.trending.length === 0 ? (
          <EmptyState title="Nothing here yet." body="Be the first upload. Every save earns you +2 karma." action={{ label: 'Upload notes', onPress: () => router.push('/upload-note') }} />
        ) : (
          <View style={{ gap: 8 }}>{h.trending.map((n) => <NoteRow key={n.id} n={n} trendingViews />)}</View>
        )}
      </View>
    );
  };

  const examDays = home.status === 'ready' ? home.data.examInDays : null;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top, paddingBottom: bottom + 70, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, letterSpacing: -1, color: color.ink }}>Study</RNText>
          {examDays !== null ? (
            <RNText style={{ backgroundColor: color.violet, color: color.onLime, fontFamily: 'Inter_800ExtraBold', fontSize: 11, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, overflow: 'hidden', transform: [{ rotate: '4deg' }] }}>exam szn: {examDays} day{examDays === 1 ? '' : 's'}</RNText>
          ) : null}
        </View>
        <View style={{ marginTop: 12 }}><StudyTabs active="notes" /></View>
        {body()}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upload note"
        onPress={() => router.push('/upload-note')}
        style={{ position: 'absolute', right: 16, bottom: bottom + 12, width: 56, height: 56, borderRadius: 18, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', boxShadow: `4px 4px 0 ${color.violet}` }}
      >
        <Icon name="plus" size={26} color={color.onLime} stroke={3} />
      </Pressable>
    </View>
  );
}

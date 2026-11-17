import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type NoteKind } from '@bunk3d/api';
import { NoteRow } from '@/features/study/parts';
import { Pill } from '@/features/poppin/ui';
import { ago, useCachedAsync } from '@/features/poppin/cache';

// N2 Subject (Notes / PYQs).
export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const [kind, setKind] = useState<NoteKind>('pyq');
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [unit, setUnit] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const subject = useAsync(() => api.study.getSubject(id), [id]);
  const list = useCachedAsync(`study.subject.${id}.${kind}.${sort}.${unit ?? 'all'}.${year ?? 'all'}`, () => api.study.listNotes({ subjectId: id, kind, sort, unit, examYear: year }), [id, kind, sort, unit, year]);
  const s = subject.data;

  const mine = async () => { if (s) { await api.study.setMySubject(s.id, !s.isMine); subject.reload(); } };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ backgroundColor: color.lime, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={22} color={color.lime} />
          </Pressable>
          {s ? (
            <Pressable accessibilityRole="button" accessibilityLabel={s.isMine ? 'Remove from my subjects' : 'Add to my subjects'} accessibilityState={{ selected: s.isMine }} onPress={mine} style={{ borderWidth: 2, borderColor: color.bg, borderRadius: 18, minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.onLime }}>{s.isMine ? '★ My subject' : '☆ Add to my subjects'}</RNText>
            </Pressable>
          ) : null}
        </View>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: 1, color: color.onLime, marginTop: 14 }}>{s ? `${s.code} · SEM ${s.sem} · ${s.branch}` : ' '}</RNText>
        <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 26, letterSpacing: -1, lineHeight: 28, color: color.onLime, marginTop: 2 }}>{s ? s.name : ' '}</RNText>
      </View>
      <View style={{ flexDirection: 'row', gap: 20, paddingHorizontal: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: '#222228' }}>
        {([['note', `Notes${s ? ` · ${s.noteCount}` : ''}`], ['pyq', `PYQs${s ? ` · ${s.pyqCount}` : ''}`]] as const).map(([k, label]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: kind === k }} onPress={() => { setKind(k); setUnit(undefined); setYear(undefined); }} style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: kind === k ? color.lime : 'transparent' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: kind === k ? color.ink : color.inkMuted }}>{label}</RNText>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 6 }} style={{ flexGrow: 0 }}>
          {kind === 'pyq'
            ? [undefined, 2024, 2023, 2022].map((y) => <Pill key={String(y)} label={y ? `Exam year: ${y}` : 'Exam year: All'} active={year === y} onPress={() => setYear(y)} />)
            : [undefined, 1, 2, 3, 4, 5].map((u) => <Pill key={String(u)} label={u ? `Unit ${u}` : 'Unit: All'} active={unit === u} onPress={() => setUnit(u)} />)}
          <Pill label="Top" active={sort === 'top'} tone="lime" onPress={() => setSort('top')} />
          <Pill label="New" active={sort === 'new'} tone="lime" onPress={() => setSort('new')} />
        </ScrollView>
        {list.status === 'loading' ? <SkeletonList rows={5} /> : null}
        {list.status === 'error' ? <ErrorState onRetry={list.reload} /> : null}
        {list.status === 'ready' ? (
          <>
            {list.offlineSince ? <OfflineBanner message={`offline · showing notes from ${ago(list.offlineSince)}`} /> : null}
            {list.data.length === 0 ? (
              <EmptyState title={`No ${kind === 'pyq' ? 'PYQs' : 'notes'} for ${s?.short ?? 'this subject'} yet`} body="Be the first upload. Every save earns you +2 karma." action={{ label: kind === 'pyq' ? 'Upload a PYQ' : 'Upload notes', onPress: () => router.push('/upload-note') }} />
            ) : (
              list.data.map((n) => <NoteRow key={n.id} n={n} />)
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

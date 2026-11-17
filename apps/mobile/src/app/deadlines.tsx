import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, Input, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { DEADLINE_TYPES, type DeadlineType } from '@bunk3d/core';
import { useApi, type Deadline } from '@bunk3d/api';
import { Pill, RouteFrame } from '@/features/poppin/ui';
import { StudyTabs } from '@/features/study/parts';
import { mon, dayNum } from '@/features/poppin/format';
import { ago, useCachedAsync } from '@/features/poppin/cache';

// K3 Deadlines (wave 2): added by classmates, confirmed by upvotes. Unconfirmed ones show dashed.
const TYPE_COLOR: Record<DeadlineType, string> = { ASSIGNMENT: color.info, INTERNAL: color.success, EXAM: color.warning, FEES: color.violet };
const DAY = 86_400_000;

function parseDate(s: string): number | null {
  const m = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59);
  return d.getMonth() === Number(m[2]) - 1 ? d.getTime() : null;
}

export default function Deadlines() {
  const api = useApi();
  const list = useCachedAsync('study.deadlines', () => api.study.deadlines(), []);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [meta, setMeta] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<DeadlineType>('ASSIGNMENT');
  const [err, setErr] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const confirm = async (d: Deadline) => {
    setErr(null);
    try { await api.study.confirmDeadline(d.id); list.reload(); } catch (e) { setErr(e instanceof Error && e.message === 'verify_required' ? 'Confirming unlocks after verification.' : 'Couldn’t send that. Try again.'); }
  };
  const add = async () => {
    const due = parseDate(date);
    if (!title.trim() || due === null) { setErr('Add a title and a date like 29 / 10 / 2026.'); return; }
    setErr(null);
    try {
      await api.study.addDeadline({ type, title, meta, dueAt: due });
      setAdding(false); setTitle(''); setMeta(''); setDate('');
      list.reload();
    } catch (e) { setErr(e instanceof Error && e.message === 'verify_required' ? 'Adding unlocks after verification.' : 'Couldn’t add that. Try again.'); }
  };

  return (
    <RouteFrame title="Study">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }} keyboardShouldPersistTaps="handled">
        <StudyTabs active="deadlines" />
        <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>Added by classmates, confirmed by upvotes</RNText>
        {list.status === 'loading' ? <SkeletonList rows={5} /> : null}
        {list.status === 'error' ? <ErrorState onRetry={list.reload} /> : null}
        {list.status === 'ready' && list.offlineSince ? <OfflineBanner message={`offline · showing deadlines from ${ago(list.offlineSince)}`} /> : null}
        {err ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>{err}</RNText> : null}
        {list.status === 'ready' && list.data.length === 0 ? <EmptyState title="No deadlines yet." body="Add the first one for your section." action={{ label: 'Add a deadline', onPress: () => setAdding(true) }} /> : null}
        {list.status === 'ready' ? list.data.map((d, i) => {
          const urgent = i === 0 && d.dueAt - now < 2 * DAY && d.dueAt > now;
          return (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: d.confirmed ? color.line : '#4A4A54', borderStyle: d.confirmed ? 'solid' : 'dashed', borderRadius: 16, padding: 12 }}>
              <View style={{ width: 48, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: urgent ? color.hot : color.line }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: urgent ? color.onLime : color.inkMuted }}>{mon(d.dueAt)}</RNText>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: urgent ? color.onLime : color.ink }}>{dayNum(d.dueAt)}</RNText>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: TYPE_COLOR[d.type] }}>{d.type}{d.confirmed ? '' : ' · UNCONFIRMED'}</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{d.title}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{d.meta}</RNText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Confirm this deadline, ${d.votes} confirmations`} accessibilityState={{ selected: d.confirmedByMe }} onPress={() => confirm(d)} style={{ minWidth: 56, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: d.confirmedByMe ? color.lime : '#3A3A42', backgroundColor: d.confirmedByMe ? color.lime : 'transparent' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: d.confirmedByMe ? color.onLime : color.ink }}>▲ {d.votes}</RNText>
              </Pressable>
            </View>
          );
        }) : null}
        <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Reminders 1 day and 1 hour before. Unconfirmed ones show dashed.</RNText>
        {adding ? (
          <View style={{ backgroundColor: color.surface, borderColor: color.lime, borderWidth: 1.5, borderRadius: 16, padding: 12, gap: 10 }}>
            <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Add a deadline</RNText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DEADLINE_TYPES.map((t) => <Pill key={t} label={t} active={type === t} onPress={() => setType(t)} />)}
            </View>
            <Input label="Title" value={title} onChangeText={setTitle} placeholder="OS Assignment 3" maxLength={80} />
            <Input label="Details" value={meta} onChangeText={setMeta} placeholder="Upload on LMS · 11:59 PM" maxLength={80} />
            <Input label="Due date" value={date} onChangeText={setDate} placeholder="DD / MM / YYYY" keyboardType="numbers-and-punctuation" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Add deadline" onPress={add} style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.onLime }}>Add deadline</RNText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => { setAdding(false); setErr(null); }} style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Cancel</RNText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
      {!adding ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add a deadline" onPress={() => setAdding(true)} style={{ position: 'absolute', right: 16, bottom: 24, width: 56, height: 56, borderRadius: 18, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', boxShadow: `4px 4px 0 ${color.violet}` }}>
          <Icon name="plus" size={26} color={color.onLime} stroke={3} />
        </Pressable>
      ) : null}
    </RouteFrame>
  );
}

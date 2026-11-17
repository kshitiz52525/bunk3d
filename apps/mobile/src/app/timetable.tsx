import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, SkeletonList, OfflineBanner } from '@bunk3d/ui/native';
import { useApi } from '@bunk3d/api';
import { RouteFrame } from '@/features/poppin/ui';
import { StudyTabs } from '@/features/study/parts';
import { ago, useCachedAsync } from '@/features/poppin/cache';

// K1 Timetable (wave 2).
export default function Timetable() {
  const api = useApi();
  const tt = useCachedAsync('study.timetable', () => api.study.myTimetable(), []);
  const [d, setD] = useState(() => Math.min(5, (new Date().getDay() + 6) % 7));
  const t = tt.status === 'ready' ? tt.data : null;
  const day = t ? t.days[d] : null;
  const toggle = async () => {
    if (!t) return;
    await api.study.setTimetableReminders(!t.remindersOn);
    tt.reload();
  };
  return (
    <RouteFrame title="Study">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}>
        <StudyTabs active="timetable" />
        {tt.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {tt.status === 'error' ? <ErrorState onRetry={tt.reload} /> : null}
        {tt.status === 'ready' && tt.offlineSince ? <OfflineBanner message={`offline · showing your timetable from ${ago(tt.offlineSince)}`} /> : null}
        {tt.status === 'ready' && !t ? (
          <EmptyState title="No timetable yet." body="Adopt your section’s timetable and get a reminder before each class." action={{ label: 'Find my section', onPress: async () => { const all = await api.study.timetables(); if (all[0]) { await api.study.adoptTimetable(all[0].id); tt.reload(); } } }} />
        ) : null}
        {t && day ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 }}>
              <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, color: '#C9C9C3' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.ink }}>{t.name}</RNText> · made by {t.madeBy} · adopted by {t.adoptedBy} classmates</RNText>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.lime }}>{t.adopted ? 'Adopted ✓' : 'Not adopted'}</RNText>
            </View>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6 }}>
              {t.days.map((x, i) => (
                <Pressable key={x.label} accessibilityRole="tab" accessibilityLabel={`${x.label} ${x.date}`} accessibilityState={{ selected: i === d }} onPress={() => setD(i)} style={{ flex: 1, minHeight: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: i === d ? color.lime : color.surface }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: i === d ? color.onLime : color.inkMuted }}>{x.label}</RNText>
                  <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 14, color: i === d ? color.onLime : color.ink }}>{x.date}</RNText>
                </Pressable>
              ))}
            </View>
            {day.classes.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12 }}>
                <View style={{ width: 52 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{c.start}</RNText>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{c.end}</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{c.subject}</RNText>
                    {c.tag ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime, backgroundColor: color.info, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, overflow: 'hidden' }}>{c.tag}</RNText> : null}
                  </View>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{c.room}</RNText>
                </View>
              </View>
            ))}
            {day.classes.length === 0 ? <EmptyState title="No classes this day." body="Enjoy it." action={{ label: 'Back to Monday', onPress: () => setD(0) }} /> : null}
            <Pressable accessibilityRole="switch" accessibilityLabel="Reminder 10 min before each class" accessibilityState={{ checked: t.remindersOn }} onPress={toggle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, borderRadius: 14, backgroundColor: color.surface, paddingHorizontal: 14 }}>
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.ink }}>Reminder 10 min before each class</RNText>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: t.remindersOn ? color.success : color.inkMuted }}>{t.remindersOn ? 'On' : 'Off'}</RNText>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </RouteFrame>
  );
}

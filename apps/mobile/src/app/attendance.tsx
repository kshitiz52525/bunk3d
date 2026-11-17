import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { ATTENDANCE_MIN_PCT, type AttendanceSummary } from '@bunk3d/core';
import { useApi } from '@bunk3d/api';
import { RouteFrame } from '@/features/poppin/ui';
import { StudyTabs } from '@/features/study/parts';
import { ago, useCachedAsync } from '@/features/poppin/cache';

// K2 Attendance (wave 2). A personal tracker with a 75% rule, not the college register.
const STATUS_COLOR = { safe: color.success, warn: color.warning, low: color.error } as const;
function message(s: AttendanceSummary) {
  if (s.status === 'low') return `Attend next ${s.needToRecover} to get back to ${ATTENDANCE_MIN_PCT}%`;
  return s.canMiss > 0 ? `You can miss ${s.canMiss} more` : 'Don’t miss the next one';
}

export default function Attendance() {
  const api = useApi();
  const a = useCachedAsync('study.attendance', () => api.study.attendance(), []);
  const [live, setLive] = useState<typeof a.data>();
  const data = live ?? (a.status === 'ready' ? a.data : undefined);
  const mark = async (slotId: string, m: 'present' | 'absent') => setLive(await api.study.markAttendance(slotId, m));
  return (
    <RouteFrame title="Study">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}>
        <StudyTabs active="attendance" />
        {a.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {a.status === 'error' ? <ErrorState onRetry={a.reload} /> : null}
        {a.status === 'ready' && a.offlineSince ? <OfflineBanner message={`offline · showing attendance from ${ago(a.offlineSince)}`} /> : null}
        {data ? (
          <>
            <View style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>MARK TODAY · {data.dateLabel}</RNText>
              {data.today.length === 0 ? <EmptyState title="No classes to mark today." body="Your timetable has nothing for today." action={{ label: 'Refresh', onPress: () => { setLive(undefined); a.reload(); } }} /> : null}
              {data.today.map((t) => (
                <View key={t.slotId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{t.label}</RNText>
                  {(['present', 'absent'] as const).map((m) => {
                    const on = t.mark === m;
                    const c = m === 'present' ? color.success : color.error;
                    return (
                      <Pressable key={m} accessibilityRole="button" accessibilityLabel={`${m === 'present' ? 'Present' : 'Absent'} for ${t.label}`} accessibilityState={{ selected: on }} onPress={() => mark(t.slotId, m)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: on ? c : '#3A3A42', backgroundColor: on ? c : 'transparent' }}>
                        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: on ? color.onLime : color.ink }}>{m === 'present' ? 'Present' : 'Absent'}</RNText>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>THE {ATTENDANCE_MIN_PCT}% RULE</RNText>
            {data.subjects.map((s) => {
              const c = STATUS_COLOR[s.status];
              return (
                <View key={s.id} accessibilityLabel={`${s.name}, ${s.pct} percent, ${s.attended} of ${s.total} classes. ${message(s)}`} style={{ backgroundColor: color.surface, borderColor: s.status === 'low' ? color.error : color.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{s.name}</RNText>
                    <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: c }}>{s.pct}%</RNText>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: color.line }}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: c, width: `${Math.min(100, s.pct)}%` }} />
                    <View style={{ position: 'absolute', left: `${ATTENDANCE_MIN_PCT}%`, top: -2, width: 2, height: 12, backgroundColor: color.ink }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{s.attended} of {s.total} classes</RNText>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: c }}>{message(s)}</RNText>
                  </View>
                </View>
              );
            })}
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Only you see this. It’s your own tracker, not the college register.</RNText>
          </>
        ) : null}
      </ScrollView>
    </RouteFrame>
  );
}

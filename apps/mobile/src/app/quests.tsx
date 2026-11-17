import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { questPercent } from '@bunk3d/core';
import { EmptyState, ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type Quest } from '@bunk3d/api';
import { BackBar, T, Tag, fmtShortDate } from '@/features/crew/parts';

/** C6 Side Quests (wave 2). Quests score clubs, never individual people. */
export default function Quests() {
  const api = useApi();
  const state = useAsync(() => api.crew.listQuests(), []);
  const [msg, setMsg] = useState<string | null>(null);

  async function enroll(q: Quest) {
    await api.crew.enrollQuest(q.id);
    state.reload();
  }
  async function submit(id: string) {
    const r = await api.crew.submitQuestMilestone(id);
    setMsg(r.ok ? 'Milestone submitted for review.' : 'Not there yet. Reach the check-in target first.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <BackBar title="Side Quests" right={
        <Pressable accessibilityRole="link" accessibilityLabel="Clout Board" onPress={() => router.push('/clout')} style={{ minHeight: 44, justifyContent: 'center' }}><T size={13} f="bold" c={color.lime}>Clout Board ›</T></Pressable>
      } />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {state.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {state.status === 'error' ? <ErrorState onRetry={state.reload} /> : null}
        {state.status === 'ready' ? (
          <>
            {state.data.active ? (() => {
              const a = state.data.active!;
              const pct = questPercent(a.progress, a.target);
              return (
                <View style={{ backgroundColor: color.surface, borderRadius: 20, borderWidth: 1, borderColor: color.violet, padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <T size={11} f="bold" c={color.violet} style={{ letterSpacing: 1 }}>{`ENROLLED · ${a.daysLeft} DAYS LEFT`}</T>
                    <T size={16} f="display" c={color.lime}>{`+${a.xp} XP`}</T>
                  </View>
                  <T size={18} f="bold">{a.title}</T>
                  <T size={13} c="#C9C9C3">{a.proof}</T>
                  <View accessibilityRole="progressbar" accessibilityLabel={`${a.progress} of ${a.target} checked in`} style={{ height: 8, borderRadius: 4, backgroundColor: color.line, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: 8, backgroundColor: color.lime }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T size={12} c={color.inkMuted}>{`${a.progress} / ${a.target} checked in`}</T>
                    <T size={12} c={color.inkMuted}>{a.squadLabel}</T>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Submit milestone" accessibilityState={{ disabled: pct < 100 }} onPress={() => submit(a.id)} style={{ minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pct < 100 ? color.line : color.lime }}>
                    <T size={14} f="bold" c={pct < 100 ? color.inkMuted : color.onLime}>Submit milestone</T>
                  </Pressable>
                  {msg ? <T size={12} c={color.inkMuted} accessibilityRole="alert">{msg}</T> : null}
                </View>
              );
            })() : null}

            <T size={11} f="bold" c={color.inkMuted} style={{ letterSpacing: 1, marginTop: 4 }}>OPEN QUESTS</T>
            {state.data.open.length === 0 ? <EmptyState title="No open quests." body="New quests show up here." action={{ label: 'Back to the Crew', onPress: () => router.back() }} /> : null}
            {state.data.open.map((q) => (
              <View key={q.id} style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag label={q.scope === 'campus' ? 'CAMPUS' : 'INTER-COLLEGE'} bg={q.scope === 'campus' ? color.info : color.hot} fg={color.onLime} />
                  <T size={14} f="display" c={color.lime}>{`+${q.xp} XP`}</T>
                </View>
                <T size={16} f="bold">{q.title}</T>
                <T size={13} c="#C9C9C3">{q.rule}</T>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T size={12} c={color.inkMuted}>{`Ends ${fmtShortDate(q.endsAtMs)}`}</T>
                  <Pressable accessibilityRole="button" accessibilityLabel={q.enrolled ? `Enrolled in ${q.title}, tap to leave` : `Enroll squad in ${q.title}`} onPress={() => enroll(q)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: q.enrolled ? 'transparent' : color.lime, borderWidth: q.enrolled ? 1 : 0, borderColor: '#4A4A54' }}>
                    <T size={13} f="bold" c={q.enrolled ? color.ink : color.onLime}>{q.enrolled ? 'Enrolled ✓' : 'Enroll squad'}</T>
                  </Pressable>
                </View>
              </View>
            ))}
            <T size={12} c={color.inkMuted} style={{ textAlign: 'center', marginTop: 8 }}>{state.data.note}</T>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

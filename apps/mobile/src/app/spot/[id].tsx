import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, SectionLabel, TopBar } from '@/features/you/ui';

/** R2 Spot: a public place. Shows an approximate "here now" only, never who. */
export default function SpotScreen() {
  const api = useApi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useAsync(() => api.discover.spot(String(id)), [id]);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const d = s.data;
  const isSaved = saved ?? d?.saved ?? false;

  const toggleSave = async () => { const v = !isSaved; setSaved(v); try { await api.discover.saveSpot(String(id), v); } catch { setSaved(!v); } };
  const vote = async (label: string, now: boolean) => { setMine((m) => ({ ...m, [label]: now })); try { await api.discover.voteSpotTag(String(id), label, now); } catch { setMine((m) => ({ ...m, [label]: !now })); } };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        <TopBar title={d?.name ?? 'Spot'} subtitle={d?.category.toUpperCase()} right={d ? <Btn label={isSaved ? 'Saved ✓' : '+ Save'} kind="ghost" small onPress={toggleSave} /> : undefined} />
        {s.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {s.status === 'error' ? <ErrorState onRetry={s.reload} /> : null}
        {d ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>{d.meta}</RNText>
            {d.deal ? <View style={{ alignSelf: 'flex-start', backgroundColor: '#3D2E0D', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 0.6, color: '#FFD58A' }}>SPONSORED · STUDENT DEAL</RNText></View> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, color: color.ink }}>{d.hereNow ?? '–'}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{d.hereNow === null ? 'not enough students to show' : 'students here now · approx'}</RNText>
              </View>
              <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, color: color.ink }}>{d.busyLabel}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{d.busyNote}</RNText>
              </View>
            </View>
            {d.deal ? (
              <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.warning, padding: 14, gap: 4 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.warning }}>DEAL · SHOW YOUR BUNK3D ID</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{d.deal.title}</RNText>
              </View>
            ) : null}
            <SectionLabel>VIBE TAGS · FROM STUDENTS</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {d.tags.map((t) => {
                const on = mine[t.label] ?? t.mine;
                const votes = t.votes + (mine[t.label] === undefined ? 0 : (mine[t.label] ? 1 : 0) - (t.mine ? 1 : 0));
                return (
                  <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={`${t.label}, ${votes} votes`} accessibilityState={{ selected: on }} onPress={() => vote(t.label, !on)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? color.lime : 'transparent', borderWidth: 1, borderColor: on ? color.lime : '#2E2E36' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: on ? color.onLime : color.ink }}>{t.label} · {votes}</RNText>
                  </Pressable>
                );
              })}
            </View>
            <SectionLabel>MEETUPS HERE</SectionLabel>
            {d.meetups.length === 0 ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>No meetups here yet.</RNText> : null}
            {d.meetups.map((m) => (
              <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.title}, ${m.going}`} onPress={() => router.push({ pathname: '/meetup/[id]', params: { id: m.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                <View style={{ minWidth: 52, paddingVertical: 8, borderRadius: 12, backgroundColor: m.tint, alignItems: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{m.when}</RNText></View>
                <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{m.title}</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>{m.going}</RNText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
      {d ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 14 }}>
          <Btn label="Invite someone" kind="ghost" onPress={() => router.push('/spark-invites')} style={{ flex: 1 }} />
          <Btn label="Start a meetup here" onPress={() => router.push({ pathname: '/meetup/new', params: { spotId: d.id } })} style={{ flex: 1 }} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

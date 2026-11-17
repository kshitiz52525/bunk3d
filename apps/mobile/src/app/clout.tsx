import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type CloutRow, type CloutScope } from '@bunk3d/api';
import { BackBar, ClubTile, T } from '@/features/crew/parts';

const xp = (n: number) => `${n.toLocaleString('en-IN')} XP`;

/** C7 Clout Board (wave 2). Ranks CLUBS only, never people. */
export default function CloutBoard() {
  const api = useApi();
  const [scope, setScope] = useState<CloutScope>('campus');
  const [how, setHow] = useState(false);
  const state = useAsync(() => api.crew.cloutBoard(scope), [scope]);
  const tabs: [CloutScope, string][] = [['campus', 'Atria clubs'], ['inter_college', 'Inter-college']];

  // Podium order: 2nd, 1st, 3rd.
  const podium = (rows: CloutRow[]) => [rows[1], rows[0], rows[2]].filter(Boolean);
  const heights: Record<number, number> = { 1: 130, 2: 100, 3: 80 };
  const bars: Record<number, string> = { 1: color.lime, 2: color.violet, 3: color.ink };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <BackBar title="Clout Board" right={state.status === 'ready' ? <T size={12} c={color.inkMuted}>{state.data.periodLabel}</T> : undefined} />
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', margin: 16, marginTop: 4, padding: 4, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
        {tabs.map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: k === scope }} onPress={() => setScope(k)} style={{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: k === scope ? color.lime : 'transparent' }}>
            <T size={13} f="bold" c={k === scope ? color.onLime : color.inkMuted}>{l}</T>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}>
        {state.status === 'loading' ? <SkeletonList rows={5} /> : null}
        {state.status === 'error' ? <ErrorState onRetry={state.reload} /> : null}
        {state.status === 'ready' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
              {podium(state.data.rows).map((p) => (
                <View key={p.clubId} accessibilityLabel={`Rank ${p.rank}, ${p.name}, ${xp(p.xp)}`} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <ClubTile short={p.short} tint={p.tint} size={48} />
                  <T size={12} f="bold" numberOfLines={1}>{p.name}</T>
                  <View style={{ width: '100%', height: heights[p.rank] ?? 80, backgroundColor: bars[p.rank] ?? color.ink, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <T size={26} f="display" c={color.onLime}>{p.rank}</T>
                    <T size={11} f="bold" c={color.onLime}>{xp(p.xp)}</T>
                  </View>
                </View>
              ))}
            </View>
            {state.data.rows.slice(3).map((r) => (
              <View key={r.clubId} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: r.mine ? '#1F2410' : color.surface, borderWidth: 1, borderColor: r.mine ? color.lime : color.line }}>
                <T size={14} f="display" c={color.inkMuted} style={{ width: 24 }}>{r.rank}</T>
                <T size={14} f="bold" style={{ flex: 1 }}>{r.name}</T>
                <T size={13} f="semi" c="#C9C9C3">{xp(r.xp)}</T>
              </View>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="How scoring works" onPress={() => setHow((h) => !h)} style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}>
              <T size={12} c={color.inkMuted} style={{ textAlign: 'center' }}>Clubs only — people are never ranked. <T size={12} f="bold" c={color.ink}>How scoring works ›</T></T>
            </Pressable>
            {how ? <T size={13} c="#C9C9C3" style={{ textAlign: 'center' }}>{state.data.scoringNote}</T> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

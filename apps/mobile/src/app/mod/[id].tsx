import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type ModVoteKind, type ModVoteResult } from '@bunk3d/api';
import { ago, Btn, TopBar } from '@/features/you/ui';

const SHORT = { harassment: 'Harassment', hate: 'Hate', naming: 'Naming', sexual: 'Sexual content', self_harm: 'Self-harm', spam: 'Spam', misinfo: 'Misinformation', other: 'Other' } as const;

/** M2 Mod review. The Mod sees the item as students see it, never the author. */
export default function ModReview() {
  const api = useApi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAsync(() => api.safety.modCase(String(id)), [id]);
  const [result, setResult] = useState<(ModVoteResult & { kind: ModVoteKind }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => { setFailed(false); }, []));

  const vote = async (kind: ModVoteKind) => {
    if (busy) return;
    setBusy(true); setFailed(false);
    try { setResult({ ...(await api.safety.modVote(String(id), kind)), kind }); } catch { setFailed(true); } finally { setBusy(false); }
  };
  const tone = result?.outcome === 'removed' ? color.hot : result?.outcome === 'escalated' ? color.modInk : color.ink;
  const d = c.data;
  const voted = !!result || !!d?.myVote;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: 18 }}>
        <TopBar
          title={d ? `Review ${d.position.index} of ${d.position.total}` : 'Review'}
          subtitle={d ? `Reported ${ago(d.reportedAt)} ago` : undefined}
          right={<View style={{ backgroundColor: color.modTile, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.modInk }}>Campus Mod</RNText></View>}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 12 }}>
        {c.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {c.status === 'error' ? <ErrorState onRetry={c.reload} /> : null}
        {d ? (
          <>
            <View style={{ backgroundColor: color.surface, borderRadius: 18, borderWidth: 1, borderColor: '#2E2E36', padding: 14, gap: 10, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View aria-hidden style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color.anonTile, alignItems: 'center', justifyContent: 'center' }}><Icon name="mask" size={20} color={color.anonInk} /></View>
                <View style={{ flex: 1 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{d.authorLabel}</RNText>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{d.context}</RNText>
                </View>
              </View>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22, color: color.ink }}>{d.excerpt}</RNText>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>REASONS</RNText>
                {d.reasons.map((r) => <RNText key={r.reason} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.ink, marginTop: 4 }}>{SHORT[r.reason]} · {r.count}</RNText>)}
              </View>
              <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>VOTES SO FAR</RNText>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.ink, marginTop: 4 }}><RNText style={{ color: color.hot }}>Remove {d.votesSoFar.remove}</RNText> · Keep {d.votesSoFar.keep}</RNText>
              </View>
            </View>
            {d.rule ? (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.violet }}>{d.rule.n}</RNText>
                <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: '#C9C9C3' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.ink }}>Rule {Number(d.rule.n)}:</RNText> {d.rule.text}</RNText>
              </View>
            ) : null}
            {result ? (
              <View accessibilityRole="alert" style={{ borderRadius: 16, borderWidth: 1.5, borderColor: tone, padding: 14, gap: 4 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 14, color: tone }}>{result.title}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: '#C9C9C3' }}>{result.body}</RNText>
              </View>
            ) : d.myVote ? (
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.inkMuted }}>You voted {d.myVote === 'escalate' ? 'to escalate' : d.myVote}. Waiting for a second Mod.</RNText>
            ) : null}
            {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error }}>Couldn’t record that vote. Try again.</RNText> : null}
          </>
        ) : null}
      </ScrollView>
      {d ? (
        <View style={{ paddingHorizontal: 18, paddingBottom: 14, gap: 8 }}>
          {voted ? (
            <Btn label="Back to queue" kind="light" onPress={() => router.back()} />
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="Keep" kind="light" disabled={busy} onPress={() => vote('keep')} style={{ flex: 1 }} />
                <Btn label="Remove" kind="hot" disabled={busy} onPress={() => vote('remove')} style={{ flex: 1 }} />
              </View>
              <Btn label="Not sure — escalate to Bunk3d ops" kind="ghost" small disabled={busy} onPress={() => vote('escalate')} />
            </>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

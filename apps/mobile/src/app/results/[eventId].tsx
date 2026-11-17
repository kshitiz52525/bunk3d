import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { useApi } from '@bunk3d/api';
import { ordinal } from '@/features/poppin/format';
import { RouteFrame } from '@/features/poppin/ui';
import { ago, useCachedAsync } from '@/features/poppin/cache';

// E8 Results and certificate. Host-published; the certificate is added to the student's profile.
export default function Results() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const api = useApi();
  const r = useCachedAsync(`poppin.results.${eventId}`, () => api.poppin.results(eventId), [eventId]);
  const [rating, setRating] = useState<number | null>(null);
  const d = r.status === 'ready' ? r.data : null;
  const stars = rating ?? d?.myRating ?? 0;
  const rate = async (n: number) => { setRating(n); try { await api.poppin.rateEvent(eventId, n); } catch { setRating(null); } };
  const shareCert = async () => { if (d?.certificate) { try { await Share.share({ message: `${d.certificate.title} · ${d.eventTitle} · verify code ${d.certificate.verifyCode}` }); } catch { /* sharing unavailable */ } } };
  return (
    <RouteFrame title="Results are in" subtitle={d ? `${d.eventTitle} · published by ${d.hostName}` : undefined}>
      {r.status === 'loading' ? <SkeletonList rows={4} /> : null}
      {r.status === 'error' ? <ErrorState onRetry={r.reload} /> : null}
      {r.status === 'ready' && !d ? <EmptyState title="That event isn’t here." body="It may have been removed." action={{ label: 'Back to events', onPress: () => router.back() }} /> : null}
      {d && !d.published ? <EmptyState title="Results aren’t out yet." body={`${d.hostName} hasn’t published them. We’ll tell you when they do.`} action={{ label: 'Back to events', onPress: () => router.back() }} /> : null}
      {d?.published ? (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}>
            {r.status === 'ready' && r.offlineSince ? <OfflineBanner message={`offline · showing results from ${ago(r.offlineSince)}`} /> : null}
            {d.myPlacement ? (
              <View style={{ backgroundColor: color.lime, borderRadius: 24, padding: 20, gap: 4 }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 64, letterSpacing: -3, lineHeight: 64, color: color.onLime }}>{d.myPlacement.place}</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.onLime }}>YOUR TEAM · {d.myPlacement.teamName.toUpperCase()}</RNText>
                <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, letterSpacing: -1, color: color.onLime }}>{ordinal(d.myPlacement.place)} place</RNText>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.onLime }}>out of {d.myPlacement.ofTeams} teams{d.myPlacement.project ? ` · “${d.myPlacement.project}”` : ''}</RNText>
              </View>
            ) : null}
            <View style={{ gap: 8 }}>
              {d.podium.map((p) => {
                const me = d.myPlacement?.place === p.place;
                return (
                  <View key={p.place} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: me ? color.lime : color.line, borderWidth: me ? 1.5 : 1, borderRadius: 14, padding: 12, minHeight: 56 }}>
                    <RNText style={{ width: 28, fontFamily: 'Unbounded_800ExtraBold', fontSize: 18, color: color.lime }}>{p.place}</RNText>
                    <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{p.teamName}{me ? ' · you' : ''}</RNText>
                    <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{p.membersLabel}</RNText>
                  </View>
                );
              })}
            </View>
            {d.certificate ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime, backgroundColor: color.violet, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' }}>CERT</RNText>
                  <View style={{ flex: 1 }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{d.certificate.title}</RNText>
                    <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>signed by {d.certificate.signedBy} · verify code {d.certificate.verifyCode}</RNText>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Share certificate" onPress={shareCert} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="share" size={20} />
                  </Pressable>
                </View>
                {d.certificate.addedToProfile ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.success }}>✓ Added to your profile — the host published it.</RNText> : null}
              </>
            ) : null}
            <View style={{ gap: 8 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>How was it?</RNText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Rate ${n} of 5`} accessibilityState={{ selected: n <= stars }} onPress={() => rate(n)} style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: n <= stars ? color.lime : '#26262D' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: n <= stars ? color.onLime : color.ink }}>{n}</RNText>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Share to your story" onPress={() => router.push('/post/photo?mode=story')} style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime, boxShadow: `4px 4px 0 ${color.violet}` }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.onLime }}>Share to your story</RNText>
            </Pressable>
          </View>
        </>
      ) : null}
    </RouteFrame>
  );
}

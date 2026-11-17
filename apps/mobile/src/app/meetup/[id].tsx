import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Avatar, Btn, TopBar } from '@/features/you/ui';
import { clock12 } from '@/features/discover/time';

/** R4 Meetup detail. The exact spot comes only to the host and approved people, from 1 hour before. */
export default function MeetupScreen() {
  const api = useApi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = useAsync(() => api.discover.meetup(String(id)), [id]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const d = m.data;
  const pending = d?.joinState === 'pending';
  // While waiting for the host, check back so approval shows up without leaving the screen.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => m.reload(), 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const join = async () => {
    setBusy(true); setFailed(false);
    try { await api.discover.requestJoinMeetup(String(id)); m.reload(); } catch { setFailed(true); } finally { setBusy(false); }
  };
  const where = !d ? '' : d.exactSpot ? d.exactSpot : d.joinState === 'approved' ? `${d.area} · exact spot shows at ${clock12(d.revealsAt)}` : `${d.area} · exact spot after approval`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: 18 }}>
        <TopBar title="Meetup" right={d && !d.isHost ? <Pressable accessibilityRole="button" accessibilityLabel="Report" onPress={() => router.push({ pathname: '/report', params: { targetKind: 'meetup', targetId: String(id) } })} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.inkMuted }}>Report</RNText></Pressable> : undefined} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {m.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {m.status === 'error' ? <ErrorState onRetry={m.reload} /> : null}
        {d ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            <View style={{ backgroundColor: color.surface, borderRadius: 22, borderWidth: 1, borderColor: '#2E2E36', padding: 18, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 0.8, color: color.lime }}>{d.whenLabel}</RNText>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>by {d.hostName}</RNText>
              </View>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, letterSpacing: -0.8, color: color.ink }}>{d.title}</RNText>
              {d.description ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21, color: '#C9C9C3' }}>{d.description}</RNText> : null}
            </View>
            <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line }}>
              {[['Where', where], ['Who can join', d.who], ['Spots', `${d.going} / ${d.max}`]].map(([k, v], i) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: '#222228' }}>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>{k}</RNText>
                  <RNText style={{ flex: 1, textAlign: 'right', fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>{v}</RNText>
                </View>
              ))}
            </View>
            {d.goingInitials.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row' }}>{d.goingInitials.map((a, i) => <View key={i} style={{ marginLeft: i ? -10 : 0 }}><Avatar initials={a.initials} tint={a.tint} size={36} /></View>)}</View>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9C9C3' }}>{d.going} going</RNText>
              </View>
            ) : null}
            {pending ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 19, color: color.warning }}>Request sent. {d.hostName} approves joins — you’ll get the exact spot once approved.</RNText> : null}
            {d.joinState === 'approved' && !d.isHost ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 19, color: color.success }}>You’re in. Group chat unlocked · location reveals at {clock12(d.revealsAt)}.</RNText> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Share live location with a friend" onPress={() => router.push('/location-share')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, paddingHorizontal: 14 }}>
              <Icon name="mapPin" size={20} />
              <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Share live location with a friend</RNText>
              <Icon name="chevronRight" size={18} color={color.inkMuted} />
            </Pressable>
            {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error }}>Couldn’t send that. Try again.</RNText> : null}
          </View>
        ) : null}
      </ScrollView>
      {d && !d.isHost ? (
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          {d.joinState === 'none' ? <Btn label={busy ? 'Sending…' : 'Request to join'} onPress={join} disabled={busy} /> : null}
          {d.joinState === 'pending' ? <Btn label="Pending" onPress={() => {}} disabled /> : null}
          {d.joinState === 'approved' ? <Btn label="Open group chat" onPress={() => router.push('/dms')} /> : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

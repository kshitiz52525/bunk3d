import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, H1, Icon, PrimaryCta, Screen, SkeletonList, Spacer, StepHeader } from '@bunk3d/ui/native';
import { useApi, useAsync, type MembershipState } from '@bunk3d/api';

// A8 Join clubs + follow official notices. Skip goes to A9.
export default function Clubs() {
  const api = useApi();
  const clubs = useAsync(() => api.onboarding.listClubs(), []);
  const [state, setState] = useState<Record<string, MembershipState>>({});
  const [follow, setFollow] = useState(true);
  const [sub, setSub] = useState('');
  useEffect(() => {
    api.onboarding.getDraft().then((d) => {
      setState(d.clubs);
      setFollow(d.followNotices);
      const p = d.profile;
      setSub(`Picked for ${[p.dept, p.year && `${p.year} yr`, d.interests.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}`);
    });
  }, [api]);

  const toggle = async (id: string) => {
    const joined = (state[id] ?? 'none') === 'none';
    const next = await api.onboarding.setClubMembership(id, joined);
    setState((prev) => ({ ...prev, [id]: next }));
  };
  const toggleFollow = async () => { setFollow(!follow); await api.onboarding.setFollowNotices(!follow); };

  return (
    <Screen>
      <StepHeader step={6} onBack={() => router.back()} right={{ label: 'Skip', onPress: () => router.push('/onboarding/guidelines') }} />
      <View style={{ marginTop: 30, marginBottom: 6 }}><H1>Pick your crews</H1></View>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: color.inkMuted, marginBottom: 16 }}>{sub}</RNText>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.4, color: color.inkMuted, marginBottom: 8 }}>CLUBS AT ATRIA</RNText>
      {clubs.status === 'loading' ? <SkeletonList rows={4} /> : null}
      {clubs.status === 'error' ? <ErrorState onRetry={clubs.reload} /> : null}
      {clubs.status === 'ready' && clubs.data.length === 0 ? <EmptyState title="No clubs here yet." body="Crews show up as soon as a club lead sets one up." action={{ label: 'Skip', onPress: () => router.push('/onboarding/guidelines') }} /> : null}
      {clubs.status === 'ready' ? (
        <View style={{ gap: 8 }}>
          {clubs.data.map((c) => {
            const m = state[c.id] ?? 'none';
            const on = m !== 'none';
            const label = on ? (m === 'pending' ? 'Pending' : 'Joined') : c.join === 'approval' ? 'Request' : 'Join';
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, padding: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 11, color: color.onLime }}>{c.short}</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{c.name}</RNText>
                    <View accessibilityLabel="Official club" style={{ backgroundColor: color.lime, borderRadius: 6, padding: 2 }}><Icon name="check" size={10} color={color.onLime} stroke={3} /></View>
                  </View>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{c.category} · {c.members} members · {c.join}</RNText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${c.name}`} onPress={() => toggle(c.id)} style={{ minHeight: 44, minWidth: 72, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, backgroundColor: on ? 'transparent' : color.lime, borderWidth: 1.5, borderColor: on ? '#4A4A54' : color.lime }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: on ? color.ink : color.onLime }}>{label}</RNText>
                  {m === 'joined' ? <Icon name="check" size={13} color={color.ink} stroke={3} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.4, color: color.inkMuted, marginTop: 22, marginBottom: 8 }}>OFFICIAL NOTICES</RNText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, padding: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="bank" size={24} color={color.bg} /></View>
        <View style={{ flex: 1 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>Atria Office of Students</RNText>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Official college · posts notices only</RNText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={follow ? 'Following' : 'Follow'} accessibilityState={{ selected: follow }} onPress={toggleFollow} style={{ minHeight: 44, minWidth: 72, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: follow ? 'transparent' : color.lime, borderWidth: 1.5, borderColor: follow ? '#4A4A54' : color.lime }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: follow ? color.ink : color.onLime }}>{follow ? 'Following' : 'Follow'}</RNText>
        </Pressable>
      </View>
      <Spacer />
      <PrimaryCta label="Next" onPress={() => router.push('/onboarding/guidelines')} />
    </Screen>
  );
}

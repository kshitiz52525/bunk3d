import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Banner, ErrorState, Icon, IconButton, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type MeetupVisibility } from '@bunk3d/api';
import { Btn, Pill, SectionLabel } from '@/features/you/ui';
import { istAt, nextWeekday } from '@/features/discover/time';

/** R3 Create meetup. Public spots first; the exact spot is shown only to approved people, 1 hr before. */
export default function NewMeetup() {
  const api = useApi();
  const { spotId } = useLocalSearchParams<{ spotId?: string }>();
  const spots = useAsync(() => api.discover.inviteSpots(), []);
  const me = useAsync(() => api.you.myProfile(), []);
  const prefs = useAsync(() => api.discover.sparkPrefs(), []);
  const [title, setTitle] = useState('');
  const [spot, setSpot] = useState<string | null>(spotId ? String(spotId) : null);
  const [when, setWhen] = useState(0);
  const [vis, setVis] = useState<MeetupVisibility>('campus');
  const [max, setMax] = useState(8);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const [now] = useState(() => Date.now());
  const options = [
    { label: 'Today 6 PM', at: istAt(now, 18) },
    { label: 'Tmrw 5 PM', at: istAt(now, 17, 1) },
    { label: 'Sat 11 AM', at: nextWeekday(now, 6, 11) },
  ];
  const chosen = spot ?? spots.data?.[0]?.id ?? '';
  const clubs = me.data?.clubs.map((c) => c.name).join(', ') || 'You’re not in a club yet';
  const visOpts: [MeetupVisibility, string, string][] = [
    ['campus', 'My campus', 'Any verified Atria student · join with approval'],
    ['clubs', 'My clubs only', clubs],
    ['close', 'Close connections', 'People you’ve connected with'],
  ];
  const off = prefs.data ? !prefs.data.discoverOn : false;

  const post = async () => {
    if (!title.trim() || !chosen || busy) return;
    setBusy(true); setFailed(false);
    try {
      const { id } = await api.discover.createMeetup({ title: title.trim(), spotId: chosen, startsAt: options[when].at, durationHours: 2, visibility: vis, max });
      router.replace({ pathname: '/meetup/[id]', params: { id } }); // the form must not be returned to
    } catch { setFailed(true); setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, minHeight: 56, paddingTop: 4 }}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, letterSpacing: -0.6, color: color.ink }}>New meetup</RNText>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {spots.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {spots.status === 'error' ? <ErrorState onRetry={spots.reload} /> : null}
        {spots.data ? (
          <View>
            {off ? <View style={{ marginBottom: 10 }}><Banner text="Turn on Discover to post a meetup." /></View> : null}
            <TextInput accessibilityLabel="Meetup name" placeholder="What’s the plan?" placeholderTextColor={color.inkMuted} value={title} onChangeText={setTitle} maxLength={60} style={{ height: 52, paddingHorizontal: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: '#2E2E36', borderRadius: 14, color: color.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 16 }} />
            <SectionLabel>WHERE · PUBLIC SPOT</SectionLabel>
            <View style={{ gap: 6 }}>
              {spots.data.map((s) => {
                const on = s.id === chosen;
                return (
                  <Pressable key={s.id} accessibilityRole="radio" accessibilityLabel={`${s.name}, ${s.meta}`} accessibilityState={{ checked: on }} onPress={() => setSpot(s.id)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: on ? color.lime : color.line }}>
                    <View aria-hidden style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: on ? color.lime : '#4A4A54' }} />
                    <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{s.name}</RNText>
                    <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.success }}>Public spot ✓</RNText>
                  </Pressable>
                );
              })}
            </View>
            <SectionLabel>WHEN · 2 HRS</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{options.map((o, i) => <Pill key={o.label} tone="lime" label={o.label} selected={i === when} onPress={() => setWhen(i)} />)}</View>
            <SectionLabel>WHO CAN SEE IT</SectionLabel>
            <View style={{ gap: 6 }}>
              {visOpts.map(([k, label, sub]) => {
                const on = k === vis;
                return (
                  <Pressable key={k} accessibilityRole="radio" accessibilityLabel={`${label}. ${sub}`} accessibilityState={{ checked: on }} onPress={() => setVis(k)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: on ? color.lime : '#2E2E36' }}>
                    <View aria-hidden style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? color.lime : '#4A4A54', alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.lime }} /> : null}</View>
                    <View style={{ flex: 1 }}>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{label}</RNText>
                      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{sub}</RNText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, paddingHorizontal: 14, minHeight: 56 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Max people</RNText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Fewer" onPress={() => setMax(Math.max(2, max - 1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: color.ink }}>−</RNText></Pressable>
                <RNText accessibilityLabel={`${max} people`} style={{ minWidth: 28, textAlign: 'center', fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.ink }}>{max}</RNText>
                <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => setMax(Math.min(30, max + 1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: color.ink }}>+</RNText></Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Icon name="shield" size={18} color={color.inkMuted} />
              <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted }}>Meet in public spots first. Exact location shows only to people you approve, and only 1 hr before.</RNText>
            </View>
            {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error, marginTop: 8 }}>Couldn’t post that. Try again.</RNText> : null}
          </View>
        ) : null}
      </ScrollView>
      {spots.data ? <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}><Btn label={busy ? 'Posting…' : 'Post meetup'} onPress={post} disabled={!title.trim() || busy || off} /></View> : null}
    </SafeAreaView>
  );
}

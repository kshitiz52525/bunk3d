import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { INVITE_PLANS, INVITE_TIMES, useApi, useAsync } from '@bunk3d/api';
import { Btn, Pill, SectionLabel, TopBar } from '@/features/you/ui';

/** SP3 Shoot your shot: 3 invites a day, each a concrete plan (what, where, when). Declines are silent. */
export default function Shot() {
  const api = useApi();
  const { to } = useLocalSearchParams<{ to?: string }>();
  const person = useAsync(() => (to ? api.you.userProfile(String(to)) : Promise.resolve(null)), [to]);
  const quota = useAsync(() => api.discover.inviteQuota(), []);
  const spots = useAsync(() => api.discover.inviteSpots(), []);
  const [plan, setPlan] = useState<string>(INVITE_PLANS[0]);
  const [spot, setSpot] = useState<string | null>(null);
  const [time, setTime] = useState<string>(INVITE_TIMES[0]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<{ plan: string; spot: string; time: string; left: number } | null>(null);

  const first = person.data?.name.split(' ')[0] ?? 'They';
  const chosenSpot = spot ?? spots.data?.[0]?.name ?? '';
  const left = sent?.left ?? quota.data?.left ?? 0;

  const send = async () => {
    if (!to || busy) return;
    setBusy(true); setProblem(null);
    try {
      const r = await api.discover.sendInvite({ toId: String(to), plan, spot: chosenSpot, time, message: msg.trim() || undefined });
      if (r.ok) setSent({ plan, spot: chosenSpot.split(',')[0], time, left: r.left });
      else setProblem(r.reason === 'limit' ? 'You’re out of invites for today. They reset at midnight.' : r.reason === 'off' ? 'Turn Discover on to send invites.' : 'Pick a plan, a place and a time.');
    } catch { setProblem('Couldn’t send that. Check your connection and try again.'); } finally { setBusy(false); }
  };

  if (!to) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg, paddingHorizontal: 18 }}>
        <TopBar title="Shoot your shot" />
        <EmptyState title="Pick someone first." body="Open a card in the deck and tap Shoot your shot." action={{ label: 'Back to the deck', onPress: () => router.back() }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: 18 }}>
        <TopBar title="Shoot your shot" subtitle={person.data ? `Invite · ${person.data.name}` : undefined} right={quota.data || sent ? <View style={{ backgroundColor: color.lime, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{left} LEFT TODAY</RNText></View> : undefined} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {(quota.status === 'loading' || spots.status === 'loading') && !sent ? <SkeletonList rows={3} /> : null}
        {quota.status === 'error' || spots.status === 'error' ? <ErrorState onRetry={() => { quota.reload(); spots.reload(); }} /> : null}
        {sent ? (
          <View style={{ gap: 12, marginTop: 12 }}>
            <View style={{ backgroundColor: color.surface, borderRadius: 20, borderWidth: 1, borderColor: color.lime, padding: 18, gap: 4 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.lime }}>INVITE SENT</RNText>
              <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 18, color: color.ink }}>{sent.plan} · {sent.spot}</RNText>
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#C9C9C3' }}>{sent.time}</RNText>
            </View>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 20, color: color.inkMuted }}>If {first} accepts, a chat opens. If they decline, you won’t be told — the invite just expires in 48h.</RNText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="My invites" kind="light" onPress={() => router.push('/spark-invites')} style={{ flex: 1 }} />
              <Btn label="Back to deck" kind="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
            </View>
          </View>
        ) : quota.data && spots.data ? (
          <View>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 20, color: '#C9C9C3', marginTop: 8 }}>A real plan beats a “hey”. {first} sees the plan first, then decides — no pressure, no read receipts.</RNText>
            <SectionLabel>THE PLAN</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{INVITE_PLANS.map((p) => <Pill key={p} tone="lime" label={p} selected={p === plan} onPress={() => setPlan(p)} />)}</View>
            <SectionLabel>WHERE · FROM RADAR</SectionLabel>
            <View style={{ gap: 6 }}>
              {spots.data.map((s) => {
                const on = s.name === chosenSpot;
                return (
                  <Pressable key={s.id} accessibilityRole="radio" accessibilityLabel={`${s.name}, ${s.meta}`} accessibilityState={{ checked: on }} onPress={() => setSpot(s.name)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: on ? color.lime : color.line }}>
                    <View aria-hidden style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: on ? color.lime : '#4A4A54' }} />
                    <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{s.name}</RNText>
                    <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{s.meta}</RNText>
                  </Pressable>
                );
              })}
            </View>
            <SectionLabel>WHEN</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{INVITE_TIMES.map((t) => <Pill key={t} tone="lime" label={t} selected={t === time} onPress={() => setTime(t)} />)}</View>
            <TextInput accessibilityLabel="Add a line" placeholder="Add a line (optional)" placeholderTextColor={color.inkMuted} value={msg} onChangeText={setMsg} maxLength={140} style={{ marginTop: 16, height: 48, paddingHorizontal: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: '#2E2E36', borderRadius: 14, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 14 }} />
            {problem ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error, marginTop: 8 }}>{problem}</RNText> : null}
          </View>
        ) : null}
      </ScrollView>
      {!sent && quota.data && spots.data ? (
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Btn label={busy ? 'Sending…' : quota.data.left === 0 ? 'No invites left today' : 'Send invite'} onPress={send} disabled={busy || quota.data.left === 0} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Input, SkeletonList } from '@bunk3d/ui/native';
import { TEAM_MAX, TEAM_MIN } from '@bunk3d/core';
import { useApi, useAsync, type TeamPreview } from '@bunk3d/api';
import { RouteFrame } from '@/features/poppin/ui';

// E6 Team registration. Teams of 2-4, invite by username or join with a code.
// Free events skip checkout: registering goes straight to the ticket (E6 to E3).
const ERR: Record<string, string> = {
  name: 'Give your team a name (2–30 characters).', full: `A team can have up to ${TEAM_MAX} people.`, unknown_user: 'We couldn’t invite that username.', no_code: 'No team has that code.',
  already_in_team: 'You’re already in a team for this event.', not_team_event: 'This event isn’t a team event.', not_captain: 'Only the captain can do that.', payment_required: 'This event needs payment first.',
};

export default function TeamReg() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const api = useApi();
  const ev = useAsync(() => api.poppin.getEvent(eventId), [eventId]);
  const team = useAsync(() => api.poppin.myTeam(eventId), [eventId]);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<TeamPreview | null | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Invited teammates accept in their own time; look again while someone is still pending.
  const pending = team.status === 'ready' && team.data && team.data.members.some((m) => m.status === 'invited');
  useEffect(() => {
    if (!pending) return;
    const i = setInterval(team.reload, 2000);
    return () => clearInterval(i);
  }, [pending, team.reload]);

  useEffect(() => {
    const c = code.trim();
    if (c.length < 6) return;
    let live = true;
    api.poppin.lookupTeamCode(c).then((p) => live && setPreview(p));
    return () => { live = false; };
  }, [code, api]);

  const title = ev.status === 'ready' && ev.data ? ev.data.title : '';
  const toTicket = () => router.replace(`/ticket/${eventId}`); // registration is not somewhere to come back to
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch { setMsg('That didn’t go through. Try again.'); } finally { setBusy(false); }
  };
  const create = () => run(async () => {
    const r = await api.poppin.createTeam(eventId, name);
    if (!r.ok) setMsg(ERR[r.reason]); else team.reload();
  });
  const invite = (t: { id: string }) => run(async () => {
    const r = await api.poppin.inviteToTeam(t.id, draft);
    if (!r.ok) setMsg(ERR[r.reason]); else { setDraft(''); team.reload(); }
  });
  const register = (t: { id: string }) => run(async () => {
    const r = await api.poppin.registerTeam(t.id);
    if (r.ok) toTicket();
    else if (r.reason === 'payment_required') router.push(`/checkout/${eventId}`);
    else setMsg(r.reason === 'not_ready' ? `Need ${TEAM_MIN} accepted` : ERR.not_captain);
  });
  const join = () => run(async () => {
    const r = await api.poppin.joinTeam(code);
    if (r.ok) toTicket();
    else if (r.reason === 'payment_required') router.push(`/checkout/${eventId}`);
    else setMsg(ERR[r.reason]);
  });

  const t = team.status === 'ready' ? team.data : null;
  const shownPreview = code.trim().length < 6 ? undefined : preview;
  const paid = ev.status === 'ready' && ev.data?.ticketKind === 'paid';
  return (
    <RouteFrame title="Team up" subtitle={`${title} · teams of ${TEAM_MIN}–${TEAM_MAX}`}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 14 }} keyboardShouldPersistTaps="handled">
        {team.status === 'loading' || ev.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {team.status === 'error' ? <ErrorState onRetry={team.reload} /> : null}
        {ev.status === 'ready' && !ev.data ? <EmptyState title="That event isn’t here." body="It may have been removed." action={{ label: 'Back', onPress: () => router.back() }} /> : null}
        {team.status === 'ready' && ev.status === 'ready' && ev.data ? (
          <>
            {!t ? (
              <View style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: 14, padding: 4, gap: 4 }}>
                {([['create', 'Create a team'], ['join', 'Join with a code']] as const).map(([k, l]) => (
                  <Pressable key={k} accessibilityRole="button" accessibilityLabel={l} accessibilityState={{ selected: mode === k }} onPress={() => { setMode(k); setMsg(null); }} style={{ flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === k ? color.lime : 'transparent' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: mode === k ? color.onLime : color.inkMuted }}>{l}</RNText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {!t && mode === 'create' ? (
              <View style={{ gap: 10 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>Team name</RNText>
                <Input label="Team name" value={name} onChangeText={setName} placeholder="Samosa Stack" maxLength={30} />
                <Pressable accessibilityRole="button" accessibilityLabel="Create team" disabled={busy || name.trim().length < 2} onPress={create} style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: name.trim().length >= 2 ? color.lime : '#2A2A31' }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: name.trim().length >= 2 ? color.onLime : '#6E6E78' }}>Create team</RNText>
                </Pressable>
              </View>
            ) : null}
            {t ? (
              <>
                <View style={{ gap: 4 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>Team name</RNText>
                  <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, color: color.ink }}>{t.name}</RNText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>Squad · {t.members.length} / {t.maxSize}</RNText>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: t.ready ? color.success : color.warning }}>{t.ready ? 'Good to go' : `Need ${t.minSize} accepted`}</RNText>
                </View>
                <View style={{ gap: 8 }}>
                  {t.members.map((m) => (
                    <View key={m.username} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 10, minHeight: 56 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: m.isMe ? color.lime : color.info, alignItems: 'center', justifyContent: 'center' }}>
                        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.onLime }}>{m.initials}</RNText>
                      </View>
                      <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{m.isMe ? `You${m.status === 'captain' ? ' · captain' : ''}` : m.status === 'captain' ? `@${m.username} · captain` : `@${m.username}`}</RNText>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: m.status === 'invited' ? color.warning : color.success }}>{m.status === 'invited' ? 'Invite sent' : m.status === 'captain' ? 'In' : 'Accepted'}</RNText>
                    </View>
                  ))}
                </View>
                {t.captainIsMe && t.members.length < t.maxSize ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}><Input label="Invite by username" value={draft} onChangeText={setDraft} placeholder="@username" autoCapitalize="none" autoCorrect={false} /></View>
                    <Pressable accessibilityRole="button" accessibilityLabel="Invite" disabled={busy || !draft.trim()} onPress={() => invite(t)} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 14, justifyContent: 'center', backgroundColor: color.surfaceRaised, opacity: draft.trim() ? 1 : 0.5 }}>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Invite</RNText>
                    </Pressable>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Copy team code ${t.code}`} onPress={() => { Clipboard.setStringAsync(t.code).catch(() => {}); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9C9C3' }}>Or share code <RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.lime }}>{t.code}</RNText></RNText>
                  </Pressable>
                  <Pressable accessibilityRole="link" accessibilityLabel="Find teammates in The Spark" onPress={() => router.push('/discover')} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.violet }}>Find teammates in The Spark ›</RNText>
                  </Pressable>
                </View>
                {t.registered ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="View ticket" onPress={() => router.push(`/ticket/${eventId}`)} style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.onLime }}>View ticket</RNText>
                  </Pressable>
                ) : t.captainIsMe ? (
                  t.ready ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={paid ? 'Continue to payment' : `Register ${t.name} · free`} disabled={busy} onPress={() => register(t)} style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime, boxShadow: `4px 4px 0 ${color.violet}` }}>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.onLime }}>{paid ? 'Continue to payment' : `Register ${t.name} · free`}</RNText>
                    </Pressable>
                  ) : (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Waiting for ${t.minSize - t.acceptedCount} teammate to accept`} accessibilityState={{ disabled: true }} disabled style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A31' }}>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: '#6E6E78' }}>Waiting for {t.minSize - t.acceptedCount} teammate to accept</RNText>
                    </Pressable>
                  )
                ) : null}
              </>
            ) : null}
            {!t && mode === 'join' ? (
              <View style={{ gap: 10 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>Team code</RNText>
                <Input label="Team code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="RBX907" autoCapitalize="characters" autoCorrect={false} maxLength={8} />
                {shownPreview ? (
                  <View style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12 }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{shownPreview.name}</RNText>
                    <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>Captain: {shownPreview.captainName} · {shownPreview.memberCount} of {shownPreview.maxSize} · {shownPreview.spotsOpen} spots open</RNText>
                  </View>
                ) : null}
                {shownPreview === null ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>{ERR.no_code}</RNText> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={shownPreview ? `Ask to join ${shownPreview.name}` : 'Ask to join'} disabled={busy || !shownPreview} onPress={join} style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: shownPreview ? color.lime : '#2A2A31' }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: shownPreview ? color.onLime : '#6E6E78' }}>{shownPreview ? `Ask to join ${shownPreview.name}` : 'Ask to join'}</RNText>
                </Pressable>
              </View>
            ) : null}
            {msg ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>{msg}</RNText> : null}
          </>
        ) : null}
      </ScrollView>
    </RouteFrame>
  );
}

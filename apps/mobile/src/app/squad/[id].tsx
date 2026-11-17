import type React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, IconButton, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Avatar, BackBar, T, Tag, useLive, useLoadedAgo, useOnline } from '@/features/crew/parts';
import { Composer } from '@/features/crew/Composer';
import * as Clipboard from 'expo-clipboard';

/** D3 Squad chat. Squads come from Poppin; max 8, verified students of the same campus only. */
export default function SquadChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const state = useAsync(() => api.dm.getSquad(id), [id]);
  useLive(api.dm.subscribe, state.reload);
  const online = useOnline();
  const ago = useLoadedAgo(state.status === 'ready');
  const [info, setInfo] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  if (state.status === 'loading') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><SkeletonList rows={5} /></SafeAreaView>;
  if (state.status === 'error') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><ErrorState onRetry={state.reload} /></SafeAreaView>;
  const s = state.data;
  const totalVotes = s.poll ? s.poll.options.reduce((n, o) => n + o.votes, 0) : 0;
  const names = s.members.map((m) => (m.me ? 'You' : m.name.split(' ')[0])).join(', ');

  async function send(text: string) {
    setErr(null);
    try { await api.dm.sendSquadMessage(id, text); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send.'); }
    state.reload();
  }
  async function copyInvite() {
    const inv = await api.dm.squadInvite(id);
    try { await Clipboard.setStringAsync(inv.url); setNote('Invite link copied.'); } catch { setNote('Could not copy the link.'); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BackBar right={<IconButton icon="dmInfo" label="Group info" onPress={() => setInfo(true)} />}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {s.members.slice(0, 2).map((m, i) => <View key={m.userId} style={{ marginLeft: i ? -14 : 0 }}><Avatar initials={m.initials} tint={m.tint} size={36} /></View>)}
            </View>
            <View style={{ flex: 1 }}>
              <T size={14} f="bold" numberOfLines={1} accessibilityRole="header">{s.name}</T>
              <T size={12} c={color.inkMuted} numberOfLines={1}>{`${names} · ${s.members.length}/${s.max}`}</T>
            </View>
          </View>
        </BackBar>
        {!online ? <View style={{ paddingHorizontal: 16 }}><OfflineBanner message={`You’re offline · showing messages from ${ago()}`} /></View> : null}
        {s.linkedEvent ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Linked to ${s.linkedEvent.title}`} onPress={() => router.push(`/event/${s.linkedEvent!.id}` as never)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingHorizontal: 12, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
            <Tag label="EVENT" bg={color.lime} fg={color.onLime} />
            <T size={13} f="semi" style={{ flex: 1 }}>{`Linked to ${s.linkedEvent.title} · ${s.linkedEvent.whenLabel}`}</T>
            <Icon name="chevronRight" size={14} />
          </Pressable>
        ) : null}
        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}>
          {s.messages.map((m) => m.system ? (
            <T key={m.id} size={12} c={color.inkMuted} style={{ textAlign: 'center' }}>{m.text}</T>
          ) : (
            <View key={m.id} style={{ flexDirection: m.mine ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
              {m.mine ? null : <Avatar initials={m.initials} tint={m.tint} size={32} />}
              <View style={{ maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: m.mine ? color.lime : color.surface, gap: 2 }}>
                {m.mine ? null : <T size={12} f="bold" c={m.tint}>{m.authorName}</T>}
                <T size={14} c={m.mine ? color.onLime : color.ink} style={{ lineHeight: 19 }}>{m.text}</T>
              </View>
            </View>
          ))}
          {s.poll ? (
            <View accessibilityLabel={`Poll: ${s.poll.question}`} style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 8 }}>
              <T size={10} f="bold" c={color.inkMuted} style={{ letterSpacing: 1 }}>{`POLL · ${s.poll.by.toUpperCase()}`}</T>
              <T size={15} f="bold">{s.poll.question}</T>
              {s.poll.options.map((o) => {
                const pct = totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0;
                const mine = s.poll!.myVote === o.id;
                return (
                  <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`${o.label}, ${o.votes} votes${mine ? ', your vote' : ''}`} accessibilityState={{ selected: mine }} onPress={async () => { await api.dm.voteSquadPoll(id, s.poll!.id, o.id); state.reload(); }} style={{ minHeight: 48, borderRadius: 12, borderWidth: 1.5, borderColor: mine ? color.lime : '#2E2E36', overflow: 'hidden', justifyContent: 'center' }}>
                    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: mine ? '#2A3312' : color.surfaceRaised }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
                      <T size={14} f="semi">{o.label}</T>
                      <T size={14} f="bold">{o.votes}</T>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
        {err ? <T size={12} c={color.error} accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingBottom: 4 }}>{err}</T> : null}
        <Composer placeholder="Message the squad" onSend={send} />
      </KeyboardAvoidingView>

      {info ? (
        <Pressable accessibilityLabel="Close group settings" onPress={() => setInfo(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <Pressable accessible={false} style={{ backgroundColor: color.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 }}>
            <T size={18} f="display">Group settings</T>
            <T size={13} c={color.inkMuted}>{`Max ${s.max} · only verified students from your campus can join`}</T>
            <Row label="Invite link · expires in 24h" value="Copy" onPress={copyInvite} />
            <Row label="Mute notifications" value={s.muted ? 'On' : 'Off'} onPress={async () => { await api.dm.setSquadMuted(id, !s.muted); state.reload(); }} />
            <Row label="Report group" value="›" onPress={() => router.push({ pathname: '/report', params: { kind: 'squad', id } } as never)} />
            <Row label="Leave group" value="›" onPress={async () => { await api.dm.leaveSquad(id); router.back(); }} />
            {note ? <T size={12} c={color.success} accessibilityRole="alert">{note}</T> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={() => setInfo(false)} style={{ minHeight: 52, borderRadius: 14, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><T size={15} f="bold" c={color.onLime}>Done</T></Pressable>
          </Pressable>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: color.line }}>
      <T size={14} f="semi">{label}</T>
      <T size={14} f="bold" c={color.lime}>{value}</T>
    </Pressable>
  );
}

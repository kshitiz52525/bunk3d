import type React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Avatar, BackBar, ClubTile, Pill, T, Tag, useLive, useLoadedAgo, useOnline } from '@/features/crew/parts';
import { Composer } from '@/features/crew/Composer';

/** C8 Club chat. Also reachable from DMs under the Clubs filter. Params: id (club), channel (optional). */
export default function ClubChat() {
  const { id, channel } = useLocalSearchParams<{ id: string; channel?: string }>();
  const api = useApi();
  const [chan, setChan] = useState(channel ?? 'general');
  const state = useAsync(() => api.crew.getChannel(id, chan), [id, chan]);
  useLive(api.crew.subscribe, state.reload);
  const online = useOnline();
  const ago = useLoadedAgo(state.status === 'ready');
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send(text: string) {
    setErr(null);
    const r = await api.crew.sendChannelMessage(id, chan, text);
    if (!r.ok) setErr(r.reason === 'unverified' ? 'Chat unlocks after verification.' : r.reason === 'admin_only' ? 'Only admins can post here.' : r.reason === 'not_member' ? 'Join the club to chat.' : 'Write something first.');
    state.reload();
  }

  if (state.status === 'loading') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><SkeletonList rows={5} /></SafeAreaView>;
  if (state.status === 'error') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><ErrorState onRetry={state.reload} /></SafeAreaView>;
  const v = state.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BackBar right={<IconButton icon={v.muted ? 'crewBellOff' : 'bell'} label={v.muted ? 'Unmute club chat' : 'Mute club chat'} onPress={async () => { await api.crew.setChannelMuted(id, !v.muted); state.reload(); }} />}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${v.club.name} club page`} onPress={() => router.push({ pathname: '/club/[id]', params: { id } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
            <ClubTile short={v.club.short} tint={v.club.tint} size={36} />
            <View style={{ flex: 1 }}>
              <T size={14} f="bold" numberOfLines={1}>{`${v.club.name} · members`}</T>
              <T size={12} c={color.inkMuted}>{`${v.memberCount} members${v.onlineCount ? ` · ${v.onlineCount} online` : ''}`}</T>
            </View>
          </Pressable>
        </BackBar>
        {!online ? <View style={{ paddingHorizontal: 16 }}><OfflineBanner message={`You’re offline · showing messages from ${ago()}`} /></View> : null}
        {v.pinned ? (
          <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, padding: 12, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
            <Icon name="crewPin" size={18} color={color.lime} />
            <View style={{ flex: 1, gap: 2 }}>
              <T size={10} f="bold" c={color.lime} style={{ letterSpacing: 1 }}>{`PINNED · ${v.pinned.by}`}</T>
              <T size={13} style={{ lineHeight: 18 }}>{v.pinned.text}</T>
            </View>
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 16, paddingVertical: 12 }}>
          {v.channels.map((c) => <Pill key={c.id} label={`#${c.name}`} selected={c.id === chan} onPress={() => setChan(c.id)} />)}
        </ScrollView>
        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 12, flexGrow: 1 }}>
          {v.messages.length === 0 ? <EmptyState title="No messages yet." body={`Start the conversation in #${v.channel.name}.`} action={{ label: 'Say hi', onPress: () => send('hi') }} /> : null}
          {v.messages.map((m) => (
            <View key={m.id} style={{ flexDirection: m.mine ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
              {m.mine ? null : <Avatar initials={m.author.initials} tint={m.author.tint} size={34} />}
              <View style={{ maxWidth: '78%', backgroundColor: m.mine ? color.lime : color.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}>
                {m.mine ? null : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T size={12} f="bold" c={m.author.tint}>{m.author.name}</T>
                    {m.author.role && m.author.role !== 'member' ? <Tag label="ADMIN" bg={color.modTile} fg={color.modInk} style={{ paddingVertical: 1 }} /> : null}
                  </View>
                )}
                <T size={14} c={m.mine ? color.onLime : color.ink} style={{ lineHeight: 19 }}>{m.text}</T>
              </View>
            </View>
          ))}
        </ScrollView>
        {err ? <T size={12} c={color.error} accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingBottom: 4 }}>{err}</T> : null}
        {v.canPost ? (
          <Composer placeholder={`Message #${v.channel.name}`} onSend={send} />
        ) : (
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: color.line }}>
            <T size={13} c={color.inkMuted}>{v.club.state === 'joined' ? 'Only admins can post here.' : 'Join the club to chat.'}</T>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { CHAT_FILTERS } from '@bunk3d/core';
import { EmptyState, ErrorState, Icon, IconButton, OfflineBanner, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { useApi, useAsync, type ChatFilter, type ChatRow, type PersonHit, type SendResult } from '@bunk3d/api';
import { Avatar, BackBar, Pill, T, Tag, timeAgo, useLive, useLoadedAgo, useOnline } from '@/features/crew/parts';
import { RecipientPicker } from '@/features/dm/RecipientPicker';

function openRow(r: ChatRow) {
  if (r.kind === 'person') router.push({ pathname: '/chat/[id]', params: { id: r.id } });
  else if (r.kind === 'squad') router.push({ pathname: '/squad/[id]', params: { id: r.id } });
  else router.push({ pathname: '/club-chat/[id]', params: { id: r.clubId!, channel: r.channelId! } });
}

/** D1 Chats. Also the recipient picker for "New message" and for photos shared from Tea (?sharePostId= / ?shareMediaId=). */
export default function Dms() {
  const { sharePostId, shareMediaId } = useLocalSearchParams<{ sharePostId?: string; shareMediaId?: string }>();
  const sharing = !!(sharePostId || shareMediaId);
  const api = useApi();
  const [filter, setFilter] = useState<ChatFilter>('All');
  const [reqOpen, setReqOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const chats = useAsync(() => api.dm.listChats(filter), [filter]);
  const reqs = useAsync(() => api.dm.listRequests(), []);
  useLive(api.dm.subscribe, () => { chats.reload(); reqs.reload(); });
  const online = useOnline();
  const ago = useLoadedAgo(chats.status === 'ready');

  async function share(p: PersonHit): Promise<'limit' | void> {
    const r: SendResult = await api.dm.sharePhoto(p.userId, { postId: sharePostId, mediaId: shareMediaId });
    if (r.ok) router.replace({ pathname: '/chat/[id]', params: { id: r.chatId } }); // the picker must not be returned to
    else if (r.reason === 'request_limit') return 'limit';
  }
  async function compose(p: PersonHit) {
    const { chatId } = await api.dm.openChatWith(p.userId);
    setComposing(false);
    router.push({ pathname: '/chat/[id]', params: { id: chatId } });
  }

  if (sharing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <BackBar title="Send photo to…" />
        <RecipientPicker cta="Send photo to" onPick={share} />
      </SafeAreaView>
    );
  }
  if (composing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <BackBar title="New message" />
        <RecipientPicker cta="Message" onPick={compose} />
      </SafeAreaView>
    );
  }

  const locked = chats.status === 'ready' && chats.data.locked;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <BackBar title="The DMs" right={<IconButton icon="dmCompose" label="New message" onPress={() => setComposing(true)} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}>
        {!online ? <OfflineBanner message={`You’re offline · showing chats from ${ago()}`} /> : null}
        {chats.status === 'loading' ? <SkeletonList rows={6} /> : null}
        {chats.status === 'error' ? <ErrorState onRetry={chats.reload} /> : null}
        {locked ? (
          <StateCard domain="DMS" kind="info" title="DMs unlock after verification" body="Finish verifying your college and you can message people and join club chats." cta={{ label: 'OK', onPress: () => router.back() }} />
        ) : null}
        {chats.status === 'ready' && !locked ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={`Message requests, ${chats.data.requestCount}`} accessibilityState={{ expanded: reqOpen }} onPress={() => setReqOpen((o) => !o)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
              <Icon name="dmRequest" size={22} color={color.warning} />
              <View style={{ flex: 1 }}>
                <T size={14} f="bold">{`Message requests · ${chats.data.requestCount}`}</T>
                <T size={12} c={color.inkMuted}>From people you don’t share a club with</T>
              </View>
              <Icon name={reqOpen ? 'chevronUp' : 'chevronRight'} size={16} />
            </Pressable>
            {reqOpen ? (
              reqs.status === 'ready' && reqs.data.length === 0 ? <T size={13} c={color.inkMuted}>No requests right now.</T> :
              reqs.status === 'ready' ? reqs.data.map((r) => (
                <View key={r.id} style={{ padding: 12, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Avatar initials={r.initials} tint={r.tint} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <T size={14} f="bold">{r.name}</T>
                        {r.verified ? <Icon name="check" size={13} color={color.lime} stroke={3} /> : null}
                      </View>
                      <T size={13} c="#C9C9C3">{r.preview}</T>
                      <T size={12} c={color.inkMuted}>{`${r.name} doesn’t share a club with you. They can’t see if you read it.`}</T>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Accept ${r.name}`} onPress={async () => { const id = await api.dm.acceptRequest(r.id); router.push({ pathname: '/chat/[id]', params: { id } }); }} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: color.lime, justifyContent: 'center' }}><T size={13} f="bold" c={color.onLime}>Accept</T></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Ignore ${r.name}`} onPress={async () => { await api.dm.ignoreRequest(r.id); }} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: color.line, justifyContent: 'center' }}><T size={13} f="semi">Ignore</T></Pressable>
                    <Pressable accessibilityRole="link" accessibilityLabel={`Report ${r.name}`} onPress={() => router.push({ pathname: '/report', params: { kind: 'dm_request', id: r.id } } as never)} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}><T size={13} f="semi" c="#C9C9C3">Report</T></Pressable>
                  </View>
                </View>
              )) : null
            ) : null}

            <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CHAT_FILTERS.map((f) => <Pill key={f} label={`${f} · ${chats.data.counts[f]}`} selected={f === filter} onPress={() => setFilter(f)} />)}
            </View>

            {chats.data.rows.length === 0 ? (
              <EmptyState title={filter === 'Unread' ? 'Nothing unread. You’re caught up.' : 'No chats here yet.'} body={filter === 'Unread' ? 'New messages show up here.' : 'Start one with someone from your clubs.'} action={filter === 'Unread' ? { label: 'Show all chats', onPress: () => setFilter('All') } : { label: 'New message', onPress: () => setComposing(true) }} />
            ) : chats.data.rows.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${r.name}${r.channel ? ` ${r.channel}` : ''}${r.unread ? `, ${r.unread} unread` : ''}`} onPress={() => openRow(r)} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                <Avatar initials={r.initials} tint={r.tint} size={48} online={r.online} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T size={15} f="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</T>
                    {r.channel ? <T size={13} f="semi" c={color.inkMuted}>{r.channel}</T> : null}
                    {r.tag ? <Tag label={r.tag} bg={color.modTile} fg={color.modInk} style={{ paddingVertical: 1 }} /> : null}
                    <View style={{ flex: 1 }} />
                    <T size={12} f={r.unread ? 'bold' : 'body'} c={r.unread ? color.lime : color.inkMuted}>{timeAgo(r.lastAtMs)}</T>
                  </View>
                  <T size={13} f={r.unread ? 'bold' : 'body'} c={r.unread ? color.ink : color.inkMuted} numberOfLines={1}>{r.lastMessage}</T>
                </View>
                {r.unread ? <View accessibilityLabel={`${r.unread} unread`} style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><T size={11} f="bold" c={color.onLime}>{r.unread}</T></View> : null}
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

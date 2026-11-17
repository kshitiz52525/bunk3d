import type React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, IconButton, OfflineBanner, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { useApi, useAsync, type ChatView, type DmMessage } from '@bunk3d/api';
import { Avatar, BackBar, T, fmtDate, fmtTime, useLive, useLoadedAgo, useOnline } from '@/features/crew/parts';
import { Composer } from '@/features/crew/Composer';

const dayKey = (ms: number) => new Date(ms).toDateString();
const dayLabel = (ms: number) => (dayKey(ms) === dayKey(Date.now()) ? 'TODAY' : fmtDate(ms).toUpperCase());

function Bubble({ m }: { m: DmMessage }) {
  const mine = m.mine;
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View style={{ maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: mine ? color.lime : color.surface, gap: 6 }}>
        {m.kind === 'photo' ? (
          <View accessibilityLabel={`Photo ${m.photo?.name ?? ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 120 }}>
            <Icon name="dmPhoto" size={22} color={mine ? color.onLime : color.ink} />
            <T size={13} f="semi" c={mine ? color.onLime : color.ink}>{m.photo?.name ?? 'Photo'}</T>
          </View>
        ) : <T size={15} c={mine ? color.onLime : color.ink} style={{ lineHeight: 20 }}>{m.text}</T>}
      </View>
    </View>
  );
}

function ComposerArea({ v, onSend, onPhoto, reload }: { v: ChatView; onSend: (t: string) => Promise<void>; onPhoto: () => void; reload: () => void }) {
  const name = v.person.name;
  if (v.composer === 'cannot_send') return <View style={{ padding: 12 }}><StateCard domain="DMS" kind="err" title="Can’t send" body="You can’t message this person." cta={{ label: 'Back', onPress: () => router.back() }} /></View>;
  if (v.composer === 'locked') return <View style={{ padding: 12 }}><StateCard domain="DMS" kind="info" title="DMs unlock after verification" body="Finish verifying your college to message people." cta={{ label: 'OK', onPress: () => router.back() }} /></View>;
  if (v.composer === 'request_limit') return <View style={{ padding: 12 }}><StateCard domain="DMS" kind="wait" title="Request limit hit" body="20 new DM requests a day. Resets at midnight. Existing chats work as normal." cta={{ label: 'OK', onPress: () => router.back() }} /></View>;
  if (v.composer === 'request_pending') return <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: color.line }}><T size={13} c={color.inkMuted}>{`Request sent. You can message ${name.split(' ')[0]} again once they accept.`}</T></View>;
  void reload;
  return (
    <>
      {v.composer === 'new_request' ? <T size={12} c={color.inkMuted} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{`You don’t share a club with ${name}. Your first message goes as a request.`}</T> : null}
      <Composer placeholder={`Message ${name.split(' ')[0]}`} onSend={onSend} left={<IconButton icon="dmPhoto" label="Send a photo" onPress={onPhoto} />} />
    </>
  );
}

/** D2 Chat. */
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const state = useAsync(() => api.dm.getChat(id), [id]);
  useLive(api.dm.subscribe, state.reload);
  const online = useOnline();
  const ago = useLoadedAgo(state.status === 'ready');
  const [menu, setMenu] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  async function send(text: string) {
    setErr(null);
    const r = await api.dm.sendMessage(id, text);
    if (!r.ok) setErr(r.reason === 'request_limit' ? 'Request limit hit. Resets at midnight.' : r.reason === 'cannot_send' ? 'You can’t message this person.' : r.reason === 'locked' ? 'DMs unlock after verification.' : 'Could not send. Try again.');
    state.reload();
  }
  async function photo(userId: string) {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (r.canceled || !r.assets[0]) return;
      const res = await api.dm.sharePhoto(userId, { name: r.assets[0].fileName ?? 'Photo' });
      if (!res.ok) setErr('Could not send the photo.');
      state.reload();
    } catch { setErr('Could not open your photos. Try again.'); }
  }

  if (state.status === 'loading') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><SkeletonList rows={5} /></SafeAreaView>;
  if (state.status === 'error') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><ErrorState onRetry={state.reload} /></SafeAreaView>;
  const v = state.data;
  const first = v.person.name.split(' ')[0];
  const lastReadIdx = (() => { for (let i = v.messages.length - 1; i >= 0; i--) if (v.messages[i].mine && v.messages[i].readAtMs) return i; return -1; })();
  const status = v.typing ? 'typing…' : v.person.online ? 'Active now' : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BackBar right={<IconButton icon="more" label="Chat options" onPress={() => setMenu((m) => !m)} />}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar initials={v.person.initials} tint={v.person.tint} size={40} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T size={15} f="bold" numberOfLines={1} accessibilityRole="header">{v.person.name}</T>
                {v.person.verified ? <Icon name="check" size={13} color={color.lime} stroke={3} /> : null}
              </View>
              {status ? <T size={12} c={color.inkMuted}>{status}</T> : null}
            </View>
          </View>
        </BackBar>
        {menu ? (
          <View accessibilityRole="menu" style={{ position: 'absolute', right: 16, top: 64, zIndex: 10, width: 230, borderRadius: 14, backgroundColor: color.surfaceRaised, borderWidth: 1, borderColor: color.line, paddingVertical: 4 }}>
            {[
              { label: v.myReceiptsOn ? 'Turn off read receipts' : 'Turn on read receipts', run: async () => { await api.dm.setReadReceipts(!v.myReceiptsOn); } },
              { label: v.muted ? 'Unmute' : 'Mute', run: async () => { await api.dm.setChatMuted(id, !v.muted); } },
              { label: 'Report', run: async () => router.push({ pathname: '/report', params: { kind: 'dm', id } } as never), hot: true },
              { label: `Block ${first}`, run: async () => { await api.dm.blockPerson(id); } },
            ].map((it) => (
              <Pressable key={it.label} accessibilityRole="menuitem" accessibilityLabel={it.label} onPress={async () => { setMenu(false); await it.run(); state.reload(); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 }}>
                <T size={14} f="semi" c={it.hot ? color.hot : color.ink}>{it.label}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
        {!online ? <View style={{ paddingHorizontal: 16 }}><OfflineBanner message={`You’re offline · showing messages from ${ago()}. Messages send when you’re back.`} /></View> : null}
        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}>
          {v.messages.length === 0 ? <T size={13} c={color.inkMuted} style={{ textAlign: 'center', marginTop: 24 }}>{`No messages yet. Say hi to ${first}.`}</T> : null}
          {v.messages.map((m, i) => (
            <View key={m.id} style={{ gap: 6 }}>
              {i === 0 || dayKey(m.atMs) !== dayKey(v.messages[i - 1].atMs) ? <T size={11} f="bold" c={color.inkMuted} style={{ textAlign: 'center', letterSpacing: 1, marginVertical: 4 }}>{dayLabel(m.atMs)}</T> : null}
              <Bubble m={m} />
              {i === lastReadIdx && m.readAtMs ? <T size={11} c={color.inkMuted} style={{ textAlign: 'right' }}>{`Read ${fmtTime(m.readAtMs)}`}</T> : null}
            </View>
          ))}
          {v.typing ? <View accessibilityLabel={`${first} is typing`} style={{ flexDirection: 'row', gap: 4, backgroundColor: color.surface, alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.inkMuted }} />)}</View> : null}
        </ScrollView>
        {err ? <T size={12} c={color.error} accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingBottom: 4 }}>{err}</T> : null}
        <ComposerArea v={v} onSend={send} onPhoto={() => photo(v.person.userId)} reload={state.reload} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

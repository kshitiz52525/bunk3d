import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type ProfileItem, type ProfileTab, type Ticket } from '@bunk3d/api';

type Tab = 'My posts' | 'My notes' | 'Saved' | 'Tickets';
const TABS: Tab[] = ['My posts', 'My notes', 'Saved', 'Tickets'];
const TAB_KEY: Record<Exclude<Tab, 'Tickets'>, ProfileTab> = { 'My posts': 'posts', 'My notes': 'notes', Saved: 'saved' };
const EMPTY: Record<Exclude<Tab, 'Tickets'>, { title: string; body: string; label: string; to: string }> = {
  'My posts': { title: 'No posts yet.', body: 'Say something to your campus.', label: 'Go to Tea', to: '/tea' },
  'My notes': { title: 'No notes yet.', body: 'Upload a note or a past paper and help the next batch.', label: 'Go to Study', to: '/study' },
  Saved: { title: 'Nothing saved yet.', body: 'Save posts and notes to find them here, even offline.', label: 'Go to Tea', to: '/tea' },
};
const TILE: Record<ProfileItem['tileKind'], { bg: string; fg: string }> = {
  named: { bg: color.lime, fg: color.onLime }, anon: { bg: color.anonTile, fg: color.violet }, pyq: { bg: color.hot, fg: color.onLime },
  note: { bg: color.info, fg: color.onLime }, tea: { bg: '#26262D', fg: color.ink },
};

function Items({ tab }: { tab: Exclude<Tab, 'Tickets'> }) {
  const api = useApi();
  const s = useAsync(() => api.you.myContent(TAB_KEY[tab]), [tab]);
  if (s.status === 'loading') return <SkeletonList rows={3} />;
  if (s.status === 'error') return <ErrorState onRetry={s.reload} />;
  if (!s.data.length) return <EmptyState title={EMPTY[tab].title} body={EMPTY[tab].body} action={{ label: EMPTY[tab].label, onPress: () => router.push(EMPTY[tab].to as never) }} />;
  return (
    <View style={{ gap: 8 }}>
      {s.data.map((i) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 12 }}>
          <View aria-hidden style={{ minWidth: 44, height: 44, paddingHorizontal: 6, borderRadius: 12, backgroundColor: TILE[i.tileKind].bg, alignItems: 'center', justifyContent: 'center' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: TILE[i.tileKind].fg }}>{i.tile}</RNText>
          </View>
          <View style={{ flex: 1 }}>
            <RNText numberOfLines={2} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{i.title}</RNText>
            <RNText numberOfLines={1} style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted, marginTop: 2 }}>{i.meta}</RNText>
          </View>
        </View>
      ))}
    </View>
  );
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const clockOf = (ms: number) => { const d = new Date(ms); const h = d.getHours(); const m = d.getMinutes(); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h >= 12 ? 'PM' : 'AM'}`; };
const PAST_LABEL: Record<Ticket['status'], string> = { valid: '', used: 'USED', cancelled: 'CANCELLED', refunded: 'REFUNDED' };

function TicketRow({ t, past }: { t: Ticket; past: boolean }) {
  const d = new Date(t.startsAt);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${t.eventTitle}${past ? '' : ', open ticket'}`} onPress={() => router.push({ pathname: '/ticket/[eventId]', params: { eventId: t.eventId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 12, opacity: past ? 0.8 : 1 }}>
      <View aria-hidden style={{ width: 48, height: 52, borderRadius: 12, backgroundColor: past ? '#26262D' : color.lime, alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: past ? color.inkMuted : color.onLime }}>{MON[d.getMonth()]}</RNText>
        <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: past ? color.ink : color.onLime }}>{String(d.getDate()).padStart(2, '0')}</RNText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 0.8, color: color.inkMuted }}>{past ? PAST_LABEL[t.status] : `${DOW[d.getDay()].toUpperCase()} · DOORS ${clockOf(t.doorsAt)}`}</RNText>
        <RNText numberOfLines={1} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{t.eventTitle}</RNText>
        <RNText numberOfLines={1} style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{[t.venue, t.teamName ? `team ${t.teamName}` : null, t.paidPaise ? null : 'free'].filter(Boolean).join(' · ')}</RNText>
      </View>
      {!past ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.ink }}>QR ›</RNText> : null}
    </Pressable>
  );
}

/** Tickets from `poppin.myTickets()`. Only the owner sees this tab; tickets open offline. */
function Tickets() {
  const api = useApi();
  const s = useAsync(() => api.poppin.myTickets(), []);
  const [now] = useState(() => Date.now());
  if (s.status === 'loading') return <SkeletonList rows={2} />;
  if (s.status === 'error') return <ErrorState onRetry={s.reload} />;
  if (s.data.length === 0) return <EmptyState title="No tickets yet." body="Tickets you get for events show up here and work offline." action={{ label: 'Find an event', onPress: () => router.push('/poppin') }} />;
  const upcoming = s.data.filter((t) => t.status === 'valid' && t.startsAt >= now);
  const past = s.data.filter((t) => !upcoming.includes(t));
  return (
    <View style={{ gap: 8 }}>
      {upcoming.length ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted }}>UPCOMING · {upcoming.length}</RNText> : null}
      {upcoming.map((t) => <TicketRow key={t.id} t={t} past={false} />)}
      {past.length ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted, marginTop: 6 }}>PAST</RNText> : null}
      {past.map((t) => <TicketRow key={t.id} t={t} past />)}
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Tickets work offline. Only you see this tab.</RNText>
    </View>
  );
}

/** P1 My profile. Karma is private: shown to the owner only. */
export default function MyProfile() {
  const api = useApi();
  const p = useAsync(() => api.you.myProfile(), []);
  const mod = useAsync(() => api.safety.modStatus(), []);
  const [tab, setTab] = useState<Tab>('My posts');
  const d = p.data;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, paddingTop: 4 }}>
          <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/tea'))} />
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>
        {p.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {p.status === 'error' ? <ErrorState onRetry={p.reload} /> : null}
        {d ? (
          <View style={{ gap: 14, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View aria-hidden style={{ width: 72, height: 72, borderRadius: 26, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, color: color.onLime }}>{d.initials}</RNText>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, letterSpacing: -0.6, color: color.ink }}>{d.name}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>@{d.username} · {d.dept} · {d.year} yr</RNText>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {d.verified ? <View style={{ backgroundColor: '#12301F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.success }}>✓ Verified</RNText></View> : null}
                  {d.isMod ? <View style={{ backgroundColor: color.modTile, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.modInk }}>Campus Mod</RNText></View> : null}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14 }}>
              <View>
                <RNText accessibilityLabel={`Karma ${d.karma}`} style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 28, color: color.ink }}>{d.karma}</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>KARMA</RNText>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" size={14} color={color.inkMuted} />
                <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Only you see this. Nobody gets ranked.</RNText>
              </View>
            </View>
            {d.isMod ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Mod queue" onPress={() => router.push('/mod')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, backgroundColor: color.modTile, borderRadius: 16, paddingHorizontal: 14 }}>
                <Icon name="shield" size={20} color={color.modInk} />
                <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Mod queue</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.modInk }}>{mod.data ? `${mod.data.waiting} waiting` : ''}</RNText>
              </Pressable>
            ) : null}
            {d.clubs.length ? (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {d.clubs.map((c) => <View key={c.id} style={{ borderRadius: 999, borderWidth: 1, borderColor: '#2E2E36', paddingHorizontal: 12, paddingVertical: 8 }}><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9C9C3' }}>{c.name}{c.role === 'admin' ? ' · admin' : ''}</RNText></View>)}
              </View>
            ) : null}
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.line }}>
              {TABS.map((t) => (
                <Pressable key={t} accessibilityRole="tab" accessibilityLabel={t} accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: tab === t ? color.lime : 'transparent' }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: tab === t ? color.ink : color.inkMuted }}>{t}</RNText>
                </Pressable>
              ))}
            </View>
            {tab === 'Tickets' ? <Tickets /> : <Items tab={tab} />}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

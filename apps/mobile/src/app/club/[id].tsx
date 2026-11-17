import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type ClubDetail } from '@bunk3d/api';
import { Avatar, BackBar, ClubTile, T, Tag, fmtDate, timeAgo } from '@/features/crew/parts';

const TABS = ['Posts', 'About', 'Events', 'Members'] as const;
type Tab = (typeof TABS)[number];

function JoinLabel({ c }: { c: ClubDetail }) {
  return <>{c.state === 'joined' ? 'Member' : c.state === 'pending' ? 'Requested' : c.join === 'approval' ? 'Request to join' : 'Join club'}</>;
}

/** C2 Club page. */
export default function ClubPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const [tab, setTab] = useState<Tab>('Posts');
  const club = useAsync(() => api.crew.getClub(id), [id]);
  const posts = useAsync(() => api.crew.listClubPosts(id), [id]);
  const events = useAsync(() => api.crew.listClubEvents(id), [id]);
  const members = useAsync(() => api.crew.listClubMembers(id), [id]);
  const [muted, setMuted] = useState(false);
  const insets = useSafeAreaInsets();

  async function toggleJoin(c: ClubDetail) {
    if (c.state === 'none') await api.crew.joinClub(c.id);
    else await api.crew.leaveClub(c.id);
    club.reload();
    members.reload();
  }

  if (club.status === 'loading') return <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: 60 }}><SkeletonList rows={4} /></View>;
  if (club.status === 'error') return <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: 60 }}><BackBar /><ErrorState onRetry={club.reload} /></View>;
  const c = club.data;
  const joined = c.state === 'joined';

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: 150, backgroundColor: c.tint, paddingTop: insets.top, justifyContent: 'flex-start' }}>
          <BackBar />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -40 }}>
            <View style={{ borderWidth: 3, borderColor: color.bg, borderRadius: 20 }}><ClubTile short={c.short} tint={c.tint} size={64} /></View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <T size={24} f="display" accessibilityRole="header" style={{ flexShrink: 1 }}>{c.name}</T>
            {c.verified ? <Tag label="Verified club" bg={color.modTile} fg={color.modInk} /> : null}
          </View>
          <T size={13} c={color.inkMuted}>{`${c.category} · ${c.members} members · ${c.join === 'open' ? 'open to join' : 'approval to join'}`}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={c.state === 'joined' ? 'Member, tap to leave' : c.state === 'pending' ? 'Requested, tap to withdraw' : c.join === 'approval' ? 'Request to join' : 'Join club'} onPress={() => toggleJoin(c)} style={{ flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.state === 'none' ? color.lime : 'transparent', borderWidth: c.state === 'none' ? 0 : 1.5, borderColor: '#4A4A54' }}>
              <T size={14} f="bold" c={c.state === 'none' ? color.onLime : color.ink}><JoinLabel c={c} /></T>
            </Pressable>
            {joined ? <IconButton icon="chat" label="Club chat" onPress={() => router.push({ pathname: '/club-chat/[id]', params: { id: c.id } })} /> : null}
            {joined ? <IconButton icon={muted ? 'crewBellOff' : 'bell'} label={muted ? 'Unmute notifications for this club' : 'Notification settings for this club'} onPress={async () => { setMuted(!muted); await api.crew.setChannelMuted(c.id, !muted); }} /> : null}
          </View>
        </View>

        <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.line, marginTop: 8, paddingHorizontal: 8 }}>
          {TABS.map((t) => (
            <Pressable key={t} accessibilityRole="tab" accessibilityLabel={t} accessibilityState={{ selected: t === tab }} onPress={() => setTab(t)} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: t === tab ? color.lime : 'transparent' }}>
              <T size={14} f="bold" c={t === tab ? color.ink : color.inkMuted}>{t}</T>
            </Pressable>
          ))}
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {tab === 'Posts' ? (
            posts.status === 'loading' ? <SkeletonList rows={2} /> : posts.status === 'error' ? <ErrorState onRetry={posts.reload} /> :
            posts.data.length === 0 ? <EmptyState title="No posts yet." body="Club posts show up here." action={{ label: joined ? 'Open club chat' : 'Join club', onPress: () => (joined ? router.push({ pathname: '/club-chat/[id]', params: { id: c.id } }) : toggleJoin(c)) }} /> : (
              <>
                {posts.data.map((p) => (
                  <View key={p.id} style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ClubTile short={c.short} tint={c.tint} size={36} />
                      <View style={{ flex: 1 }}>
                        <T size={14} f="bold">{c.name} <T size={12} c={color.inkMuted}>{`· posted by ${p.postedBy.name}${p.postedBy.role !== 'member' ? ' (admin)' : ''}`}</T></T>
                        <T size={12} c={color.inkMuted}>{timeAgo(p.atMs)}</T>
                      </View>
                    </View>
                    <T size={14} style={{ lineHeight: 20 }}>{p.body}</T>
                    {p.event ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`RSVP, ${p.event.title}`} onPress={() => router.push(`/event/${p.event!.id}` as never)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, backgroundColor: color.surfaceRaised, paddingHorizontal: 12 }}>
                        <T size={11} f="bold" c={color.lime}>{fmtDate(p.event.dateMs).toUpperCase()}</T>
                        <T size={14} f="semi" style={{ flex: 1 }}>{p.event.title}</T>
                        <T size={13} f="bold">RSVP</T>
                        <Icon name="chevronRight" size={14} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <T size={12} c={color.inkMuted} style={{ textAlign: 'center' }}>Club posts are always named. No anon here.</T>
              </>
            )
          ) : null}

          {tab === 'About' ? (
            <>
              <T size={14} style={{ lineHeight: 21 }}>{c.about}</T>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[[c.members, 'members'], [c.eventCount, 'events'], [c.adminCount, 'admins']].map(([n, l]) => (
                  <View key={String(l)} style={{ flex: 1, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12, alignItems: 'center' }}>
                    <T size={20} f="display">{String(n)}</T>
                    <T size={12} c={color.inkMuted}>{String(l)}</T>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {tab === 'Events' ? (
            events.status === 'loading' ? <SkeletonList rows={2} /> : events.status === 'error' ? <ErrorState onRetry={events.reload} /> :
            events.data.length === 0 ? <EmptyState title="No events yet." body="Upcoming club events show up here." action={{ label: 'Back to posts', onPress: () => setTab('Posts') }} /> :
            events.data.map((e) => {
              const d = new Date(e.startsAtMs);
              return (
                <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`${e.title}, ${e.going} going`} onPress={() => router.push(`/event/${e.id}` as never)} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                  <View style={{ width: 48, alignItems: 'center' }}>
                    <T size={11} f="bold" c={color.lime}>{fmtDate(e.startsAtMs).split(' ')[2].toUpperCase()}</T>
                    <T size={20} f="display">{d.getDate()}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T size={15} f="bold">{e.title}</T>
                    <T size={12} c={color.inkMuted}>{`${e.going} going`}</T>
                  </View>
                </Pressable>
              );
            })
          ) : null}

          {tab === 'Members' ? (
            members.status === 'loading' ? <SkeletonList rows={3} /> : members.status === 'error' ? <ErrorState onRetry={members.reload} /> :
            members.data.length === 0 ? <EmptyState title="No members to show." body="Join the club to be the first." action={{ label: 'Join club', onPress: () => toggleJoin(c) }} /> :
            members.data.map((m) => (
              <View key={m.userId} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar initials={m.initials} tint={color.violet} size={40} />
                <T size={15} f="semi" style={{ flex: 1 }}>{m.name}</T>
                <T size={12} f="bold" c={m.role === 'member' ? color.inkMuted : color.modInk}>{m.role === 'member' ? 'Member' : 'Admin'}</T>
              </View>
            ))
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

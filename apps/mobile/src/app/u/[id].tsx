import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, IconButton, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, Pill, SectionLabel } from '@/features/you/ui';

/** P2 Other profile. Never shows phone, email, date of birth or karma; named posts only. */
export default function OtherProfile() {
  const api = useApi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useAsync(() => api.you.userProfile(String(id)), [id]);
  const [menu, setMenu] = useState(false);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'Posts' | 'Notes'>('Posts');
  const [err, setErr] = useState(false);
  const d = p.data;
  const isBlocked = blocked ?? d?.blocked ?? false;

  const toggleBlock = async () => {
    setErr(false);
    try {
      if (isBlocked) await api.safety.unblockUser(String(id)); else await api.safety.blockUser(String(id));
      setBlocked(!isBlocked);
    } catch { setErr(true); }
  };
  const report = () => router.push({ pathname: '/report', params: { targetKind: 'user', targetId: String(id) } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, paddingTop: 4 }}>
          <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/tea'))} />
          {d && !d.isSelf ? <IconButton icon="more" label="Block or report" onPress={() => setMenu(!menu)} /> : null}
        </View>
        {p.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {p.status === 'error' ? <ErrorState onRetry={p.reload} /> : null}
        {d ? (
          <View style={{ gap: 12, marginTop: 6 }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View aria-hidden style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 28, color: color.onLime }}>{d.initials}</RNText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, letterSpacing: -0.6, color: color.ink }}>{d.name}</RNText>
                {d.verified ? <View style={{ backgroundColor: '#12301F', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.success }}>✓ Verified</RNText></View> : null}
              </View>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>@{d.username} · {d.dept} · {d.year}</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#C9C9C3', textAlign: 'center' }}>{d.bio}</RNText>
            </View>
            {!d.isSelf ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="Message" onPress={() => router.push('/dms')} style={{ flex: 1 }} disabled={isBlocked} />
                {d.connected ? <Btn label="Connected ✓" kind="ghost" onPress={() => {}} disabled style={{ flex: 1 }} /> : null}
              </View>
            ) : null}
            {menu && !d.isSelf ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={isBlocked ? 'Unblock' : 'Block'} kind="ghost" small onPress={toggleBlock} style={{ flex: 1 }} />
                <Btn label="Report" kind="ghost" small onPress={report} style={{ flex: 1 }} />
              </View>
            ) : null}
            {isBlocked ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.inkMuted }}>Blocked. They can’t see you or message you.</RNText> : null}
            {err ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error }}>Couldn’t do that. Try again.</RNText> : null}
            {d.clubs.length ? (
              <View>
                <SectionLabel>CLUBS</SectionLabel>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {d.clubs.map((c) => <View key={c.id} style={{ borderRadius: 999, borderWidth: 1, borderColor: '#2E2E36', paddingHorizontal: 12, paddingVertical: 8 }}><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9C9C3' }}>{c.name}{c.role === 'admin' ? ' · admin' : ''}</RNText></View>)}
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pill label="Posts" selected={tab === 'Posts'} onPress={() => setTab('Posts')} />
              <Pill label="Notes" selected={tab === 'Notes'} onPress={() => setTab('Notes')} />
            </View>
            {tab === 'Posts' ? (
              d.posts.length ? (
                <View style={{ gap: 8 }}>
                  {d.posts.map((x) => (
                    <View key={x.id} style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 4 }}>
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, lineHeight: 20, color: color.ink }}>{x.title}</RNText>
                      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{x.meta}</RNText>
                    </View>
                  ))}
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Only named posts show here. Karma is private.</RNText>
                </View>
              ) : (
                <EmptyState title="No posts yet." body="Only named posts show here." action={{ label: 'Back', onPress: () => router.back() }} />
              )
            ) : (
              <EmptyState title="No notes shared yet." body="Notes they upload will show here." action={{ label: 'Back', onPress: () => router.back() }} />
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

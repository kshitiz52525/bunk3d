import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { INVITE_TIMES, useApi, useAsync, type ReceivedInvite, type SentInvite } from '@bunk3d/api';
import { Avatar, Btn, Pill, TopBar } from '@/features/you/ui';

const STATUS: Record<SentInvite['status'], { text: string; color: string }> = {
  sent: { text: 'Sent', color: color.inkMuted },
  accepted: { text: 'Accepted ✓', color: color.success },
  suggested: { text: 'New time suggested', color: color.warning },
  expired: { text: 'Expired', color: color.inkMuted },
};

function Received({ inv, onChanged }: { inv: ReceivedInvite; onChanged: () => void }) {
  const api = useApi();
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState(false);
  const reply = async (kind: 'accept' | 'suggest' | 'decline', time?: string) => {
    setErr(false);
    try { await api.discover.respondInvite(inv.id, kind, time); setPicking(false); onChanged(); } catch { setErr(true); }
  };
  const done = inv.reply
    ? inv.reply.kind === 'accept' ? ['Accepted · chat opened ›', color.success] : inv.reply.kind === 'suggest' ? [`Suggested ${inv.reply.suggestedTime} · waiting`, color.warning] : ['Declined quietly', color.inkMuted]
    : null;
  return (
    <View style={{ backgroundColor: color.surface, borderRadius: 18, borderWidth: 1, borderColor: '#2E2E36', padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar initials={inv.initials} tint={inv.tint} />
        <View style={{ flex: 1 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{inv.fromName}</RNText>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{inv.meta}</RNText>
        </View>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.warning }}>{inv.hoursLeft}h left</RNText>
      </View>
      <View style={{ gap: 2 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{inv.plan} · {inv.when}</RNText>
        <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#C9C9C3' }}>{inv.where}</RNText>
        {inv.message ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted, fontStyle: 'italic' }}>“{inv.message}”</RNText> : null}
      </View>
      {!done ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Accept" small onPress={() => reply('accept')} style={{ flex: 1 }} />
            <Btn label="Suggest time" small kind="ghost" onPress={() => setPicking(!picking)} style={{ flex: 1 }} />
            <Btn label="Decline" small kind="ghost" onPress={() => reply('decline')} style={{ flex: 1 }} />
          </View>
          {picking ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {INVITE_TIMES.filter((t) => t !== inv.when).map((t) => <Pill key={t} label={t} onPress={() => reply('suggest', t)} />)}
            </View>
          ) : null}
          {err ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.error }}>Couldn’t send that. Try again.</RNText> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: color.inkMuted }}>Declines are silent</RNText>
            <Pressable accessibilityRole="button" accessibilityLabel="Report" onPress={() => router.push({ pathname: '/report', params: { targetKind: 'invite', targetId: inv.id } })} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>Report</RNText></Pressable>
          </View>
        </>
      ) : (
        <Pressable accessibilityRole={inv.reply?.kind === 'accept' ? 'button' : 'text'} onPress={() => inv.reply?.kind === 'accept' && router.push('/dms')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: done[1] }}>{done[0]}</RNText>
        </Pressable>
      )}
    </View>
  );
}

/** SP4 Invites: received (accept, suggest a time, decline quietly) and sent. A decline never shows to the sender. */
export default function Invites() {
  const api = useApi();
  const inv = useAsync(() => api.discover.invites(), []);
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const d = inv.data;
  const pending = d?.received.filter((i) => !i.reply).length ?? 0;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <TopBar title="Invites" />
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: color.surface, borderRadius: 999, padding: 3, marginVertical: 12 }}>
          {([['in', `Received · ${pending}`], ['out', `Sent · ${d?.sent.length ?? 0}`]] as const).map(([k, label]) => (
            <Pressable key={k} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === k ? color.lime : 'transparent' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: tab === k ? color.onLime : color.inkMuted }}>{label}</RNText>
            </Pressable>
          ))}
        </View>
        {inv.status === 'loading' ? <SkeletonList rows={2} /> : null}
        {inv.status === 'error' ? <ErrorState onRetry={inv.reload} /> : null}
        {d && tab === 'in' ? (
          <View style={{ gap: 12 }}>
            {d.received.length === 0 ? <EmptyState title="No invites yet." body="When someone sends you a plan, it shows up here." action={{ label: 'Back to the deck', onPress: () => router.back() }} /> : null}
            {d.received.map((i) => <Received key={i.id} inv={i} onChanged={inv.reload} />)}
          </View>
        ) : null}
        {d && tab === 'out' ? (
          <View style={{ gap: 8 }}>
            {d.sent.length === 0 ? <EmptyState title="Nothing sent yet." body="A real plan beats a “hey”. Pick someone from the deck." action={{ label: 'Back to the deck', onPress: () => router.back() }} /> : null}
            {d.sent.map((o) => (
              <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                <Avatar initials={o.initials} tint={o.tint} />
                <View style={{ flex: 1 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{o.toName}</RNText>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{o.plan} · {o.when}{o.suggestedTime ? ` (they suggested ${o.suggestedTime})` : ''}</RNText>
                </View>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: STATUS[o.status].color }}>{STATUS[o.status].text}</RNText>
              </View>
            ))}
            {d.sent.length ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted, marginTop: 6 }}>Unanswered invites expire after 48h. You never see who declined.</RNText> : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

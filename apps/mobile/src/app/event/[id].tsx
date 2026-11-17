import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, OfflineBanner, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { WAITLIST_HOLD_MS, formatPaise } from '@bunk3d/core';
import { useApi, type EventDetail } from '@bunk3d/api';
import { ago, useCachedAsync } from '@/features/poppin/cache';
import { clock, dayNum, dow, mon } from '@/features/poppin/format';
import { TINT } from '@/features/poppin/ui';

// E2 Event detail. States: open, going, waitlist, full, cancelled, ended (results), paid, team event.
function Big({ label, onPress, kind = 'primary', disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean }) {
  const p = kind === 'primary';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={{ flex: p ? 1 : undefined, minHeight: 52, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: p ? color.lime : color.surfaceRaised, opacity: disabled ? 0.5 : 1, boxShadow: p ? `4px 4px 0 ${color.violet}` : undefined }}>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: p ? color.onLime : color.ink }}>{label}</RNText>
    </Pressable>
  );
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const ev = useCachedAsync(`poppin.event.${id}`, () => api.poppin.getEvent(id), [id]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const e: EventDetail | null | undefined = ev.status === 'ready' ? ev.data : undefined;
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); ev.reload(); } catch { setMsg('That didn’t go through. Try again.'); } finally { setBusy(false); }
  };
  const rsvp = () => act(async () => {
    if (!e) return;
    const r = await api.poppin.rsvp(e.id);
    if (!r.ok && r.reason === 'payment_required') router.push(`/checkout/${e.id}`);
    else if (!r.ok && r.reason === 'cancelled') setMsg('This event was cancelled.');
    else if (!r.ok && r.reason === 'ended') setMsg('This event has ended.');
  });
  const leave = () => act(async () => { if (e) await api.poppin.cancelRsvp(e.id); });
  const share = async () => { if (e) { try { await Share.share({ message: `${e.title} · ${e.hostName} on Bunk3d` }); } catch { /* sharing unavailable */ } } };

  if (ev.status === 'loading') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><SkeletonList rows={4} /></SafeAreaView>;
  if (ev.status === 'error') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><ErrorState onRetry={ev.reload} /></SafeAreaView>;
  if (!e) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><EmptyState title="That event isn’t here." body="It may have been removed." action={{ label: 'See other events', onPress: () => router.back() }} /></SafeAreaView>;

  const t = TINT[e.tint];
  const cancelled = e.status === 'cancelled';
  const ended = e.status === 'ended';
  const pct = e.capacity ? Math.min(100, Math.round((e.goingCount / e.capacity) * 100)) : 0;
  const holdHours = WAITLIST_HOLD_MS / 3_600_000;
  const refundNote = e.refundIfCancelledPaise !== undefined && e.my === 'going' ? `Refund if you cancel now: ${formatPaise(e.refundIfCancelledPaise)}` : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ backgroundColor: t.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, minHeight: 190, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={22} color={color.lime} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={share} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="share" size={20} color={color.lime} />
            </Pressable>
          </View>
          <View>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: 1, color: color.onLime }}>{e.category.toUpperCase()} · {e.ticketKind === 'paid' && e.pricePaise ? formatPaise(e.pricePaise) : 'FREE'}</RNText>
            <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 28, letterSpacing: -1, lineHeight: 30, color: color.onLime, marginTop: 4 }}>{e.title}</RNText>
          </View>
        </View>
        <View style={{ padding: 16, gap: 14 }}>
          {ev.offlineSince ? <OfflineBanner message={`offline · showing this event from ${ago(ev.offlineSince)}`} /> : null}
          {cancelled ? (
            <StateCard domain="POPPIN’" kind="err" title="Event cancelled" body={`${e.hostName} cancelled ${e.title}. Removed from your calendar.${e.ticketKind === 'paid' && e.myTicketId ? ' Your payment is refunded automatically.' : ''}`} cta={{ label: 'See other events', onPress: () => router.back() }} />
          ) : null}
          {e.my === 'waitlist' ? (
            <StateCard domain="POPPIN’" kind="wait" title={`Full — you’re #${e.waitlistPosition} on waitlist`} body={`If a spot opens we’ll push you and hold it for ${holdHours} hours.`} cta={{ label: 'Leave waitlist', onPress: leave }} />
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 11, color: color.onLime }}>{e.hostName.split(' ').map((w) => w[0]).join('').slice(0, 3)}</RNText>
            </View>
            <View style={{ flex: 1 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{e.hostName}{e.hostVerified ? ' ✓ Club' : ''}</RNText>
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>Host</RNText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>WHEN</RNText>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink, marginTop: 4 }}>{dow(e.startsAt)} {dayNum(e.startsAt)} {mon(e.startsAt).charAt(0) + mon(e.startsAt).slice(1).toLowerCase()}</RNText>
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{clock(e.startsAt)} → {dow(e.endsAt) === dow(e.startsAt) ? clock(e.endsAt) : `${dow(e.endsAt)} ${clock(e.endsAt)}`}</RNText>
            </View>
            <Pressable accessibilityRole="link" accessibilityLabel={`Open ${e.venue} in Maps`} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue)}`)} style={{ flex: 1, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>WHERE</RNText>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink, marginTop: 4 }}>{e.venue}</RNText>
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.info }}>Open in Maps ›</RNText>
            </Pressable>
          </View>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 23, color: '#C9C9C3' }}>{e.description}</RNText>
          {e.capacity && !cancelled ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>{e.goingCount} / {e.capacity} going</RNText>
                {!ended && !cancelled ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>RSVP by {dow(e.rsvpBy)}</RNText> : null}
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: color.line }}><View style={{ height: 8, borderRadius: 4, width: `${pct}%`, backgroundColor: e.status === 'full' ? color.warning : color.lime }} /></View>
            </View>
          ) : null}
          {e.friendsLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row' }}>
                {e.friendInitials.slice(0, 3).map((i, k) => (
                  <View key={i + k} aria-hidden style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: [color.info, color.violet, color.success][k % 3], marginLeft: k ? -8 : 0, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color.bg }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 9, color: color.onLime }}>{i}</RNText>
                  </View>
                ))}
              </View>
              <RNText style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9C9C3' }}>{e.friendsLabel}</RNText>
            </View>
          ) : null}
          {e.rules ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{e.rules}</RNText> : null}
          {e.ticketKind === 'paid' && !ended && !cancelled ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Refunds: full refund until 48 h before, none after. Automatic if the host cancels.</RNText> : null}
          {refundNote ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{refundNote}</RNText> : null}
          {msg ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>{msg}</RNText> : null}
        </View>
      </ScrollView>
      {!cancelled && e.my !== 'waitlist' ? (
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: '#222228' }}>
          {ended ? (
            e.resultsPublished ? <Big label="See results" onPress={() => router.push(`/results/${e.id}`)} /> : <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.inkMuted, textAlign: 'center', paddingVertical: 14 }}>This event has ended.</RNText>
          ) : e.my === 'going' ? (
            <>
              <Big label="Going ✓ · View ticket" onPress={() => router.push(`/ticket/${e.id}`)} />
              <Big kind="ghost" label="Can’t go" disabled={busy} onPress={leave} />
            </>
          ) : (
            <>
              {e.teamEvent ? <Big kind="ghost" label="Team" onPress={() => router.push(`/team/${e.id}`)} /> : null}
              {e.ticketKind === 'paid' ? (
                <Big label="Get tickets" disabled={busy} onPress={() => router.push(`/checkout/${e.id}`)} />
              ) : e.status === 'full' ? (
                <Big label="Join waitlist" disabled={busy} onPress={rsvp} />
              ) : (
                <Big label="I’m going" disabled={busy} onPress={rsvp} />
              )}
            </>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text as RNText, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, OfflineBanner, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { QR_ROTATE_MS, formatPaise, ticketQrPayload, ticketQrSecondsLeft } from '@bunk3d/core';
import { useApi } from '@bunk3d/api';
import { ago, useCachedAsync } from '@/features/poppin/cache';
import { clock, dayNum, mon, mmss } from '@/features/poppin/format';
import { RouteFrame, TINT } from '@/features/poppin/ui';

// E3 Ticket. Works offline: the ticket (with its secret) is cached on the device and the QR is computed locally.
// The code rotates every 60 s. If the app was paused for longer than that, the S1 "Old QR" state shows until reopened.
export default function TicketScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const api = useApi();
  const tk = useCachedAsync(`poppin.ticket.${eventId}`, () => api.poppin.ticket(eventId), [eventId]);
  const [now, setNow] = useState(() => Date.now());
  const [stale, setStale] = useState<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const tick = () => {
      const t = Date.now();
      if (t - last.current >= QR_ROTATE_MS) setStale(Math.max(1, Math.floor((t - last.current) / 60_000)));
      last.current = t;
      setNow(t);
    };
    const i = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') tick(); });
    return () => { clearInterval(i); sub.remove(); };
  }, []);

  const t = tk.status === 'ready' ? tk.data : undefined;
  const live = t && t.status === 'valid';
  const payload = live ? ticketQrPayload({ ticketId: t.id, secret: t.qrSecret, nowMs: now }) : '';
  const left = ticketQrSecondsLeft(now);
  const tint = t ? TINT[t.tint] : TINT.lime;

  return (
    <RouteFrame title="Your ticket" right={tk.status === 'ready' && live ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.surfaceRaised, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
        <Icon name="wifiOff" size={14} color={color.success} />
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.success }}>Works offline</RNText>
      </View>
    ) : null}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}>
        {tk.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {tk.status === 'error' ? <ErrorState onRetry={tk.reload} /> : null}
        {tk.status === 'ready' && tk.offlineSince ? <OfflineBanner message={`offline · showing your ticket saved ${ago(tk.offlineSince)}`} /> : null}
        {tk.status === 'ready' && !t ? <EmptyState title="No ticket yet." body="RSVP to get one." action={{ label: 'See the event', onPress: () => router.back() }} /> : null}
        {t && t.status === 'cancelled' || t?.status === 'refunded' ? (
          <StateCard domain="POPPIN’" kind="err" title="Event cancelled" body={`${t.hostName} cancelled ${t.eventTitle}. Removed from your calendar.${t.paidPaise ? ' Your payment is refunded automatically.' : ''}`} cta={{ label: 'See other events', onPress: () => router.back() }} />
        ) : null}
        {t && (t.status === 'valid' || t.status === 'used') ? (
          <>
            <View style={{ backgroundColor: color.bg, borderRadius: 24, overflow: 'hidden' }}>
              <View style={{ backgroundColor: tint.bg, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.onLime }}>{t.hostName.toUpperCase()} PRESENTS</RNText>
                  <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, letterSpacing: -1, lineHeight: 26, color: color.onLime, marginTop: 4 }}>{t.eventTitle}</RNText>
                </View>
                <View style={{ alignItems: 'center', backgroundColor: color.bg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, color: color.ink }}>{dayNum(t.startsAt)}</RNText>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.lime }}>{mon(t.startsAt)}</RNText>
                </View>
              </View>
              <View style={{ backgroundColor: color.bg, padding: 20, alignItems: 'center', gap: 12 }}>
                {t.status === 'used' ? (
                  <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
                    <Icon name="poppinCheckCircle" size={64} color={color.success} />
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.ink }}>Checked in</RNText>
                  </View>
                ) : stale !== null ? (
                  <View style={{ alignSelf: 'stretch' }}>
                    <StateCard domain="POPPIN’" kind="err" title="Old QR" body={`That code expired ${stale} minute${stale === 1 ? '' : 's'} ago. Codes refresh every ${QR_ROTATE_MS / 1000} s so screenshots don’t work.`} cta={{ label: 'Reopen ticket', onPress: () => { last.current = Date.now(); setStale(null); setNow(Date.now()); } }} />
                  </View>
                ) : (
                  <>
                    <View accessible accessibilityLabel="Ticket QR code. It changes every minute." style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16 }}>
                      <QRCode value={payload} size={200} backgroundColor="#FFFFFF" color="#0D0D0F" />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View aria-hidden style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.lime }} />
                      <RNText accessibilityLiveRegion="none" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9C9C3' }}>New code in {mmss(left)} · screenshots won’t work</RNText>
                    </View>
                  </>
                )}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[['NAME', t.holderName], ['DOORS', clock(t.doorsAt)], ['VENUE', t.venue]].map(([k, v]) => (
                <View key={k} style={{ flex: 1, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>{k}</RNText>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink, marginTop: 3 }}>{v}</RNText>
                </View>
              ))}
            </View>
            {t.teamName ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9C9C3' }}>Team · {t.teamName}</RNText> : null}
            {t.paidPaise ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9C9C3' }}>Paid {formatPaise(t.paidPaise)}</RNText> : null}
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Reminders 24 h and 1 h before. Turn up the brightness at the door.</RNText>
          </>
        ) : null}
      </ScrollView>
    </RouteFrame>
  );
}

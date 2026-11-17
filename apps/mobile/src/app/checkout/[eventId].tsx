import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { formatPaise } from '@bunk3d/core';
import { useApi, type PayMethod, type PayResult, type Quote } from '@bunk3d/api';
import { clock, dayNum, mmss, mon } from '@/features/poppin/format';
import { RouteFrame } from '@/features/poppin/ui';

// E7 Paid checkout (wave 3). Every amount below comes from the API (priceTicket on the server). Payment goes through Razorpay.
const METHODS: { key: PayMethod; label: string; sub: string }[] = [
  { key: 'upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm' },
  { key: 'card', label: 'Card', sub: 'Debit or credit' },
  { key: 'netbanking', label: 'Net banking', sub: 'All major banks' },
];

export default function Checkout() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const api = useApi();
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [method, setMethod] = useState<PayMethod>('upi');
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<Extract<PayResult, { ok: true }> | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const q = await api.poppin.quote(eventId);
      setLoadFailed(false);
      setQuote(q);
    } catch { setLoadFailed(true); }
  }, [api, eventId]);
  useEffect(() => {
    let live = true;
    api.poppin.quote(eventId).then((q) => { if (live) { setLoadFailed(false); setQuote(q); } }, () => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, [api, eventId]);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  // A lapsed seat hold quietly takes a fresh hold (and a fresh server price).
  const holdEnds = quote?.holdExpiresAt;
  useEffect(() => {
    if (!holdEnds || done || paying) return;
    const t = setTimeout(load, Math.max(0, holdEnds - Date.now()) + 50);
    return () => clearTimeout(t);
  }, [holdEnds, done, paying, load]);

  const pay = async () => {
    setPaying(true); setFailed(false);
    try {
      const r = await api.poppin.pay(eventId, method);
      if (r.ok) setDone(r); else if (r.reason === 'hold_expired') await load(); else setFailed(true);
    } catch { setFailed(true); } finally { setPaying(false); }
  };

  if (done) {
    return (
      <RouteFrame title="Checkout">
        <View style={{ flex: 1, padding: 24, alignItems: 'flex-start', justifyContent: 'center', gap: 12 }}>
          <Icon name="poppinCheckCircle" size={64} color={color.success} />
          <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, letterSpacing: -1, color: color.ink }}>You’re in. See you there.</RNText>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#C9C9C3' }}>{formatPaise(done.paidPaise)} paid · ref {done.paymentRef} · receipt emailed</RNText>
          <Pressable accessibilityRole="button" accessibilityLabel="Open ticket" onPress={() => router.replace(`/ticket/${eventId}`)} style={{ minHeight: 52, paddingHorizontal: 24, borderRadius: 16, justifyContent: 'center', backgroundColor: color.lime, boxShadow: `4px 4px 0 ${color.violet}` }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.onLime }}>Open ticket</RNText>
          </Pressable>
        </View>
      </RouteFrame>
    );
  }
  if (failed) {
    return (
      <RouteFrame title="Checkout">
        <View style={{ flex: 1, padding: 24, alignItems: 'flex-start', justifyContent: 'center', gap: 12 }}>
          <Icon name="alert" size={56} color={color.error} />
          <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, letterSpacing: -1, color: color.ink }}>Payment didn’t go through</RNText>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21, color: '#C9C9C3' }}>UPI app timed out. Nothing was charged. If money left your account it auto-refunds in 5–7 days.</RNText>
          <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={() => setFailed(false)} style={{ minHeight: 52, paddingHorizontal: 24, borderRadius: 16, justifyContent: 'center', backgroundColor: color.hot }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.onLime }}>Try again</RNText>
          </Pressable>
        </View>
      </RouteFrame>
    );
  }
  const left = quote ? Math.max(0, Math.ceil((quote.holdExpiresAt - now) / 1000)) : 0;
  return (
    <RouteFrame title="Checkout" right={quote ? <RNText accessibilityLiveRegion="none" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime, backgroundColor: color.lime, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' }}>Seat held {mmss(left)}</RNText> : null}>
      {quote === undefined && !loadFailed ? <SkeletonList rows={4} /> : null}
      {loadFailed ? <ErrorState onRetry={load} /> : null}
      {quote === null ? <EmptyState title="Nothing to pay for." body="This event is free or no longer open." action={{ label: 'Back to the event', onPress: () => router.back() }} /> : null}
      {quote ? (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12 }}>
              <View style={{ width: 48, height: 52, borderRadius: 12, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime }}>{mon(quote.startsAt)}</RNText>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.onLime }}>{dayNum(quote.startsAt)}</RNText>
              </View>
              <View style={{ flex: 1 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{quote.eventTitle}</RNText>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{quote.venue} · {clock(quote.startsAt)} · {quote.hostName}{quote.hostVerified ? ' ✓' : ''}</RNText>
              </View>
            </View>
            <View style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 }}>
              {[
                [`General entry × ${quote.price.qty}`, quote.price.subtotalPaise],
                ['Platform fee (5%)', quote.price.platformFeePaise],
                ['GST on platform fee (18%)', quote.price.gstPaise],
              ].map(([l, v]) => (
                <View key={l as string} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#C9C9C3' }}>{l}</RNText>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{formatPaise(v as number)}</RNText>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: color.line }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.ink }}>You pay</RNText>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.lime }}>{formatPaise(quote.price.totalPaise)}</RNText>
              </View>
            </View>
            <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>PAY WITH</RNText>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {METHODS.map((m) => {
                const on = m.key === method;
                return (
                  <Pressable key={m.key} accessibilityRole="radio" accessibilityLabel={`${m.label}, ${m.sub}`} accessibilityState={{ selected: on }} onPress={() => setMethod(m.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, backgroundColor: color.surface, borderColor: on ? color.lime : color.line, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 }}>
                    <View aria-hidden style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 2, borderColor: on ? color.lime : '#4A4A54' }} />
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{m.label}</RNText>
                    <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{m.sub}</RNText>
                  </Pressable>
                );
              })}
            </View>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: color.inkMuted }}>Refunds: full refund until 48 h before, none after. Automatic if the host cancels. Payment is handled by Razorpay — Bunk3d never holds your money.</RNText>
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: '#222228' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Pay ${formatPaise(quote.price.totalPaise)}`} disabled={paying} onPress={pay} style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lime, opacity: paying ? 0.6 : 1, boxShadow: `4px 4px 0 ${color.violet}` }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.onLime }}>{paying ? 'Paying…' : `Pay ${formatPaise(quote.price.totalPaise)}`}</RNText>
            </Pressable>
          </View>
        </>
      ) : null}
    </RouteFrame>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatPaise, type PayoutSpeed } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { HustleError, useApi, useAsync, type Withdrawal } from '@bunk3d/api';
import { AsyncView, Box, Btn, Display, Page, T, VIOLET, fmtDay } from '@/features/hustle/kit';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** B4 Withdraw. Standard UPI is free (2-3 working days); instant costs Rs 15. */
export default function WithdrawScreen() {
  const api = useApi();
  const opts = useAsync(() => api.hustle.getWithdrawOptions(), []);
  const [v, setV] = useState('');
  const [speed, setSpeed] = useState<PayoutSpeed>('standard');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<Withdrawal | null>(null);
  const rupees = parseInt(v || '0', 10);
  const amountPaise = rupees * 100;
  const quote = useAsync(() => api.hustle.quoteWithdrawal({ amountPaise, speed }), [amountPaise, speed]);
  const q = quote.status === 'ready' ? quote.data : null;
  const press = (k: string) => { if (k === '⌫') setV(v.slice(0, -1)); else if (k) setV((v + k).replace(/^0+/, '').slice(0, 6)); };

  if (sent) {
    return (
      <Page title="Withdraw">
        <View style={{ gap: 12, paddingTop: 24 }}>
          <T size={11} weight="bold" c={VIOLET} style={{ letterSpacing: 1 }}>PROCESSING</T>
          <Display size={40}>{formatPaise(sent.amountPaise)}</Display>
          <T size={14} c="#C9C9C3">{sent.speed === 'instant' ? `Instant payout to ${sent.upiId}. ${formatPaise(sent.feePaise)} fee taken, ${formatPaise(sent.receivePaise)} lands, usually within an hour.` : `On its way to ${sent.upiId}. Free standard payout, lands in 2–3 working days (by ${fmtDay(sent.expectedAtMs)}).`}</T>
          <T size={12} c={color.inkMuted}>Ref {sent.ref}. We’ll ping you when it’s Paid. If it bounces, it returns to Payable.</T>
          <Btn label="See history" kind="violet" onPress={() => router.replace('/history')} />
        </View>
      </Page>
    );
  }

  const go = async () => {
    setBusy(true); setErr(null);
    try { setSent(await api.hustle.withdraw({ amountPaise, speed })); } catch (e) { setErr(e instanceof HustleError ? e.message : 'That didn’t go through. Try again.'); } finally { setBusy(false); }
  };

  return (
    <Page title="Withdraw">
      <AsyncView state={opts} skeletonRows={3}>
        {(o) => {
          if (!o.payoutReady) {
            return (
              <Box style={{ gap: 10 }}>
                <T size={16} weight="bold">Set up payouts first.</T>
                <T size={13} c="#C9C9C3">It takes about 2 minutes: PAN, then UPI verified by a ₹1 test, then consent. Your money stays safe in My Bag meanwhile.</T>
                <Btn label="Set up payouts" kind="violet" onPress={() => router.replace('/payout-setup')} />
              </Box>
            );
          }
          const bad = !q?.ok;
          const hint = rupees * 100 < o.minPaise ? `Minimum withdrawal is ${formatPaise(o.minPaise)}` : q?.error === 'above_payable' ? 'More than your Payable balance' : 'Lands in your bank, not a wallet';
          return (
            <>
              <T size={12} c={color.inkMuted}>Payable {formatPaise(o.payablePaise)}</T>
              <View accessibilityRole="text" accessibilityLabel={`Amount ${rupees} rupees`}><Display size={44} c={bad && v ? color.error : color.ink}>₹{rupees.toLocaleString('en-IN')}</Display></View>
              <T size={12} c={bad && v ? color.error : color.inkMuted}>{hint}</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[['₹100', 100], ['₹500', 500], ['All', Math.floor(o.payablePaise / 100)]].map(([l, n]) => (
                  <Pressable key={l as string} accessibilityRole="button" accessibilityLabel={`Set ${l}`} onPress={() => setV(String(n))} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: '#2E2E36', justifyContent: 'center' }}><T size={13} weight="bold">{l as string}</T></Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {KEYS.map((k, i) => (
                  <Pressable key={i} accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'Delete' : k || 'blank'} disabled={!k} onPress={() => press(k)} style={{ width: '33.33%', height: 52, alignItems: 'center', justifyContent: 'center' }}><T size={22} weight="bold">{k}</T></Pressable>
                ))}
              </View>
              {o.speeds.map((s) => {
                const on = s.key === speed;
                return (
                  <Pressable key={s.key} accessibilityRole="radio" accessibilityLabel={`${s.label}, ${s.etaLabel}`} accessibilityState={{ selected: on }} onPress={() => setSpeed(s.key)}
                    style={{ minHeight: 56, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: on ? VIOLET : '#2E2E36', backgroundColor: on ? color.anonTile : 'transparent' }}>
                    <T size={14} weight="bold">{s.label}</T><T size={12} c={color.inkMuted}>{s.etaLabel}</T>
                  </Pressable>
                );
              })}
              <T size={12} c={color.inkMuted}>To {o.upiId} · verified</T>
              {err ? <T size={13} c={color.error}>{err}</T> : null}
              <Btn label={q ? (speed === 'instant' ? `Withdraw ${formatPaise(q.amountPaise)} · you get ${formatPaise(q.receivePaise)}` : `Withdraw ${formatPaise(q.amountPaise)} · free`) : 'Withdraw'} kind="violet" disabled={bad || !v} busy={busy} onPress={go} />
            </>
          );
        }}
      </AsyncView>
    </Page>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { HustleError, useApi, useAsync, type PayoutSetup, type SetupStepKey } from '@bunk3d/api';
import { AsyncView, Box, Btn, Page, T, VIOLET, f } from '@/features/hustle/kit';

const META: Record<SetupStepKey, { title: string; sub: string; note: string; cta: string; ph: string }> = {
  pan: { title: 'PAN', sub: 'For TDS. Must match your bank name.', note: 'Only the last 4 characters are shown back to you.', cta: 'Verify PAN', ph: 'ABCDE1234F' },
  upi: { title: 'UPI ID', sub: 'We send ₹1 to confirm it’s yours.', note: 'We’ll send ₹1 (penny drop). It’s yours to keep.', cta: 'Send ₹1 test', ph: 'name@bank' },
  consent: { title: 'Payout consent', sub: 'Terms, TDS rules, dispute policy', note: 'Every gig shows your Bunk3d fee and take-home before you apply: 5% on paid work, 2.5% on club gigs, 0% on referral gigs and on your first ₹1,000. Never more than ₹1,000 a gig.', cta: 'Agree & finish', ph: '' },
};

/** B3 Payout setup / KYC: PAN, then UPI verified by a Rs 1 penny drop, then consent. */
export default function PayoutSetupScreen() {
  const api = useApi();
  const setup = useAsync(() => api.hustle.getPayoutSetup(), []);
  const [val, setVal] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async (s: PayoutSetup) => {
    setBusy(true); setErr(null);
    try {
      if (s.next === 'pan') await api.hustle.verifyPan(val);
      else if (s.next === 'upi') await api.hustle.verifyUpi(val);
      else await api.hustle.agreePayoutConsent();
      setVal(''); setAgree(false); setup.reload();
    } catch (e) { setErr(e instanceof HustleError ? e.message : 'That didn’t go through. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <Page title="Payout setup" sub={setup.status === 'ready' ? `${setup.data.doneCount}/3` : ''}>
      <T size={13} c={color.inkMuted}>Needed once, before your first withdrawal. Required by RBI rules for payouts — we never show this to payers.</T>
      <AsyncView state={setup} skeletonRows={3}>
        {(s) => (
          <>
            {s.steps.map((st, i) => {
              const m = META[st.key];
              const active = s.next === st.key;
              return (
                <Box key={st.key} style={{ borderColor: active ? VIOLET : color.line, gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: st.done ? color.success : active ? VIOLET : color.line, alignItems: 'center', justifyContent: 'center' }}><T size={13} weight="bold" c={st.done || active ? color.onLime : color.inkMuted}>{st.done ? '✓' : String(i + 1)}</T></View>
                    <View style={{ flex: 1 }}>
                      <T size={15} weight="bold">{m.title}</T>
                      <T size={12} c={st.done ? color.success : color.inkMuted}>{st.done ? st.summary : m.sub}</T>
                    </View>
                  </View>
                  {active ? (
                    <>
                      {st.key === 'consent' ? (
                        <Pressable accessibilityRole="checkbox" accessibilityLabel="I agree to the Payout Terms" accessibilityState={{ checked: agree }} onPress={() => setAgree(!agree)} style={{ minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                          <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: agree ? VIOLET : '#4A4A54', backgroundColor: agree ? VIOLET : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{agree ? <T size={13} weight="bold" c={color.onLime}>✓</T> : null}</View>
                          <T size={14} weight="semi">I agree to the Payout Terms</T>
                        </Pressable>
                      ) : (
                        <TextInput accessibilityLabel={m.title} value={val} onChangeText={setVal} autoCapitalize={st.key === 'pan' ? 'characters' : 'none'} autoCorrect={false} maxLength={st.key === 'pan' ? 10 : 60} placeholder={m.ph} placeholderTextColor={color.inkMuted}
                          style={{ minHeight: 48, borderRadius: 12, backgroundColor: color.surfaceRaised, borderWidth: 1, borderColor: color.line, paddingHorizontal: 14, color: color.ink, fontFamily: f.semi, fontSize: 15 }} />
                      )}
                      <T size={12} c={color.inkMuted}>{m.note}</T>
                      {err ? <T size={13} c={color.error}>{err}</T> : null}
                      <Btn label={m.cta} kind="violet" busy={busy} disabled={st.key === 'consent' ? !agree : val.trim().length < 3} onPress={() => go(s)} />
                    </>
                  ) : null}
                </Box>
              );
            })}
            {s.complete ? <T size={14} c={color.success} weight="semi">All set. Withdrawals go to {s.upiId}.</T> : null}
            <Btn label="Continue to withdraw" kind={s.complete ? 'violet' : 'ghost'} disabled={!s.complete} onPress={() => router.replace('/withdraw')} />
          </>
        )}
      </AsyncView>
    </Page>
  );
}

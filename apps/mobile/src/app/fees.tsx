import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { formatPaise, type GigKind } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { useApi, useAsync, type FeeLevelKey } from '@bunk3d/api';
import { AsyncView, Box, Btn, Chips, Page, Row, T, TakeHomeCard, f, pct } from '@/features/hustle/kit';

const TYPES: { key: GigKind; label: string }[] = [{ key: 'paid', label: 'Paid gig' }, { key: 'club', label: 'Club gig' }, { key: 'referral', label: 'Referral' }, { key: 'volunteer', label: 'Volunteer' }];

/** B6 Fees + take-home calculator. Every number comes from the API. */
export default function Fees() {
  const api = useApi();
  const opts = useAsync(() => api.hustle.getFeeCalcOptions(), []);
  const [amt, setAmt] = useState('1200');
  const [kind, setKind] = useState<GigKind>('paid');
  const [level, setLevel] = useState<FeeLevelKey>('first');
  const o = opts.status === 'ready' ? opts.data : null;
  const lifetime = o?.levels.find((l) => l.key === level)?.lifetimePaise ?? 0;
  const pay = parseInt(amt || '0', 10) * 100;
  const quote = useAsync(() => api.hustle.calculateTakeHome({ payPaise: pay, kind, lifetimePaise: lifetime }), [pay, kind, lifetime]);
  const q = quote.status === 'ready' ? quote.data : null;
  const why = q ? (q.feeRateBp === 0 ? (kind === 'volunteer' ? '0% · no cash to share' : '0% student fee') : `${pct(q.feeRateBp)}${q.waivedPaise > 0 ? ` after first ${formatPaise(q.waivedPaise)} free` : ''}${q.capped ? ' · capped' : ''}`) : '';
  return (
    <Page title="How fees work" footer={<Btn label="Browse gigs" kind="violet" onPress={() => router.navigate('/gigs')} />}>
      <AsyncView state={opts} skeletonRows={3}>
        {(d) => (
          <>
            <T size={11} weight="bold" c={color.inkMuted} style={{ letterSpacing: 1 }}>TAKE-HOME CALCULATOR</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={22} weight="bold">₹</T>
              <TextInput accessibilityLabel="Gig pay" value={amt} onChangeText={(t) => setAmt(t.replace(/[^0-9]/g, '').slice(0, 7))} keyboardType="number-pad" inputMode="numeric"
                style={{ flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, paddingHorizontal: 14, color: color.ink, fontFamily: f.display, fontSize: 22 }} />
              <T size={13} c={color.inkMuted}>gig pay</T>
            </View>
            <View style={{ marginHorizontal: -16 }}><Chips items={TYPES} value={kind} onChange={setKind} tone="violet" /></View>
            <View style={{ marginHorizontal: -16 }}><Chips items={d.levels.map((l) => ({ key: l.key, label: l.label }))} value={level} onChange={setLevel} tone="violet" /></View>
            {q ? <><TakeHomeCard th={q} /><T size={12} c={color.inkMuted}>fee {formatPaise(q.feePaise)} + GST {formatPaise(q.gstPaise)} · {why}</T></> : null}
            <Box>{d.rules.map((r) => <Row key={r.label} k={r.label} v={r.value} />)}</Box>
            <T size={13} c="#C9C9C3">Bunk3d takes a small student fee from what you earn — shown on every gig before you apply, locked when you apply, and capped at ₹1,000 a gig. 18% GST is charged on top of the fee (not on your pay) and shown on every gig. It’s only taken from money actually paid: nothing on amounts under dispute, and refunded if a brand’s payment is reversed. Brands also pay Bunk3d their own 4–7% on top of your pay.</T>
          </>
        )}
      </AsyncView>
    </Page>
  );
}

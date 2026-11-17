import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { formatPaise, type EarningStage } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync, type Bag } from '@bunk3d/api';
import { AsyncView, Display, T, fmtDay } from '@/features/hustle/kit';

const DOT: Record<string, string> = { estimated: '#9A9AA5', pending: color.warning, approved: color.info, processing: color.violet, paid: color.success, disputed: color.error };

function helpFor(stage: string, bag: Bag): string {
  switch (stage) {
    case 'estimated': return 'Gigs you’re working on, after your locked fee. Not owed until the payer approves your proof.';
    case 'pending': return `Approved, sitting in a 7-day hold in case of a dispute.${bag.nextPayableAtMs ? ` Becomes Payable on ${fmtDay(bag.nextPayableAtMs)}.` : ''}`;
    case 'approved': return 'Payer approved; funds are being confirmed from their escrow. Usually same day.';
    case 'processing': return 'Withdrawals on their way to your UPI. Standard is free and takes 2–3 working days; instant costs ₹15.';
    case 'paid': return 'Landed in your bank since 1 Apr. Download your TDS certificate in History.';
    default: return 'Held in escrow while Ops decides. No Bunk3d fee is charged on disputed money.';
  }
}

export default function BagScreen() {
  const api = useApi();
  const { onScroll } = useChrome();
  const [open, setOpen] = useState<string>('pending');
  const bag = useAsync(() => api.hustle.getBag(), []);
  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace() + 16, gap: 12, paddingHorizontal: 16 }} style={{ backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Display size={26}>My Bag</Display>
        <Pressable accessibilityRole="button" accessibilityLabel="History" onPress={() => router.push('/history')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: color.surfaceRaised, justifyContent: 'center' }}><T size={13} weight="bold">History</T></Pressable>
      </View>
      <AsyncView state={bag}>
        {(b) => {
          const rows: { stage: string; label: string; paise: number; count: number }[] = [
            ...b.states.map((s) => ({ stage: s.stage as EarningStage, label: s.stage === 'paid' ? `Paid · this FY` : s.stage[0]!.toUpperCase() + s.stage.slice(1), paise: s.paise, count: s.count })),
            ...(b.disputedPaise > 0 ? [{ stage: 'disputed', label: 'In dispute', paise: b.disputedPaise, count: 1 }] : []),
          ];
          return (
            <>
              <View style={{ backgroundColor: color.lime, borderRadius: 24, padding: 16, gap: 10, boxShadow: `5px 5px 0 ${color.violet}` }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T size={11} weight="bold" c={color.onLime} style={{ letterSpacing: 1 }}>PAYABLE · YOURS TO WITHDRAW</T>
                  <T size={12} weight="bold" c={color.onLime}>{b.payableCount} {b.payableCount === 1 ? 'gig' : 'gigs'}</T>
                </View>
                <Display size={44} c={color.onLime}>{formatPaise(b.payablePaise)}</Display>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Withdraw to UPI" onPress={() => router.push('/withdraw')} style={{ flex: 1.3, minHeight: 48, borderRadius: 14, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}><T size={14} weight="bold" c={color.lime}>Withdraw to UPI</T></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Payout setup" onPress={() => router.push('/payout-setup')} style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 2, borderColor: color.bg, alignItems: 'center', justifyContent: 'center' }}><T size={14} weight="bold" c={color.onLime}>{b.payoutReady ? 'Payout details' : 'Payout setup'}</T></Pressable>
                </View>
              </View>
              <T size={12} c={color.inkMuted}>Other money is tracked by state — it isn’t added together because it isn’t yours yet. Every amount is after your Bunk3d fee and the GST on it.</T>
              <Pressable accessibilityRole="button" accessibilityLabel="Fees" onPress={() => router.push('/fees')} style={{ minHeight: 44, justifyContent: 'center' }}><T size={13} weight="bold" c={color.violet}>Fees ›</T></Pressable>
              {rows.map((r) => {
                const on = open === r.stage;
                return (
                  <Pressable key={r.stage} accessibilityRole="button" accessibilityLabel={`${r.label} ${formatPaise(r.paise)}`} accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? '' : r.stage)}
                    style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: on ? '#3A3A42' : color.line, padding: 14, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: DOT[r.stage] }} />
                      <T size={15} weight="bold" style={{ flex: 1 }}>{r.label}</T>
                      <T size={15} weight="bold" c={DOT[r.stage]}>{formatPaise(r.paise)}</T>
                    </View>
                    {on ? <T size={13} c={color.inkMuted}>{helpFor(r.stage, b)}</T> : null}
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" accessibilityLabel="See every earning" onPress={() => router.push('/history')} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><T size={14} weight="bold" c={color.violet}>See every earning ›</T></Pressable>
            </>
          );
        }}
      </AsyncView>
    </ScrollView>
  );
}

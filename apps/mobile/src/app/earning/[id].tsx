import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { formatPaise, type EarningStage } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { useApi, useAsync } from '@bunk3d/api';
import { AsyncView, Box, Btn, Display, Page, Pill, Row, SampleTag, T, fmtDay, pct } from '@/features/hustle/kit';

const C: Record<EarningStage, string> = { estimated: '#9A9AA5', pending: color.warning, approved: color.info, payable: color.lime, processing: color.violet, paid: color.success };
const KIND = { paid: 'paid gig', club: 'club gig', referral: 'referral gig', volunteer: 'volunteer task' } as const;

/** B2 Earning detail. */
export default function EarningDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const e = useAsync(() => api.hustle.getEarning(id), [id]);
  const d = e.status === 'ready' ? e.data : null;
  return (
    <Page title={d?.title ?? 'Earning'} sub={d ? `${d.payerName} · ref ${d.ref}` : ''}
      footer={d ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {d.workId ? <Btn label="Something’s off" kind="ghost" onPress={() => router.push(`/work/${d.workId}/dispute`)} style={{ flex: 1 }} /> : null}
          {d.workId ? <Btn label="Open gig" kind="ghost" onPress={() => router.push(`/work/${d.workId}`)} style={{ flex: 1 }} /> : null}
        </View>
      ) : undefined}>
      <AsyncView state={e} skeletonRows={4}>
        {(x) => (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Display size={34} c={color.violet}>{formatPaise(x.netPaise)}</Display>
              <Pill label={x.stage.toUpperCase()} bg={C[x.stage]} />
              {x.seed ? <SampleTag /> : null}
            </View>
            <T size={12} c={color.inkMuted}>of {formatPaise(x.grossPaise)} · fee locked {fmtDay(x.feeLockedAtMs)}</T>
            <Box style={{ gap: 0 }}>
              {x.steps.map((s, i) => {
                const reached = s.atMs !== null;
                return (
                  <View key={s.stage} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: reached ? C[s.stage] : '#4A4A54', backgroundColor: reached ? C[s.stage] : 'transparent' }} />
                      {i < x.steps.length - 1 ? <View style={{ width: 2, height: 30, backgroundColor: reached ? C[s.stage] : color.line }} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 12 }}>
                      <T size={14} weight="bold" c={reached ? color.ink : '#6E6E78'}>{s.label}</T>
                      <T size={12} c={reached ? color.inkMuted : '#6E6E78'}>{reached ? `${fmtDay(s.atMs!)} · ${s.note}` : 'Not yet'}</T>
                    </View>
                  </View>
                );
              })}
            </Box>
            <Box>
              <Row k="Gig amount" v={formatPaise(x.grossPaise)} />
              <Row k={`Bunk3d fee · ${KIND[x.kind]} ${x.feeRateBp === 0 ? '0%' : pct(x.feeRateBp)}`} v={`−${formatPaise(x.feePaise)}`} />
              <Row k="GST on the fee · 18%" v={`−${formatPaise(x.gstPaise)}`} />
              <Row k="TDS (194-O)" v={x.tdsPaise ? `−${formatPaise(x.tdsPaise)}` : '₹0'} />
              <View style={{ height: 1, backgroundColor: color.line, marginVertical: 4 }} />
              <Row k="You receive" v={formatPaise(x.netPaise)} bold c={color.lime} />
            </Box>
            {x.stage === 'pending' ? <T size={12} c={color.inkMuted}>In a 7-day hold in case of a dispute. Payable from {fmtDay(x.payableFromAtMs!)}.</T> : null}
          </>
        )}
      </AsyncView>
    </Page>
  );
}

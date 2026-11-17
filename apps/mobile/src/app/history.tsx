import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { EmptyState } from '@bunk3d/ui/native';
import { useApi, useAsync, type HistoryFilter } from '@bunk3d/api';
import { AsyncView, Box, Chips, Page, SampleTag, T, fmtDay } from '@/features/hustle/kit';

const FILTERS: { key: HistoryFilter; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'earnings', label: 'Earnings' }, { key: 'withdrawals', label: 'Withdrawals' }];
const ST: Record<string, string> = { estimated: '#9A9AA5', pending: color.warning, approved: color.info, payable: color.lime, processing: color.violet, paid: color.success, returned: color.error };

/** B5 History and tax. */
export default function History() {
  const api = useApi();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const rows = useAsync(() => api.hustle.listHistory(filter), [filter]);
  const tax = useAsync(() => api.hustle.getTaxSummary(), []);
  const [msg, setMsg] = useState<string | null>(null);
  const download = async () => {
    try {
      const c = await api.hustle.downloadTaxCertificate();
      if (Platform.OS === 'web') {
        const b = new Blob([c.text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = c.fileName; a.click();
      } else await Share.share({ message: c.text, title: c.fileName });
      setMsg('Saved.');
    } catch { setMsg('Couldn’t save that. Try again.'); }
  };
  return (
    <Page title="History">
      <View style={{ marginHorizontal: -16 }}><Chips items={FILTERS} value={filter} onChange={setFilter} /></View>
      <AsyncView state={rows}>
        {(list) => list.length === 0
          ? <EmptyState title="Nothing here yet." body="Earnings and withdrawals show up here." action={{ label: 'Browse gigs', onPress: () => router.navigate('/gigs') }} />
          : list.map((r) => (
            <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${r.title}, ${formatPaise(Math.abs(r.amountPaise))}, ${r.status}`} disabled={!r.earningId} onPress={() => r.earningId && router.push(`/earning/${r.earningId}`)}
              style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><T size={16} weight="bold" c={ST[r.status]}>{r.kind === 'earning' ? '+' : r.status === 'returned' ? '!' : '↑'}</T></View>
              <View style={{ flex: 1 }}><T size={14} weight="bold">{r.title}</T><T size={11} c={color.inkMuted}>{r.meta} · {fmtDay(r.atMs)}</T></View>
              <View style={{ alignItems: 'flex-end' }}>
                <T size={14} weight="bold" c={r.status === 'returned' ? color.inkMuted : r.amountPaise > 0 ? color.lime : color.ink}>{r.amountPaise > 0 ? '+' : r.amountPaise < 0 ? '−' : ''}{formatPaise(Math.abs(r.amountPaise))}</T>
                <T size={10} weight="bold" c={ST[r.status]}>{r.status.toUpperCase()}</T>
              </View>
            </Pressable>
          ))}
      </AsyncView>
      {tax.status === 'ready' ? (
        <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T size={14} weight="bold">TDS certificate · {tax.data.fy}</T>
            <T size={12} c={color.inkMuted}>Form 16A · {formatPaise(tax.data.tdsDeductedPaise)} deducted so far · for your ITR</T>
            {msg ? <T size={12} c={color.success}>{msg}</T> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Download TDS certificate" onPress={download} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: color.surfaceRaised, justifyContent: 'center' }}><T size={13} weight="bold">Download</T></Pressable>
        </Box>
      ) : null}
      <SampleTag />
    </Page>
  );
}

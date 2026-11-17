import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { useApi, useAsync } from '@bunk3d/api';
import { AsyncView, Box, Btn, Display, Page, Pill, SampleTag, T, VIOLET, fmtAgo } from '@/features/hustle/kit';

/** Q2 Listing. Swap has no payments: students meet on campus and pay in person. */
export default function Listing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const l = useAsync(() => api.hustle.getListing(id), [id]);
  const d = l.status === 'ready' ? l.data : null;
  return (
    <Page title={d?.title ?? 'Listing'}
      right={d && !d.mine ? <Btn label="Report" kind="ghost" onPress={() => router.push(`/report?targetKind=listing&targetId=${id}`)} style={{ minHeight: 44 }} /> : undefined}
      footer={d ? (d.mine
        ? <Btn label={d.sold ? 'Marked sold' : 'Mark as sold'} kind="violet" disabled={d.sold} onPress={async () => { await api.hustle.markListingSold(id); l.reload(); }} />
        : <Btn label="Chat to buy" kind="violet" onPress={() => router.push('/dms')} />) : undefined}>
      <AsyncView state={l} skeletonRows={3}>
        {(x) => (
          <>
            <View style={{ height: 180, borderRadius: 20, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Display size={30} c={VIOLET}>{x.glyph}</Display></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Display size={28} c={color.violet}>{x.pricePaise === 0 ? 'Free' : formatPaise(x.pricePaise)}</Display>
              <View style={{ flexDirection: 'row', gap: 6 }}><Pill label={x.condition.toUpperCase()} bg={color.line} fg="#C9C9C3" />{x.negotiable ? <Pill label="NEGOTIABLE" bg={color.line} fg="#C9C9C3" /> : null}{x.seed ? <SampleTag /> : null}</View>
            </View>
            <T size={12} c={color.inkMuted}>Listed {fmtAgo(x.postedAtMs)}{x.photoCount ? ` · ${x.photoCount} photo${x.photoCount > 1 ? 's' : ''}` : ''}</T>
            {x.description ? <T size={14} c="#C9C9C3">{x.description}</T> : null}
            <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' }}><T size={14} weight="bold" c={color.onLime}>{x.sellerInitials}</T></View>
              <View style={{ flex: 1 }}><T size={14} weight="bold">{x.sellerName}{x.mine ? ' (you)' : ''}</T><T size={12} c={color.inkMuted}>{x.sellerLine} · {x.swapsDone} swaps done · real name shown</T></View>
            </Box>
            <T size={12} c={color.inkMuted}>Bunk3d doesn’t handle Swap payments. Meet on campus, check the item, then pay by UPI or cash. Never pay in advance.</T>
          </>
        )}
      </AsyncView>
    </Page>
  );
}

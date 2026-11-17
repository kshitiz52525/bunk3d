import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { EmptyState, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync, type GigCard, type GigFilter, type GigTag } from '@bunk3d/api';
import { AsyncView, Chips, Display, Pill, SampleTag, T, VIOLET, fmtDay, pct, SOFT } from '@/features/hustle/kit';

const FILTERS: { key: GigFilter; label: string }[] = [{ key: 'for-you', label: 'For you' }, { key: 'campus', label: 'Campus' }, { key: 'remote', label: 'Remote' }, { key: 'brand', label: 'Brand' }];
const TAG: Record<Exclude<GigTag, null>, { label: string; c: string }> = {
  featured: { label: 'FEATURED', c: color.warning }, club: { label: 'CLUB', c: color.modInk }, referral: { label: 'REFERRAL', c: VIOLET }, remote: { label: 'REMOTE', c: color.success },
};

export function GigRow({ g }: { g: GigCard }) {
  const tag = g.tag ? TAG[g.tag] : null;
  const ratePct = g.takeHome.feeRateBp === 0 ? '0% student fee' : `${pct(g.takeHome.feeRateBp)} ${g.kind === 'club' ? 'club-gig ' : ''}Bunk3d fee + GST`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${g.title}, ${g.payerName}`} onPress={() => router.push(`/gig/${g.id}`)}
      style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 22, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' }}><T size={10} weight="bold" c={color.onLime}>{g.payerShort}</T></View>
        <T size={12} weight="semi" c={color.inkMuted} style={{ flex: 1 }}>{g.payerName} · {g.payerLabel}{g.payerVerified ? ' · verified' : ''}</T>
        {tag ? <View style={{ borderColor: tag.c, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}><T size={10} weight="bold" c={tag.c}>{tag.label}</T></View> : null}
      </View>
      <T size={17} weight="bold">{g.title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[...g.chips, ...(g.dueAtMs ? [`Due ${fmtDay(g.dueAtMs)}`] : [])].map((c) => <View key={c} style={{ backgroundColor: color.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}><T size={12} weight="semi" c={SOFT}>{c}</T></View>)}
      </View>
      <Display size={24} c={VIOLET}>{formatPaise(g.payPaise)}{g.payUnit ? ` / ${g.payUnit}` : ''}</Display>
      <View>
        <T size={13} weight="bold" c={color.lime}>You take home {formatPaise(g.takeHome.takeHomePaise)}{g.payUnit ? ` a ${g.payUnit}` : ''}</T>
        <T size={12} c={color.inkMuted}>fee {formatPaise(g.takeHome.feePaise)} + GST {formatPaise(g.takeHome.gstPaise)} · {ratePct}</T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>{g.seed ? <SampleTag /> : null}{g.applied ? <Pill label="APPLIED" bg={color.line} fg={SOFT} /> : null}</View>
        <T size={12} c={color.inkMuted}>{g.slotsLeft === null ? 'Open' : g.slotsTotal ? `${g.slotsLeft} of ${g.slotsTotal} left` : `${g.slotsLeft} left`}</T>
      </View>
    </Pressable>
  );
}

export default function Gigs() {
  const api = useApi();
  const { onScroll } = useChrome();
  const [filter, setFilter] = useState<GigFilter>('for-you');
  const gigs = useAsync(() => api.hustle.listGigs(filter), [filter]);
  const bag = useAsync(() => api.hustle.getBag(), []);
  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace() + 16, gap: 12 }} style={{ backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <Display size={26}>Get the bag</Display>
        {bag.status === 'ready' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${formatPaise(bag.data.payablePaise)} payable. Open My Bag`} onPress={() => router.navigate('/bag')} style={{ minHeight: 44, justifyContent: 'center', backgroundColor: color.lime, borderRadius: 999, paddingHorizontal: 12 }}>
            <T size={13} weight="bold" c={color.onLime}>{formatPaise(bag.data.payablePaise)} payable ›</T>
          </Pressable>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Fees. How fees work" onPress={() => router.push('/fees')} style={{ marginHorizontal: 16, backgroundColor: color.anonTile, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <T size={13} weight="semi" c={color.anonInk} style={{ flex: 1 }}>Pay shown is what the brand pays. Your take-home, after the Bunk3d fee and 18% GST on that fee, is under it.</T>
        <T size={13} weight="bold">Fees ›</T>
      </Pressable>
      <Chips items={FILTERS} value={filter} onChange={setFilter} />
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <AsyncView state={gigs}>
          {(list) => list.length === 0
            ? <EmptyState title="No gigs here yet." body="New gigs land all the time. Check another filter." action={{ label: 'Show all gigs', onPress: () => setFilter('for-you') }} />
            : list.map((g) => <GigRow key={g.id} g={g} />)}
        </AsyncView>
      </View>
    </ScrollView>
  );
}

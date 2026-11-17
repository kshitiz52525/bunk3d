import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { EmptyState, Icon, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync, type SwapListing } from '@bunk3d/api';
import { AsyncView, Chips, Display, SampleTag, T } from '@/features/hustle/kit';

type Cat = 'All' | SwapListing['category'];
const CATS: { key: Cat; label: string }[] = ['All', 'Books', 'Gear', 'Rides', 'Hostel'].map((k) => ({ key: k as Cat, label: k }));
const TINT: Record<SwapListing['category'], string> = { Books: color.lime, Gear: color.info, Rides: color.hot, Hostel: color.warning };

export default function Swap() {
  const api = useApi();
  const { onScroll } = useChrome();
  const [cat, setCat] = useState<Cat>('All');
  const list = useAsync(() => api.hustle.listListings(cat), [cat]);
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace() + 80, gap: 12 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Display size={26}>Swap</Display>
          <T size={12} c={color.inkMuted}>Chat to buy · pay in person</T>
        </View>
        <Chips items={CATS} value={cat} onChange={setCat} />
        <View style={{ paddingHorizontal: 16 }}>
          <AsyncView state={list}>
            {(items) => items.length === 0
              ? <EmptyState title="Nothing listed yet." body="Be the first to sell something on your campus." action={{ label: 'Sell something', onPress: () => router.push('/listing/new') }} />
              : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {items.map((i) => (
                  <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={`${i.title}, ${i.pricePaise === 0 ? 'free' : formatPaise(i.pricePaise)}, ${i.sellerName}`} onPress={() => router.push(`/listing/${i.id}`)}
                    style={{ width: '47.5%', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }}>
                    <View style={{ height: 110, backgroundColor: TINT[i.category], alignItems: 'center', justifyContent: 'center' }}>
                      <Display size={18} c={color.onLime}>{i.glyph}</Display>
                      <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: color.bg, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 }}><T size={10} weight="bold">{i.condition.toUpperCase()}</T></View>
                    </View>
                    <View style={{ padding: 10, gap: 3 }}>
                      <T size={13} weight="bold" style={{ minHeight: 36 }}>{i.title}</T>
                      <Display size={16} c={color.violet}>{i.pricePaise === 0 ? 'Free' : formatPaise(i.pricePaise)}</Display>
                      <T size={11} c={color.inkMuted}>{i.sellerName} · {i.sellerLine}</T>
                      {i.seed ? <SampleTag /> : null}
                    </View>
                  </Pressable>
                ))}
              </View>}
          </AsyncView>
        </View>
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Sell something" onPress={() => router.push('/listing/new')}
        style={{ position: 'absolute', right: 16, bottom: useTabBarSpace() + 12, minHeight: 52, borderRadius: 18, backgroundColor: color.lime, paddingHorizontal: 20, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', boxShadow: `4px 4px 0 ${color.violet}` }}>
        <Icon name="plus" size={20} color={color.onLime} /><T size={15} weight="bold" c={color.onLime}>Sell</T>
      </Pressable>
    </View>
  );
}

import { router } from 'expo-router';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { useState } from 'react';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, SkeletonList } from '@bunk3d/ui/native';
import { RADAR_CATEGORIES, useApi, useAsync, type RadarCategory, type RadarPin } from '@bunk3d/api';
import { Pill } from '@/features/you/ui';
import { RadarMap } from './RadarMap';

/** R1 Radar: public places and live meetups. Never shows where a person is. */
export function RadarView() {
  const api = useApi();
  const [cat, setCat] = useState<RadarCategory>('All');
  const radar = useAsync(() => api.discover.radar(cat), [cat]);
  const sharing = useAsync(() => api.discover.locationSharing(), []);
  const open = (p: RadarPin) => router.push(p.kind === 'meetup' ? { pathname: '/meetup/[id]', params: { id: p.id } } : { pathname: '/spot/[id]', params: { id: p.id } });
  const d = radar.data;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flex: 1 }}>
          {RADAR_CATEGORIES.map((c) => <Pill key={c} label={c} selected={c === cat} onPress={() => setCat(c)} />)}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel={sharing.data?.ghost === false ? 'Location sharing. Ghost mode is off' : 'Location sharing. Ghost mode is on'} onPress={() => router.push('/location-share')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#2E2E36' }}>
          <View aria-hidden style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sharing.data?.ghost === false ? color.warning : color.violet }} />
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.ink }}>{sharing.data?.ghost === false ? 'Visible' : 'Ghost'}</RNText>
        </Pressable>
      </View>
      {radar.status === 'loading' ? <SkeletonList rows={3} /> : null}
      {radar.status === 'error' ? <ErrorState onRetry={radar.reload} /> : null}
      {d ? (
        <>
          <View>
            <RadarMap center={d.center} pins={d.pins} you={d.you} onPin={open} height={360} />
            <Pressable accessibilityRole="button" accessibilityLabel="Create a meetup" onPress={() => router.push('/meetup/new')} style={{ position: 'absolute', left: 12, top: 12, width: 52, height: 52, borderRadius: 18, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={24} color={color.onLime} stroke={3} />
            </Pressable>
          </View>
          {d.pins.length === 0 ? <EmptyState title="Nothing here yet." body="No places in this category near campus." action={{ label: 'Show everything', onPress: () => setCat('All') }} /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Meetups near you</RNText>
            <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{d.meetups.length} live</RNText>
          </View>
          {d.meetups.length === 0 ? <EmptyState title="No meetups yet." body="Be the first: post a plan at a public spot." action={{ label: 'Create a meetup', onPress: () => router.push('/meetup/new') }} /> : null}
          {d.meetups.map((m) => (
            <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.title}. ${m.meta}. ${m.going}`} onPress={() => router.push({ pathname: '/meetup/[id]', params: { id: m.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 12 }}>
              <View style={{ minWidth: 52, paddingVertical: 8, borderRadius: 12, backgroundColor: m.tint, alignItems: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{m.when}</RNText></View>
              <View style={{ flex: 1 }}>
                <RNText numberOfLines={1} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{m.title}</RNText>
                <RNText numberOfLines={1} style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{m.meta}</RNText>
              </View>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.ink }}>{m.going}</RNText>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

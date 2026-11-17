import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, OfflineBanner, SkeletonList, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { formatPaise } from '@bunk3d/core';
import { useApi, type EventSummary, type EventWhen, type PoppinCategory } from '@bunk3d/api';
import { ago, useCachedAsync } from '@/features/poppin/cache';
import { clock, compact, dayNum, dow, mon, ordinal } from '@/features/poppin/format';
import { Pill, TINT } from '@/features/poppin/ui';

// E1 Events. This week / Upcoming / Past. Pending-verification users can browse public events.
const WHENS: { key: EventWhen; label: string }[] = [{ key: 'week', label: 'This week' }, { key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }];
const CATS: (PoppinCategory | 'All')[] = ['All', 'Tech', 'Cultural', 'Sports', 'Workshop', 'Fest'];

function tagOf(e: EventSummary): string {
  if (e.status === 'cancelled') return 'Cancelled';
  if (e.resultsPublished) return 'Results';
  return e.ticketKind === 'paid' && e.pricePaise ? formatPaise(e.pricePaise) : 'Free';
}
function goingOf(e: EventSummary): { text: string; tone: string } {
  if (e.my === 'waitlist') return { text: `Waitlist #${e.waitlistPosition}`, tone: color.warning };
  if (e.status === 'cancelled') return { text: 'Cancelled', tone: color.error };
  if (e.when === 'past') return e.myPlace ? { text: `You placed ${ordinal(e.myPlace)} ›`, tone: color.lime } : { text: `${compact(e.goingCount)} went`, tone: color.inkMuted };
  if (e.my === 'going') return { text: 'Going ✓', tone: color.lime };
  if (e.status === 'full') return { text: 'Full · waitlist open', tone: color.warning };
  if (e.ticketKind === 'paid') return { text: 'Get tickets ›', tone: color.lime };
  return { text: `${e.goingCount} going${e.friendsGoing ? ` · ${e.friendsGoing} friends` : ''}`, tone: e.friendsGoing ? color.lime : color.inkMuted };
}

function EventCard({ e }: { e: EventSummary }) {
  const t = TINT[e.tint];
  const g = goingOf(e);
  const go = () => {
    if (e.when === 'past' && e.resultsPublished) router.push(`/results/${e.id}`);
    else if (e.ticketKind === 'paid' && e.my === 'none' && e.status === 'open') router.push(`/checkout/${e.id}`);
    else router.push(`/event/${e.id}`);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${e.title}, ${e.hostName}, ${dow(e.startsAt)} ${clock(e.startsAt)}, ${e.venue}. ${g.text}`} onPress={go} style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 20, overflow: 'hidden', opacity: e.status === 'cancelled' ? 0.75 : 1 }}>
      <View style={{ height: 96, backgroundColor: t.bg, padding: 12, justifyContent: 'space-between' }}>
        <View aria-hidden style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: t.ring, opacity: 0.6 }} />
        <View style={{ alignSelf: 'flex-start', backgroundColor: color.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.lime }}>{mon(e.startsAt)}</RNText>
          <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 18, color: color.ink }}>{dayNum(e.startsAt)}</RNText>
        </View>
        <RNText style={{ alignSelf: 'flex-end', fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{e.category} · {tagOf(e)}</RNText>
      </View>
      <View style={{ padding: 14, gap: 3 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.ink }}>{e.title}</RNText>
        <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{e.hostName}{e.hostVerified ? ' ✓' : ''}</RNText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
          <RNText style={{ flexShrink: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9C9C3' }}>{e.when === 'past' ? 'Ended' : `${dow(e.startsAt)} ${clock(e.startsAt)}`} · {e.venue}</RNText>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: g.tone }}>{g.text}</RNText>
        </View>
      </View>
    </Pressable>
  );
}

export default function Poppin() {
  const api = useApi();
  const { onScroll } = useChrome();
  const [when, setWhen] = useState<EventWhen>('week');
  const [cat, setCat] = useState<PoppinCategory | 'All'>('All');
  const list = useCachedAsync(`poppin.events.${when}.${cat}`, () => api.poppin.events({ when, category: cat === 'All' ? undefined : cat }), [when, cat]);
  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace(), paddingHorizontal: 16, gap: 12 }} style={{ backgroundColor: color.bg }}>
      <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 24, letterSpacing: -1, color: color.ink }}>What’s Poppin’</RNText>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: '#222228' }}>
        {WHENS.map((w) => (
          <Pressable key={w.key} accessibilityRole="tab" accessibilityLabel={w.label} accessibilityState={{ selected: when === w.key }} onPress={() => setWhen(w.key)} style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: when === w.key ? color.lime : 'transparent' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: when === w.key ? color.ink : color.inkMuted }}>{w.label}</RNText>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
        {CATS.map((c) => <Pill key={c} label={c} active={cat === c} tone="lime" onPress={() => setCat(c)} />)}
      </ScrollView>
      {list.status === 'loading' ? <SkeletonList rows={3} /> : null}
      {list.status === 'error' ? <ErrorState onRetry={list.reload} /> : null}
      {list.status === 'ready' && list.offlineSince ? <OfflineBanner message={`offline · showing events from ${ago(list.offlineSince)}`} /> : null}
      {list.status === 'ready' && list.data.length === 0 ? (
        <EmptyState
          title={when === 'past' ? 'No past events yet.' : 'Nothing poppin’ yet.'}
          body={cat === 'All' ? 'Check what’s coming up next.' : `No ${cat} events here.`}
          action={cat === 'All' ? { label: when === 'week' ? 'See upcoming' : 'See this week', onPress: () => setWhen(when === 'week' ? 'upcoming' : 'week') } : { label: 'Show all events', onPress: () => setCat('All') }}
        />
      ) : null}
      {list.status === 'ready' ? list.data.map((e) => <EventCard key={e.id} e={e} />) : null}
    </ScrollView>
  );
}

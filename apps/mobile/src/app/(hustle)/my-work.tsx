import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { EmptyState, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';
import { useApi, useAsync, type WorkItem, type WorkStatus, type WorkTab } from '@bunk3d/api';
import { AsyncView, Chips, Display, Pill, SampleTag, T, VIOLET } from '@/features/hustle/kit';

const STATUS: Record<WorkStatus, { label: string; bg: string; fg: string }> = {
  applied: { label: 'APPLIED', bg: color.line, fg: '#C9C9C3' }, shortlisted: { label: 'SHORTLISTED', bg: VIOLET, fg: color.onLime }, in_progress: { label: 'IN PROGRESS', bg: color.info, fg: color.onLime },
  in_review: { label: 'IN REVIEW', bg: color.info, fg: color.onLime }, changes_asked: { label: 'CHANGES ASKED', bg: color.warning, fg: color.onLime }, rejected: { label: 'REJECTED', bg: '#5A1F1F', fg: color.ink },
  in_dispute: { label: 'IN DISPUTE', bg: '#5A1F1F', fg: color.ink }, approved: { label: 'APPROVED', bg: color.warning, fg: color.onLime }, paid: { label: 'PAID', bg: color.success, fg: color.onLime },
};

function route(w: WorkItem) {
  switch (w.target) {
    case 'gig': return `/gig/${w.targetId}`;
    case 'workspace': return `/work/${w.targetId}`;
    case 'proof': return `/work/${w.targetId}/proof`;
    case 'dispute': return `/work/${w.targetId}/dispute`;
    case 'earning': return `/earning/${w.targetId}`;
  }
}

const TABS: WorkTab[] = ['applied', 'active', 'done'];
const NAMES: Record<WorkTab, string> = { applied: 'Applied', active: 'Active', done: 'Done' };

export default function MyWork() {
  const api = useApi();
  const { onScroll } = useChrome();
  const [tab, setTab] = useState<WorkTab>('active');
  const counts = useAsync(() => api.hustle.workCounts(), []);
  const list = useAsync(() => api.hustle.listMyWork(tab), [tab]);
  const items = TABS.map((k) => ({ key: k, label: `${NAMES[k]}${counts.status === 'ready' ? ` · ${counts.data[k]}` : ''}` }));
  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace() + 16, gap: 12 }} style={{ backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: 16 }}><Display size={26}>My Work</Display></View>
      <Chips items={items} value={tab} onChange={setTab} tone="violet" />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <AsyncView state={list} skeletonRows={3}>
          {(rows) => rows.length === 0
            ? <EmptyState title="Nothing here yet." body={tab === 'applied' ? 'Apply to a gig and it shows up here.' : tab === 'active' ? 'Once a payer picks you, the work lives here.' : 'Finished gigs land here.'} action={{ label: 'Browse gigs', onPress: () => router.navigate('/gigs') }} />
            : rows.map((w) => {
              const s = STATUS[w.status];
              return (
                <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${w.title}, ${s.label}`} onPress={() => router.push(route(w) as never)}
                  style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 20, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <T size={12} weight="semi" c={color.inkMuted} style={{ flex: 1 }}>{w.payerName} · {w.payerKind}</T>
                    <Pill label={s.label} bg={s.bg} fg={s.fg} />
                  </View>
                  <T size={16} weight="bold">{w.title}</T>
                  {w.status === 'in_progress' || w.status === 'changes_asked' ? <View style={{ height: 5, borderRadius: 3, backgroundColor: color.line }}><View style={{ height: 5, borderRadius: 3, width: `${w.progressPct}%`, backgroundColor: VIOLET }} /></View> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                    <T size={12} c={color.inkMuted} style={{ flex: 1 }}>{w.next}</T>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Display size={16} c={VIOLET}>{formatPaise(w.takeHomePaise)}</Display>
                      <T size={10} c={color.inkMuted}>take-home</T>
                    </View>
                  </View>
                  {w.seed ? <SampleTag /> : null}
                </Pressable>
              );
            })}
        </AsyncView>
      </View>
    </ScrollView>
  );
}

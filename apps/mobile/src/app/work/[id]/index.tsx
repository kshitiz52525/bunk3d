import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { IconButton } from '@bunk3d/ui/native';
import { useApi, useAsync } from '@bunk3d/api';
import { AsyncView, Box, Btn, Cap, Page, SampleTag, T, VIOLET, fmtAgo, fmtLeft, fmtWeekday } from '@/features/hustle/kit';
import { useState } from 'react';

/** H5 Workspace. */
export default function Workspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const ws = useAsync(() => api.hustle.getWorkspace(id), [id]);
  const [local, setLocal] = useState<boolean[] | null>(null);
  const toggle = async (i: number, cur: boolean[]) => {
    setLocal(cur.map((d, j) => (j === i ? !d : d)));
    try { await api.hustle.toggleMilestone(id, i); } finally { ws.reload(); setLocal(null); }
  };
  const w = ws.status === 'ready' ? ws.data : null;
  const done = w ? (local ?? w.milestones.map((m) => m.done)) : [];
  const n = done.filter(Boolean).length;
  const total = w?.milestones.length ?? 0;
  const ready = w !== null && n === total;
  return (
    <Page title={w?.title ?? 'Workspace'} sub={w ? `${w.payerName} · ${formatPaise(w.payPaise)}${w.payPaise ? ' fixed' : ''}` : ''}
      right={<IconButton icon="chat" label={`Chat with ${w?.briefFrom ?? 'the payer'}`} onPress={() => router.push('/dms')} />}
      footer={w ? <Btn label={ready ? 'Submit proof for review' : `Submit proof (${n}/${total} ready)`} kind={ready ? 'violet' : 'ghost'} onPress={() => router.push(`/work/${id}/proof`)} /> : undefined}>
      <AsyncView state={ws} skeletonRows={3}>
        {(d) => (
          <>
            <Box style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Cap>Progress</Cap>{d.dueAtMs ? <T size={12} c={color.inkMuted}>Due {fmtWeekday(d.dueAtMs)} · {fmtLeft(d.dueAtMs)}</T> : null}</View>
              <T size={28} weight="bold">{n}<T size={16} c={color.inkMuted}>/{total}</T></T>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: color.line }}><View style={{ height: 6, borderRadius: 3, width: `${(n / Math.max(1, total)) * 100}%`, backgroundColor: VIOLET }} /></View>
              <T size={12} c={color.inkMuted}>Your take-home on approval: {formatPaise(d.takeHome.takeHomePaise)} (fee {formatPaise(d.takeHome.feePaise)} + GST {formatPaise(d.takeHome.gstPaise)}, locked).</T>
            </Box>
            <Cap>Milestones</Cap>
            {d.milestones.map((m, i) => {
              const on = !!done[i];
              const editable = d.status === 'in_progress' || d.status === 'changes_asked';
              return (
                <Pressable key={m.label} accessibilityRole="checkbox" accessibilityLabel={m.label} accessibilityState={{ checked: on, disabled: !editable }} disabled={!editable} onPress={() => toggle(i, done)}
                  style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: on ? VIOLET : '#4A4A54', backgroundColor: on ? VIOLET : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <T size={14} weight="bold" c={color.onLime}>✓</T> : null}</View>
                  <T size={14} weight="semi" c={on ? color.inkMuted : color.ink} style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none' }}>{m.label}</T>
                </Pressable>
              );
            })}
            <Cap>Brief from {d.briefFrom}</Cap>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {d.briefFiles.map((b) => <View key={b.name} style={{ backgroundColor: color.surface, borderRadius: 12, padding: 10, borderColor: color.line, borderWidth: 1 }}><T size={13} weight="bold">{b.name}</T><T size={11} c={color.inkMuted}>{b.sizeLabel}</T></View>)}
            </View>
            {d.lastMessage ? <Box><T size={13}><T size={13} weight="bold">{d.lastMessage.from} · {fmtAgo(d.lastMessage.atMs)}</T>{'\n'}{d.lastMessage.text}</T></Box> : null}
            {d.seed ? <SampleTag /> : null}
          </>
        )}
      </AsyncView>
    </Page>
  );
}

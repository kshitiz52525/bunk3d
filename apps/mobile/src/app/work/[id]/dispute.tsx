import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { HustleError, useApi, useAsync } from '@bunk3d/api';
import { AsyncView, Box, Btn, Cap, Page, Pill, T, VIOLET, f, fmtAgo, fmtDay, fmtLeft } from '@/features/hustle/kit';

const DOT = { submitted: VIOLET, rejected: color.error, opened: color.warning, evidence: color.info, decision: color.info } as const;

/** H7 Dispute. Evidence within 48h; money stays in escrow; no fee on disputed money. */
export default function Dispute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const view = useAsync(() => api.hustle.getDispute(id), [id]);
  const [txt, setTxt] = useState<string | null>(null);
  const [att, setAtt] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const d = view.status === 'ready' ? view.data.dispute : null;
  const statement = txt ?? d?.statement ?? '';

  const pick = async () => {
    try { const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false }); if (!r.canceled && r.assets[0]) setAtt([...att, r.assets[0].name]); } catch { setErr('Couldn’t open your files.'); }
  };
  const guard = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); view.reload(); } catch (e) { setErr(e instanceof HustleError ? e.message : 'That didn’t go through. Try again.'); view.reload(); } finally { setBusy(false); }
  };

  return (
    <Page title={view.status === 'ready' ? view.data.workTitle : 'Dispute'} sub={d ? `Dispute ${d.code} · ${d.payerName}` : 'Dispute'}
      footer={view.status === 'ready' ? (
        view.data.dispute
          ? <Btn label={d!.canAddEvidence ? 'Send to Ops' : 'Waiting on Ops'} kind="violet" disabled={!d!.canAddEvidence || statement.trim().length < 5} busy={busy} onPress={() => guard(() => api.hustle.addDisputeEvidence(id, { statement: statement.trim(), attachments: att }))} />
          : <Btn label="Open a dispute" kind="violet" disabled={!view.data.canOpen} busy={busy} onPress={() => guard(() => api.hustle.openDispute(id))} />
      ) : undefined}>
      <AsyncView state={view} skeletonRows={3}>
        {(v) => {
          if (!v.dispute) {
            return <Box style={{ gap: 8 }}><T size={16} weight="bold">No dispute on this work.</T><T size={13} c="#C9C9C3">{v.cannotOpenReason ?? 'The payer rejected this work. You can open a dispute. The money stays in escrow until Ops decides, and no Bunk3d fee is charged on disputed money.'}</T>{err ? <T size={13} c={color.error}>{err}</T> : null}</Box>;
          }
          const x = v.dispute;
          return (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T size={28} weight="bold" style={{ fontFamily: f.display }}>{formatPaise(x.amountPaise)}</T>
                <Pill label="ON HOLD · NOT LOST" bg={color.warning} />
              </View>
              <T size={13} c="#C9C9C3">{x.payerName} rejected your proof: “{x.rejectionReason}” The money stays in escrow until Ops decides. No Bunk3d fee is charged on money under dispute.</T>
              <Cap>Timeline</Cap>
              <Box style={{ gap: 12 }}>
                {x.timeline.map((t, i) => {
                  const pending = t.kind === 'evidence' && x.status === 'open';
                  return (
                    <View key={t.label} style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: pending ? color.line : DOT[t.kind] }} />
                        {i < x.timeline.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: color.line, marginTop: 2 }} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 4 }}>
                        <T size={14} weight="bold" c={pending ? color.inkMuted : color.ink}>{t.label}</T>
                        <T size={12} c={color.inkMuted}>
                          {t.kind === 'evidence' && x.status === 'open' ? (x.canAddEvidence ? `Within 48h of opening · ${fmtLeft(t.atMs!)} left` : 'The 48h window closed') : t.atMs ? `${fmtDay(t.atMs)} · ${fmtAgo(t.atMs)}` : ''}
                          {t.kind === 'evidence' && x.status === 'evidence_received' ? ` · decision by ${fmtDay(x.decisionByMs!)}` : ''}
                        </T>
                      </View>
                    </View>
                  );
                })}
              </Box>
              {x.canAddEvidence ? (
                <>
                  <Cap>Your side</Cap>
                  <TextInput accessibilityLabel="Your statement" value={statement} onChangeText={setTxt} multiline placeholder="What happened, with times and details." placeholderTextColor={color.inkMuted}
                    style={{ minHeight: 100, textAlignVertical: 'top', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12, color: color.ink, fontFamily: f.reg, fontSize: 14 }} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {att.map((a) => <View key={a} style={{ backgroundColor: color.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: color.line }}><T size={12}>{a}</T></View>)}
                    <Pressable accessibilityRole="button" accessibilityLabel="Add evidence file" onPress={pick} style={{ minHeight: 44, minWidth: 44, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}><T size={13} weight="bold" c={color.inkMuted}>+ Add file</T></Pressable>
                  </View>
                </>
              ) : x.status === 'evidence_received' ? (
                <Box style={{ borderColor: color.info }}><T size={13}><T size={13} weight="bold">Evidence sent.</T> Bunk3d Trust will decide by {fmtDay(x.decisionByMs!)}. You can’t be blocked from other gigs while this is open.</T></Box>
              ) : <Box style={{ borderColor: color.error }}><T size={13}>The 48 hour window for evidence has closed. Ops will decide with what is on file.</T></Box>}
              {err ? <T size={13} c={color.error}>{err}</T> : null}
            </>
          );
        }}
      </AsyncView>
    </Page>
  );
}

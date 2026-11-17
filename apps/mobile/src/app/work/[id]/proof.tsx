import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { HustleError, useApi, useAsync, type WorkFile } from '@bunk3d/api';
import { AsyncView, Box, Btn, Cap, Page, T, VIOLET, f, fmtWeekday } from '@/features/hustle/kit';

const STEPS = ['Working', 'Submitted', 'Review', 'Changes', 'Approved'];
const IDX = { working: 0, in_review: 2, changes_asked: 3, approved: 4, rejected: 3 } as const;
const sizeLabel = (b?: number | null) => (b ? (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : '');

/** H6 Submit proof, with the review handoff. */
export default function Proof() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const proof = useAsync(() => api.hustle.getProof(id), [id]);
  const [files, setFiles] = useState<WorkFile[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const p = proof.status === 'ready' ? proof.data : null;
  const editable = p?.status === 'working' || p?.status === 'changes_asked';
  const cur = files ?? p?.files ?? [];
  const noteV = note ?? p?.note ?? '';

  const addFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (!r.canceled && r.assets[0]) setFiles([...cur, { name: r.assets[0].name, sizeLabel: sizeLabel(r.assets[0].size) }]);
    } catch { setErr('Couldn’t open your files. Try again.'); }
  };
  const run = async (submit: boolean) => {
    setBusy(true); setErr(null);
    try {
      if (submit) await api.hustle.submitProof(id, { note: noteV, files: cur });
      else await api.hustle.saveProofDraft(id, { note: noteV, files: cur });
      setFiles(null); setNote(null);
      proof.reload();
    } catch (e) { setErr(e instanceof HustleError ? e.message : 'That didn’t go through. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <Page title="Submit proof" sub={p ? `${p.title} · ${formatPaise(p.payPaise)}` : ''}
      footer={p && editable ? (
        <>
          <T size={12} c={color.inkMuted}>Reviewer has 3 days to approve or ask for changes. No reply = auto-approved.</T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Save draft" kind="ghost" disabled={busy} onPress={() => run(false)} style={{ flex: 1 }} />
            <Btn label={p.status === 'changes_asked' ? 'Resubmit' : 'Submit for review'} kind="violet" busy={busy} disabled={!p.ready || cur.length === 0} onPress={() => run(true)} style={{ flex: 2 }} />
          </View>
          {!p.ready ? <T size={12} c={color.warning}>Finish every milestone in the workspace first.</T> : null}
        </>
      ) : undefined}>
      <AsyncView state={proof} skeletonRows={3}>
        {(d) => (
          <>
            <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel={`Step: ${STEPS[IDX[d.status]]}`}>
              {STEPS.map((s, i) => (
                <View key={s} style={{ flex: 1, gap: 4 }}>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= IDX[d.status] ? (i === 3 ? color.warning : VIOLET) : color.line }} />
                  <T size={10} weight="bold" c={i <= IDX[d.status] ? color.ink : '#6E6E78'}>{s}</T>
                </View>
              ))}
            </View>
            {d.status === 'changes_asked' && d.changeRequest ? <Box style={{ borderColor: color.warning }}><T size={13}><T size={13} weight="bold">{d.reviewerName} asked for changes ({d.revisionsUsed} of {d.revisionsMax} free revisions):</T> {d.changeRequest}</T></Box> : null}
            {d.status === 'rejected' ? <Box style={{ borderColor: color.error }}><T size={13}>{d.reviewerName} rejected this work. You can open a dispute and add your evidence within 48h.</T></Box> : null}
            {d.status === 'approved' ? <Box style={{ borderColor: color.success }}><T size={13}><T size={13} weight="bold">Approved.</T> {formatPaise(d.takeHome.takeHomePaise)} ({formatPaise(d.takeHome.payPaise)} minus the {d.takeHome.feeRateBp / 100}% fee and GST on it) is now <T size={13} weight="bold">Pending</T> in My Bag. It becomes Payable after the 7-day hold.</T></Box> : null}

            {d.status === 'in_review' ? (
              <Box style={{ gap: 10 }}>
                <T size={15} weight="bold">Sent to {d.reviewerName} for review</T>
                <T size={12} c={color.inkMuted}>{d.reviewerRole}</T>
                <T size={13}><T size={13} weight="bold">By {d.reviewDeadlineAtMs ? fmtWeekday(d.reviewDeadlineAtMs) : ''}.</T> {d.reviewerName} approves or asks for changes ({d.revisionsMax} free revisions).</T>
                <T size={13}><T size={13} weight="bold">No reply:</T> auto-approved after 3 days.</T>
                <T size={13}><T size={13} weight="bold">Then:</T> {formatPaise(d.takeHome.takeHomePaise)} goes to <T size={13} weight="bold">Pending</T> in My Bag, Payable after a 7-day hold.</T>
                <T size={12} c={color.inkMuted}>We’ll ping you in Notices. You can keep working on other gigs.</T>
              </Box>
            ) : null}

            {editable ? (
              <>
                <Cap>Files · required by the brief</Cap>
                {cur.map((x) => <Box key={x.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size={13} weight="bold">{x.name}{x.sizeLabel ? ` · ${x.sizeLabel}` : ''}</T><T size={12} c={color.success}>Added</T></Box>)}
                <Pressable accessibilityRole="button" accessibilityLabel="Add a file" onPress={addFile} style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center' }}><T size={13} weight="bold" c={color.inkMuted}>+ Add a file</T></Pressable>
                <Cap>Note to reviewer</Cap>
                <TextInput accessibilityLabel="Note to reviewer" value={noteV} onChangeText={setNote} multiline placeholderTextColor={color.inkMuted}
                  style={{ minHeight: 90, textAlignVertical: 'top', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12, color: color.ink, fontFamily: f.reg, fontSize: 14 }} />
                {err ? <T size={13} c={color.error}>{err}</T> : null}
              </>
            ) : null}

            {d.status === 'in_review' ? <Btn label="Back to My Work" kind="ghost" onPress={() => router.navigate('/my-work')} /> : null}
            {d.status === 'approved' ? (
              <View style={{ gap: 10 }}>
                {d.earningId ? <Btn label={`See ${formatPaise(d.takeHome.takeHomePaise)} in My Bag`} kind="violet" onPress={() => router.push(`/earning/${d.earningId}`)} /> : null}
                <Btn label="Something’s off" kind="ghost" onPress={() => router.push(`/work/${id}/dispute`)} />
              </View>
            ) : null}
            {d.status === 'rejected' ? <Btn label="Open a dispute" kind="violet" onPress={() => router.push(`/work/${id}/dispute`)} /> : null}
          </>
        )}
      </AsyncView>
    </Page>
  );
}

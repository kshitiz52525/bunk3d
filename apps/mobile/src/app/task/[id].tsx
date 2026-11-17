import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { formatPaise, TASK_STEPS, taskStepIndex } from '@bunk3d/core';
import { ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession, type TaskDetail } from '@bunk3d/api';
import { BackBar, T, Tag, fmtDate } from '@/features/crew/parts';

function Compensation({ t, hustle }: { t: TaskDetail; hustle: boolean }) {
  const r = t.reward;
  return (
    <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <T size={10} f="bold" c={color.inkMuted} style={{ letterSpacing: 1 }}>COMPENSATION · SEEN BEFORE YOU ACCEPT</T>
          {r.kind === 'paid' ? (
            <>
              <T size={26} f="display">{formatPaise(r.payPaise)} <T size={13} f="semi" c={color.inkMuted}>fixed</T></T>
              <View style={{ gap: 4 }} accessibilityLabel="Fee breakdown">
                {r.takeHome.waivedPaise > 0 ? <Line label="First ₹1,000 is fee-free" value={`${formatPaise(r.takeHome.waivedPaise)} waived`} /> : null}
                <Line label={`Club-gig fee (${r.takeHome.feeRateBp / 100}%)`} value={`-${formatPaise(r.takeHome.feePaise)}`} />
                <Line label="GST on the fee (18%)" value={`-${formatPaise(r.takeHome.gstPaise)}`} />
                <View style={{ height: 1, backgroundColor: color.line, marginVertical: 2 }} />
                <Line label="You take home" value={formatPaise(r.takeHome.takeHomePaise)} strong />
              </View>
              <T size={12} c={color.inkMuted}>Lands in My Bag after approval.</T>
            </>
          ) : r.kind === 'xp' ? <T size={26} f="display">{`+${r.xp} XP`}</T> : <T size={22} f="display">Certificate</T>}
        </View>
        {r.kind === 'paid' ? <Tag label="PAID" bg={color.lime} fg={color.onLime} /> : null}
      </View>
      {r.kind === 'paid' && hustle ? (
        <Pressable accessibilityRole="link" accessibilityLabel="View the linked gig" onPress={() => router.push(`/gig/${r.gigId}` as never)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <T size={13} f="bold" c={color.lime}>View the linked gig</T>
        </Pressable>
      ) : null}
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <T size={13} f={strong ? 'bold' : 'body'} c={strong ? color.ink : '#C9C9C3'}>{label}</T>
      <T size={13} f="bold" c={strong ? color.lime : color.ink}>{value}</T>
    </View>
  );
}

/** C5 Task detail. */
export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const session = useSession();
  const state = useAsync(() => api.crew.getTask(id), [id]);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (state.status === 'loading') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><SkeletonList rows={4} /></SafeAreaView>;
  if (state.status === 'error') return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><BackBar /><ErrorState onRetry={state.reload} /></SafeAreaView>;
  const t = task ?? state.data;
  const idx = taskStepIndex(t.status);
  const paid = t.reward.kind === 'paid';
  const hasShift = !!t.shift;
  const cta: { label: string; action?: 'accept' | 'start' | 'submit' } =
    t.status === 'assigned' ? { label: paid ? 'Accept scope & pay' : 'Accept task', action: 'accept' }
    : t.status === 'accepted' ? { label: hasShift ? 'Start shift' : 'Start task', action: 'start' }
    : t.status === 'working' ? { label: 'Submit proof', action: 'submit' }
    : t.status === 'revision' ? { label: 'Resubmit', action: 'submit' }
    : t.status === 'review' ? { label: 'In review…' }
    : { label: t.reward.kind === 'paid' ? `Approved · ${formatPaise(t.reward.takeHome.takeHomePaise)} pending` : 'Approved' };
  const submitting = t.status === 'working' || t.status === 'revision';

  async function advance() {
    if (!cta.action) return;
    setBusy(true); setErr(null);
    try {
      setTask(await api.crew.advanceTask(t.id, cta.action, cta.action === 'submit' && file ? { attachmentName: file } : undefined));
      if (cta.action === 'submit') setFile(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That did not work. Try again.');
    } finally { setBusy(false); }
  }
  async function pick() {
    try {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (!r.canceled && r.assets[0]) setFile(r.assets[0].name);
    } catch { setErr('Could not open files. Try again.'); }
  }
  async function ask() {
    if (!question.trim()) return;
    await api.crew.askTaskQuestion(t.id, question);
    setNote(`Question sent to ${t.from}.`);
    setQuestion(''); setAsking(false);
  }

  const done = t.status === 'approved' || t.status === 'review';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <BackBar>
        <View style={{ flex: 1 }}>
          <T size={13} f="semi" c="#C9C9C3" numberOfLines={1}>{`${t.clubName} · from ${t.from}`}</T>
          <T size={11} f="bold" c={color.inkMuted}>Club task</T>
        </View>
      </BackBar>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        <T size={22} f="display" accessibilityRole="header" style={{ lineHeight: 26 }}>{t.title}</T>
        <View accessibilityLabel={`Step ${idx + 1} of 5: ${TASK_STEPS[idx]}`} style={{ flexDirection: 'row', gap: 4 }}>
          {TASK_STEPS.map((l, i) => (
            <View key={l} style={{ flex: 1, gap: 4 }}>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= idx ? color.lime : color.line }} />
              <T size={10} f="bold" c={i <= idx ? color.ink : '#6E6E78'}>{l}</T>
            </View>
          ))}
        </View>
        <Compensation t={t} hustle={(session?.wave ?? 1) >= 3} />
        <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 14, gap: 10 }}>
          {t.shift ? <Row label="Shift" value={`${fmtDate(t.dueMs)} · ${t.shift}`} /> : <Row label="Due" value={fmtDate(t.dueMs)} />}
          <Row label="Reviewer" value={t.reviewer} />
          <View style={{ gap: 4 }}>
            <T size={13} c={color.inkMuted}>Deliverables</T>
            {t.deliverables.map((d) => <T key={d} size={14} f="semi">{`• ${d}`}</T>)}
          </View>
        </View>
        {t.status === 'revision' && t.revisionNote ? (
          <View style={{ backgroundColor: '#2B1F0A', borderColor: color.warning, borderWidth: 1, borderRadius: 14, padding: 12 }}>
            <T size={13} style={{ lineHeight: 19 }}><T size={13} f="bold">{`Revision note from ${t.revisionNote.by}:`}</T>{` ${t.revisionNote.text}`}</T>
          </View>
        ) : null}
        {submitting ? (
          <Pressable accessibilityRole="button" accessibilityLabel={file ? `Attached ${file}. Choose another file` : 'Attach proof file'} onPress={pick} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4A4A54', paddingHorizontal: 12 }}>
            <T size={18} f="bold" c={color.lime}>+</T>
            <T size={14} f="semi">{file ? `${file} attached` : 'Attach proof (optional)'}</T>
          </Pressable>
        ) : null}
        {t.attachments.length > 0 ? <T size={12} c={color.inkMuted}>{`Sent: ${t.attachments.join(', ')}`}</T> : null}
        {asking ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput accessibilityLabel="Your question" value={question} onChangeText={setQuestion} placeholder={`Ask ${t.from} a question`} placeholderTextColor={color.inkMuted} style={{ flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, paddingHorizontal: 12, color: color.ink, fontFamily: 'Inter_500Medium' }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send question" onPress={ask} style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: color.lime, justifyContent: 'center' }}><T size={14} f="bold" c={color.onLime}>Send</T></Pressable>
          </View>
        ) : null}
        {note ? <T size={13} c={color.success} accessibilityRole="alert">{note}</T> : null}
        {err ? <T size={13} c={color.error} accessibilityRole="alert">{err}</T> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: color.line }}>
        {t.status !== 'approved' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Ask a question" onPress={() => setAsking((a) => !a)} style={{ minHeight: 52, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.surfaceRaised, justifyContent: 'center' }}>
            <T size={14} f="bold">Ask a question</T>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={cta.label} accessibilityState={{ disabled: !cta.action || busy }} disabled={!cta.action || busy} onPress={advance} style={{ flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? color.line : color.lime, opacity: busy ? 0.7 : 1 }}>
          <T size={15} f="bold" c={done ? '#C9C9C3' : color.onLime}>{cta.label}</T>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T size={13} c={color.inkMuted}>{label}</T>
      <T size={13} f="bold" style={{ flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}

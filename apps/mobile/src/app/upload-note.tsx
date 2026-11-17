import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, Icon, IconButton, Input, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { MAX_FILE_BYTES, UPLOAD_MAX_PHOTOS, formatMb, validateUpload, type UploadFile } from '@bunk3d/core';
import { useApi, useAsync, type NoteKind } from '@bunk3d/api';
import { Check, Pill } from '@/features/poppin/ui';

// N4 Upload. Rights checkbox is required; one PDF up to 20 MB or up to 10 photos.
const EXAM_TYPES = ['Mid-sem', 'End-sem', 'Supplementary'];
const CURRENT_YEAR = new Date().getFullYear();

export default function UploadNote() {
  const api = useApi();
  const subjects = useAsync(() => api.study.subjects(), []);
  const me = useAsync(() => api.you.me(), []);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [kind, setKind] = useState<NoteKind>('note');
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [examType, setExamType] = useState('End-sem');
  const [anon, setAnon] = useState(false);
  const [rights, setRights] = useState(false);
  const [problem, setProblem] = useState<{ reason: string; sizeBytes?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState(false);

  const subject = subjects.data?.find((s) => s.id === (subjectId ?? subjects.data?.find((x) => x.isMine)?.id ?? subjects.data?.[0]?.id));
  const firstName = me.data?.name?.split(' ')[0] ?? 'You';

  const accept = (next: UploadFile[]) => {
    const c = validateUpload({ title: title || 'x', rightsConfirmed: true, files: next });
    if (!c.ok && (c.reason === 'too_large' || c.reason === 'too_many_photos' || c.reason === 'mixed' || c.reason === 'type')) {
      setProblem({ reason: c.reason, sizeBytes: c.sizeBytes });
      return;
    }
    setProblem(null);
    setFiles(next);
    if (!title && next[0]) setTitle(next[0].name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80));
  };
  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: false });
    if (r.canceled) return;
    const a = r.assets[0];
    accept([{ name: a.name, sizeBytes: a.size ?? 0, mime: a.mimeType ?? 'application/pdf' }]);
  };
  const pickPhotos = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: UPLOAD_MAX_PHOTOS + 1 });
    if (r.canceled) return;
    accept(r.assets.map((a, i) => ({ name: a.fileName ?? `photo-${i + 1}.jpg`, sizeBytes: a.fileSize ?? 0, mime: a.mimeType ?? 'image/jpeg' })));
  };

  const ready = rights && files.length > 0 && title.trim().length > 0 && !!subject && !busy;
  const submit = async () => {
    if (!subject || !ready) return;
    setBusy(true); setFailed(false); setVerifyMsg(false);
    try {
      const r = await api.study.upload({ title, kind, subjectId: subject.id, sem: subject.sem, ...(kind === 'pyq' ? { examYear: year, examLabel: examType } : {}), anon, rightsConfirmed: rights, files });
      if (r.ok) router.replace(`/subject/${subject.id}`); // the form is not somewhere to come back to
      else setProblem({ reason: r.reason, sizeBytes: r.sizeBytes });
    } catch (e) {
      if (e instanceof Error && e.message === 'verify_required') setVerifyMsg(true); else setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const card = problem ? (
    problem.reason === 'too_large' ? { title: 'File too big', body: `That ${files.length > 1 ? 'photo' : 'PDF'} is ${formatMb(problem.sizeBytes ?? 0)}. Max is ${formatMb(MAX_FILE_BYTES)} — or upload up to ${UPLOAD_MAX_PHOTOS} photos.` }
    : problem.reason === 'too_many_photos' ? { title: 'Too many photos', body: `Max is ${formatMb(MAX_FILE_BYTES)} — or up to ${UPLOAD_MAX_PHOTOS} photos.` }
    : { title: 'Pick a PDF or photos', body: `One PDF up to ${formatMb(MAX_FILE_BYTES)}, or up to ${UPLOAD_MAX_PHOTOS} photos. Don’t mix them.` }
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222228' }}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 15, color: color.ink }}>Drop your notes</RNText>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {subjects.status === 'loading' ? <SkeletonList rows={3} /> : null}
        {subjects.status === 'error' ? <ErrorState onRetry={subjects.reload} /> : null}
        {card ? <StateCard domain="NOTES" kind="err" title={card.title} body={card.body} cta={{ label: 'Pick another', onPress: () => { setProblem(null); setFiles([]); } }} /> : null}
        {files.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.lime, borderWidth: 1.5, borderRadius: 16, padding: 12 }}>
            <View style={{ width: 42, height: 52, borderRadius: 9, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime }}>{files[0].mime.startsWith('image/') ? 'IMG' : 'PDF'}</RNText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <RNText numberOfLines={1} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{files.length > 1 ? `${files.length} photos` : files[0].name}</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{formatMb(files.reduce((s, f) => s + f.sizeBytes, 0))} of {formatMb(MAX_FILE_BYTES)} · ready</RNText>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: color.line, marginTop: 6 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: color.lime, width: `${Math.min(100, Math.max(4, (files.reduce((s, f) => s + f.sizeBytes, 0) / MAX_FILE_BYTES) * 100))}%` }} />
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove file" onPress={() => setFiles([])} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={16} />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose a PDF" onPress={pickPdf} style={{ flex: 1, minHeight: 88, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="studyFile" size={22} color={color.lime} />
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>Choose a PDF</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: color.inkMuted }}>Max {formatMb(MAX_FILE_BYTES)}</RNText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Add photos" onPress={pickPhotos} style={{ flex: 1, minHeight: 88, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="image" size={22} color={color.lime} />
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>Add photos</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: color.inkMuted }}>Up to {UPLOAD_MAX_PHOTOS}</RNText>
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: 14, padding: 4, gap: 4 }}>
          {([['note', 'Notes'], ['pyq', 'Past paper (PYQ)']] as const).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={l} accessibilityState={{ selected: kind === k }} onPress={() => setKind(k)} style={{ flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: kind === k ? color.lime : 'transparent' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: kind === k ? color.onLime : color.inkMuted }}>{l}</RNText>
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 6 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>Title</RNText>
          <Input label="Title" value={title} onChangeText={setTitle} maxLength={80} placeholder="End-sem 2023" />
        </View>
        <View style={{ gap: 6 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>SUBJECT</RNText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(subjects.data ?? []).map((s) => <Pill key={s.id} label={`${s.code} · ${s.short}`} active={subject?.id === s.id} onPress={() => setSubjectId(s.id)} />)}
          </View>
          {subject ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>Sem {subject.sem}</RNText> : null}
        </View>
        {kind === 'pyq' ? (
          <View style={{ gap: 6 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>EXAM YEAR</RNText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[0, 1, 2, 3, 4].map((d) => <Pill key={d} label={String(CURRENT_YEAR - d)} active={year === CURRENT_YEAR - d} onPress={() => setYear(CURRENT_YEAR - d)} />)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXAM_TYPES.map((t) => <Pill key={t} label={t} active={examType === t} onPress={() => setExamType(t)} />)}
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12 }}>
          <View style={{ flex: 1 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>Show as</RNText>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: color.inkMuted }}>{anon ? 'Karma still counts for you' : 'Your name on the note'}</RNText>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: color.bg, borderRadius: 12, padding: 3 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Show as ${firstName}`} accessibilityState={{ selected: !anon }} onPress={() => setAnon(false)} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 9, justifyContent: 'center', backgroundColor: anon ? 'transparent' : color.ink }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: anon ? color.inkMuted : color.onLime }}>{firstName}</RNText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Show as anonymous" accessibilityState={{ selected: anon }} onPress={() => setAnon(true)} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 9, justifyContent: 'center', backgroundColor: anon ? color.violet : 'transparent' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: anon ? color.onLime : color.inkMuted }}>Anon</RNText>
            </Pressable>
          </View>
        </View>
        <Check checked={rights} onToggle={() => setRights((v) => !v)} label="This is my own work or a past paper — not a copyrighted textbook." />
        {verifyMsg ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>Uploading unlocks after verification.</RNText> : null}
        {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>That didn’t go through. Try again.</RNText> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={rights ? 'Upload' : 'Tick the box to upload'} accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={submit} style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: ready ? color.lime : '#2A2A31', boxShadow: ready ? `4px 4px 0 ${color.violet}` : undefined }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: ready ? color.onLime : '#6E6E78' }}>{busy ? 'Uploading…' : rights ? 'Upload · +2 karma per save' : 'Tick the box to upload'}</RNText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

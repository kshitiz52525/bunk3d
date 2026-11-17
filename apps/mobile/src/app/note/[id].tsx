import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, Icon, IconButton, OfflineBanner, SkeletonList } from '@bunk3d/ui/native';
import { useApi, type NoteDetail } from '@bunk3d/api';
import { ago, dropCache, isOffline, readCache, writeCache } from '@/features/poppin/cache';

// N3 Viewer. "Save offline" keeps the note on the device (AsyncStorage here; files in the backend phase).
const offlineKey = (id: string) => `study.saved.${id}`;

export default function Viewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const [note, setNote] = useState<NoteDetail | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      setFailed(false);
      try {
        if (isOffline()) throw new Error('offline');
        const n = await api.study.getNote(id);
        if (!live) return;
        setNote(n);
        setOfflineAt(null);
        if (n?.saved) await writeCache(offlineKey(id), n); // keep the saved copy fresh
      } catch {
        const c = await readCache<NoteDetail>(offlineKey(id));
        if (!live) return;
        if (c) { setNote(c.data); setOfflineAt(c.at); } else setFailed(true);
      }
    })();
    return () => { live = false; };
  }, [id, api, tick]);

  const upvote = async () => {
    if (!note) return;
    setMsg(null);
    try {
      const r = await api.study.toggleUpvote(note.id);
      setNote((n) => (n ? { ...n, upvoted: r.upvoted, upvotes: r.upvotes } : n));
    } catch (e) {
      setMsg(e instanceof Error && e.message === 'verify_required' ? 'Voting unlocks after verification.' : e instanceof Error && e.message === 'own_note' ? 'You can’t upvote your own note.' : 'Couldn’t send that. Try again.');
    }
  };
  const save = async () => {
    if (!note) return;
    setMsg(null);
    try {
      const r = await api.study.toggleSave(note.id);
      const next = { ...note, saved: r.saved, saves: r.saves };
      setNote((n) => (n ? { ...n, saved: r.saved, saves: r.saves } : n));
      if (r.saved) await writeCache(offlineKey(note.id), next); else await dropCache(offlineKey(note.id));
    } catch {
      setMsg('Couldn’t save that. Try again.');
    }
  };
  const share = async () => {
    if (!note) return;
    try { await Share.share({ message: `${note.title} on Bunk3d` }); } catch { /* sharing unavailable */ }
  };

  const pages = note?.previewPages ?? [];
  const cur = pages[Math.min(page, Math.max(0, pages.length - 1))];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#060607' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <RNText numberOfLines={1} accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{note ? note.title : ' '}</RNText>
          <RNText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>{note ? `${note.kind === 'pyq' ? 'PYQ' : 'Note'} · uploaded by ${note.authorLabel} · ${note.uploadedLabel}` : ' '}</RNText>
        </View>
        {note ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Report: wrong subject, copyright, inappropriate" onPress={() => router.push(`/report?targetKind=note&targetId=${note.id}`)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="more" size={22} />
          </Pressable>
        ) : null}
      </View>
      {offlineAt ? <View style={{ paddingHorizontal: 16 }}><OfflineBanner message={`offline · showing your saved copy from ${ago(offlineAt)}`} /></View> : null}
      {note === undefined && !failed ? <SkeletonList rows={4} /> : null}
      {failed ? <ErrorState onRetry={() => { setNote(undefined); setTick((t) => t + 1); }} /> : null}
      {note === null ? <EmptyState title="This note isn’t available." body="It may have been removed." action={{ label: 'Back to subject', onPress: () => router.back() }} /> : null}
      {note ? (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, alignItems: 'center', gap: 14 }}>
            <View accessibilityLabel={`Page ${page + 1} of ${note.pages}`} style={{ width: '100%', minHeight: 420, backgroundColor: '#FAFAF7', borderRadius: 6, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
              {cur?.heading ? <RNText style={{ textAlign: 'center', fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#1A1A1A' }}>{cur.heading}</RNText> : null}
              <View style={{ height: 1, backgroundColor: '#222', marginVertical: 12 }} />
              {cur?.lines.map((l, i) => <RNText key={i} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18, color: '#1A1A1A', marginBottom: 10 }}>{l}</RNText>)}
              {cur?.solution ? (
                <View style={{ backgroundColor: '#F0FFC0', borderLeftWidth: 3, borderLeftColor: '#7A9A00', padding: 10 }}>
                  <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#1A1A1A' }}>{cur.solution}</RNText>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous page" disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center', opacity: page === 0 ? 0.4 : 1 }}>
                <Icon name="back" size={20} />
              </Pressable>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.ink, backgroundColor: color.surfaceRaised, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' }}>Page {page + 1} / {note.pages}</RNText>
              <Pressable accessibilityRole="button" accessibilityLabel="Next page" disabled={page >= note.pages - 1} onPress={() => setPage((p) => Math.min(note.pages - 1, p + 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center', opacity: page >= note.pages - 1 ? 0.4 : 1 }}>
                <Icon name="chevronRight" size={20} />
              </Pressable>
            </View>
            {msg ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.warning }}>{msg}</RNText> : null}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: '#222228' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Upvote, ${note.upvotes}`} accessibilityState={{ selected: note.upvoted }} onPress={upvote} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 48, borderRadius: 16, backgroundColor: note.upvoted ? color.lime : color.surfaceRaised }}>
              <Icon name="arrowUp" size={18} color={note.upvoted ? color.onLime : color.ink} />
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: note.upvoted ? color.onLime : color.ink }}>{note.upvotes}</RNText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={note.saved ? 'Saved offline' : 'Save offline'} accessibilityState={{ selected: note.saved }} onPress={save} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 16, backgroundColor: note.saved ? color.violet : color.ink }}>
              <Icon name="download" size={18} color={color.onLime} />
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.onLime }}>{note.saved ? 'Saved offline ✓' : 'Save offline'}</RNText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={share} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="share" size={20} />
            </Pressable>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

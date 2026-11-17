import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAMPUS_TOPICS, TEA_MAX_POLL_OPTIONS, TEA_MAX_POST_CHARS } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { Chip, Icon, IconButton, StateCard } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession, type CreatePostResult, type TeaScope } from '@bunk3d/api';
import { notifyTeaChanged } from '@/features/tea/util';
import { MutedCard, PendingCard, useMyTea } from '@/features/tea/gate';
import { ResultCard } from '@/features/tea/ResultCard';

const ENDS = [{ label: '1 hour', h: 1 }, { label: '1 day', h: 24 }, { label: '3 days', h: 72 }];

// T3 Create: text or poll, post in campus or a community, anonymous only when unlocked.
export default function Create() {
  const p = useLocalSearchParams<{ communityId?: string; text?: string; topic?: string; editId?: string }>();
  const api = useApi();
  const session = useSession();
  const my = useMyTea();
  const communities = useAsync(() => api.tea.listCommunities(), []);
  const [where, setWhere] = useState<string>(p.communityId ?? 'campus');
  const [topic, setTopic] = useState(p.topic ?? '');
  const [text, setText] = useState(p.text ?? '');
  const [anon, setAnon] = useState(false);
  const [poll, setPoll] = useState(false);
  const [opts, setOpts] = useState(['', '']);
  const [endsIdx, setEndsIdx] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CreatePostResult | null>(null);
  const editing = !!p.editId;

  const joined = communities.data?.joined ?? [];
  const comm = joined.find((c) => c.id === where) ?? (communities.data?.discover.find((c) => c.id === where));
  const topics = where === 'campus' ? [...CAMPUS_TOPICS] : comm?.tags ?? [];
  const community = where !== 'campus';
  const anonOn = anon && !!my.status?.anonUnlocked && !community;
  const anonLocked = !my.status?.anonUnlocked;
  const campusId = session?.campusId ?? 'atria';
  const scope: TeaScope = community ? { type: 'community', communityId: where } : { type: 'campus', campusId };
  const ready = text.trim().length > 0 && !!topic && (!poll || opts.filter((o) => o.trim()).length >= 2);
  const blocked = !my.verified ? 'pending' : my.muted ? 'muted' : null;


  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    if (editing) {
      await api.tea.editHeldPost(p.editId!, text);
      notifyTeaChanged();
      setBusy(false);
      router.back();
      return;
    }
    const r = await api.tea.createPost({ scope, topic, body: text, anon: anonOn, ...(poll ? { poll: { options: opts, endsInHours: ENDS[endsIdx]!.h } } : {}) });
    setBusy(false);
    setResult(r);
    my.reload();
    notifyTeaChanged();
  };
  const goPhoto = () => router.push({ pathname: '/post/photo', params: { text, topic, anon: anonOn ? '1' : '', ...(community ? { communityId: where } : {}) } });

  const done = result?.ok ? result : null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 }}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 17, color: color.ink }}>{editing ? 'Edit post' : 'Spill it'}</RNText>
        <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Save' : 'Post'} accessibilityState={{ disabled: !ready || !!blocked || busy }} disabled={!ready || !!blocked || busy} onPress={submit} style={{ minHeight: 44, minWidth: 64, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: ready && !blocked ? color.lime : '#2A2A31' }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: ready && !blocked ? color.onLime : '#6E6E78' }}>{busy ? '...' : editing ? 'Save' : 'Post'}</RNText>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={{ gap: 14 }}>
              {done.status === 'with_mods' ? (
                <StateCard domain="TEA" kind="info" title="Your post is with the Mods" body="Our safety check flagged it. Two Campus Mods will look, usually within an hour." cta={{ label: 'Got it', onPress: () => router.back() }} alt={{ label: 'Edit post', onPress: () => { setResult(null); } }} />
              ) : (
                <>
                  <View aria-hidden style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={28} color={color.onLime} stroke={3} /></View>
                  <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.ink }}>Posted. It’s live.</RNText>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21, color: color.inkMuted }}>Passed the quick safety check. If something gets flagged, it goes to your Campus Mods first and we tell you why.</RNText>
                  <Pressable accessibilityRole="button" accessibilityLabel="See it in the feed" onPress={() => router.back()} style={{ minHeight: 56, borderRadius: 16, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', boxShadow: `4px 4px 0 ${color.violet}` }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.onLime }}>See it in the feed</RNText></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Write another" onPress={() => { setResult(null); setText(''); setPoll(false); setOpts(['', '']); }} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.ink }}>Write another</RNText></Pressable>
                </>
              )}
            </View>
          ) : (
            <>
              {blocked === 'pending' ? <PendingCard /> : null}
              {blocked === 'muted' && my.mutedUntil ? <MutedCard until={my.mutedUntil} /> : null}
              {result && !result.ok ? <ResultCard r={result} onClose={() => setResult(null)} /> : null}

              <View style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: 16, padding: 3 }}>
                <Seg label={`Post as ${my.first}`} on={!anonOn} onPress={() => setAnon(false)} />
                <Seg label="Post anonymously" on={anonOn} violet locked={anonLocked || community} onPress={() => { if (!anonLocked && !community) setAnon(true); }} />
              </View>
              {anonLocked ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="lock" size={16} color={color.violet} />
                  <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted }}>Anon unlocks at <RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.anonInk }}>20 karma</RNText> and a 7-day-old account. You’re at {my.status?.karma ?? 0} karma, day {my.status?.accountAgeDays ?? 0}.</RNText>
                </View>
              ) : null}

              {!editing ? (
                <View style={{ gap: 8 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>POST IN</RNText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                    <Chip label={my.me?.campusName ?? 'Campus'} selected={where === 'campus'} onPress={() => { setWhere('campus'); setTopic(''); }} />
                    {joined.map((c) => <Chip key={c.id} label={c.name} selected={where === c.id} onPress={() => { setWhere(c.id); setTopic(''); }} />)}
                  </ScrollView>
                  <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: where === 'campus' ? color.inkMuted : color.lime }}>{where === 'campus' ? `Only verified ${my.me?.campusName ?? 'campus'} students see this` : `Community · ${comm?.colleges ?? ''} colleges see this · your college name shows`}</RNText>
                </View>
              ) : null}

              <TextInput accessibilityLabel="Post text" multiline placeholder="what’s the tea?" placeholderTextColor={color.inkMuted} value={text} onChangeText={(t) => setText(t.slice(0, TEA_MAX_POST_CHARS))} style={{ minHeight: 140, textAlignVertical: 'top', backgroundColor: color.surface, borderRadius: 18, borderWidth: anonOn ? 1 : 0, borderColor: color.violet, padding: 16, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{anonOn ? 'Don’t name students in anon posts.' : ''}</RNText>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{text.length} / {TEA_MAX_POST_CHARS}</RNText>
              </View>

              {poll && !editing ? (
                <View style={{ gap: 8 }}>
                  {opts.map((o, i) => <TextInput key={i} accessibilityLabel={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} placeholderTextColor={color.inkMuted} value={o} onChangeText={(t) => setOpts((a) => a.map((x, k) => (k === i ? t : x)))} style={{ minHeight: 44, backgroundColor: color.surface, borderRadius: 12, paddingHorizontal: 14, color: color.ink, fontFamily: 'Inter_600SemiBold', fontSize: 14 }} />)}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {opts.length < TEA_MAX_POLL_OPTIONS ? <Pressable accessibilityRole="button" accessibilityLabel="Add option" onPress={() => setOpts((a) => [...a, ''])} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>+ option (max 4)</RNText></Pressable> : <View />}
                    <Pressable accessibilityRole="button" accessibilityLabel={`Poll ends in ${ENDS[endsIdx]!.label}. Change`} onPress={() => setEndsIdx((i) => (i + 1) % ENDS.length)} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.inkMuted }}>Ends in <RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.ink }}>{ENDS[endsIdx]!.label} ▾</RNText></RNText></Pressable>
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>Topic <RNText style={{ color: color.hot }}>*</RNText></RNText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{topics.map((t) => <Chip key={t} label={t} selected={t === topic} onPress={() => setTopic(t)} />)}</View>
              </View>

              {!editing ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Add photos: camera or device" onPress={goPhoto} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: color.surfaceRaised }}>
                    <Icon name="image" size={18} color={color.ink} /><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>Photo</RNText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Add poll" accessibilityState={{ selected: poll }} onPress={() => setPoll((v) => !v)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: poll ? color.lime : color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="teaPoll" size={20} color={poll ? color.onLime : color.ink} />
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Seg({ label, on, onPress, violet, locked }: { label: string; on: boolean; onPress: () => void; violet?: boolean; locked?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={locked ? `${label}, locked` : label} accessibilityState={{ selected: on, disabled: !!locked }} onPress={onPress} style={{ flex: 1, minHeight: 44, borderRadius: 13, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (violet ? color.violet : color.ink) : 'transparent' }}>
      {locked ? <Icon name="lock" size={14} color="#5A5A64" /> : null}
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: on ? color.onLime : locked ? '#5A5A64' : '#9A9AA5' }}>{label}</RNText>
    </Pressable>
  );
}

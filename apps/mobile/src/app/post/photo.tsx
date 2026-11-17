import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAMPUS_TOPICS, STORY_VIDEO_MAX_BYTES, STORY_VIDEO_MAX_SECONDS, TEA_MAX_PHOTOS, validateFeedVideo, validateStoryVideo } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { Chip, Icon, IconButton, PrimaryCta } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession, type CreatePostResult, type Media } from '@bunk3d/api';
import { notifyTeaChanged } from '@/features/tea/util';
import { FILTERS, MediaTile } from '@/features/tea/Media';
import { MutedCard, PendingCard, useMyTea } from '@/features/tea/gate';
import { ResultCard } from '@/features/tea/ResultCard';

type Step = 'source' | 'camera' | 'compose' | 'done';

// T11 Photo post and story composer: camera with filters or upload (photos and video), then compose.
export default function PhotoComposer() {
  const p = useLocalSearchParams<{ text?: string; topic?: string; anon?: string; communityId?: string; mode?: string }>();
  const api = useApi();
  const session = useSession();
  const my = useMyTea();
  const communities = useAsync(() => api.tea.listCommunities(), []);
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const community = !!p.communityId;
  const anonLocked = !my.status?.anonUnlocked;
  const [step, setStep] = useState<Step>('source');
  const [items, setItems] = useState<Media[]>([]);
  const [idx, setIdx] = useState(0);
  const [front, setFront] = useState(false);
  const [flash, setFlash] = useState(false);
  const [filt, setFilt] = useState(0);
  const [anon, setAnon] = useState(!!p.anon);
  const [feed, setFeed] = useState(p.mode !== 'story');
  const [story, setStory] = useState(p.mode === 'story' || (!p.anon && !community));
  const [topic, setTopic] = useState(p.topic ?? '');
  const [caption, setCaption] = useState(p.text ?? '');
  const [audience, setAudience] = useState<'campus' | 'close'>('campus');
  const [blur, setBlur] = useState(true);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CreatePostResult | null>(null);
  const [note, setNote] = useState('');

  const anonOn = anon && !anonLocked && !community;
  const storyOn = story && !anonOn && !community;
  const comm = communities.data?.joined.find((c) => c.id === p.communityId);
  const topics = community ? comm?.tags ?? [] : [...CAMPUS_TOPICS];
  const cur = items[idx];
  const blocked = !my.verified ? 'pending' : my.muted ? 'muted' : null;

  const videoErr = (() => {
    for (const m of items) {
      if (m.kind !== 'video' || m.durationSec === undefined || m.sizeBytes === undefined) continue;
      const v = { durationSec: m.durationSec, sizeBytes: m.sizeBytes };
      if (storyOn && !validateStoryVideo(v).ok) return `Story videos are ${STORY_VIDEO_MAX_SECONDS} seconds or less and ${STORY_VIDEO_MAX_BYTES / 1024 / 1024} MB or less.`;
      if (feed && !validateFeedVideo(v).ok) return 'That video is too long or too big for the feed.';
    }
    return '';
  })();
  const dest = feed && storyOn ? 'both' : storyOn ? 'story' : 'feed';
  const cta = { feed: 'Share to feed', story: 'Share to story', both: 'Share to feed + story' }[dest];
  const ready = items.length > 0 && (feed || storyOn) && (!feed || !!topic) && !videoErr && !blocked;

  const upload = async () => {
    setNote('');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: TEA_MAX_PHOTOS, quality: 0.9 });
    if (r.canceled || !r.assets.length) return;
    const picked: Media[] = r.assets.slice(0, TEA_MAX_PHOTOS).map((a) => ({
      kind: a.type === 'video' ? 'video' : 'image', uri: a.uri, ratio: a.width && a.height ? a.width / a.height : 1, alt: a.fileName ?? 'Photo',
      ...(a.type === 'video' ? { durationSec: (a.duration ?? 0) / 1000, sizeBytes: a.fileSize ?? 0 } : {}),
    }));
    setItems(picked); setIdx(0); setStep('compose');
  };
  const shoot = async () => {
    try {
      const pic = await cam.current?.takePictureAsync({ quality: 0.85 });
      if (!pic) return;
      setItems([{ kind: 'image', uri: pic.uri, ratio: pic.width / pic.height, alt: 'Photo from camera', filter: FILTERS[filt]!.name }]);
      setIdx(0); setStep('compose');
    } catch { setNote('Couldn’t take that photo. Try again or upload instead.'); }
  };

  const share = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const media = items.map((m) => ({ ...m, alt: alt.trim() || m.alt, blurred: anonOn ? blur : undefined }));
    const r = await api.tea.createPost({
      scope: community ? { type: 'community', communityId: p.communityId! } : { type: 'campus', campusId: session?.campusId ?? 'atria' },
      topic: topic || 'Random', body: caption, anon: anonOn, media, storyOnly: !feed, alsoStory: feed && storyOn, audience,
    });
    setBusy(false);
    if (r.ok) setStep('done');
    setResult(r);
    notifyTeaChanged();
  };

  if (step === 'camera') {
    const tint = FILTERS[filt]!.tint;
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, zIndex: 2 }}>
            <IconButton icon="close" label="Close camera" onPress={() => setStep('source')} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Flash ${flash ? 'on' : 'off'}`} onPress={() => setFlash((f) => !f)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: flash ? color.lime : 'rgba(31,31,37,0.75)', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Icon name="teaFlash" size={16} color={flash ? color.onLime : color.ink} /><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: flash ? color.onLime : color.ink }}>Flash {flash ? 'on' : 'off'}</RNText>
            </Pressable>
            <IconButton icon="teaFlip" label="Switch camera" onPress={() => setFront((f) => !f)} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
            {perm?.granted ? (
              <>
                <CameraView ref={cam} facing={front ? 'front' : 'back'} flash={flash ? 'on' : 'off'} style={{ position: 'absolute', inset: 0 }} />
                {tint ? <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: tint }} /> : null}
              </>
            ) : (
              <View style={{ padding: 24, gap: 12, alignItems: 'center' }}>
                <Icon name="camera" size={32} color={color.inkMuted} />
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, textAlign: 'center', color: color.ink }}>{perm?.canAskAgain === false ? 'Camera access is off for Bunk3d.' : 'Bunk3d needs the camera to take a photo.'}</RNText>
                {perm?.canAskAgain !== false ? <Pressable accessibilityRole="button" accessibilityLabel="Allow camera" onPress={requestPerm} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: color.lime, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.onLime }}>Allow camera</RNText></Pressable> : null}
                <Pressable accessibilityRole="button" accessibilityLabel="Upload from device instead" onPress={() => { setStep('source'); void upload(); }} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.ink, textDecorationLine: 'underline' }}>Upload from device instead</RNText></Pressable>
              </View>
            )}
          </View>
          {note ? <RNText accessibilityRole="alert" style={{ textAlign: 'center', color: color.error, fontFamily: 'Inter_600SemiBold', fontSize: 12, padding: 6 }}>{note}</RNText> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }} style={{ flexGrow: 0 }}>
            {FILTERS.map((f, i) => (
              <Pressable key={f.name} accessibilityRole="button" accessibilityLabel={`Filter: ${f.name}`} accessibilityState={{ selected: i === filt }} onPress={() => setFilt(i)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: i === filt ? color.lime : 'transparent', borderWidth: 1, borderColor: i === filt ? color.lime : '#2E2E36' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: i === filt ? color.onLime : color.ink }}>{f.name}</RNText>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 16 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Upload from device instead" onPress={() => { setStep('source'); void upload(); }} style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={22} color={color.ink} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={shoot} disabled={!perm?.granted} style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: color.ink, alignItems: 'center', justifyContent: 'center', opacity: perm?.granted ? 1 : 0.4 }}><View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: color.ink }} /></Pressable>
            <RNText style={{ width: 52, textAlign: 'center', fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted }}>PHOTO</RNText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 }}>
        <IconButton icon="back" label="Back to your post" onPress={() => (step === 'compose' ? setStep('source') : router.back())} />
        <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 15, color: color.ink }}>{p.mode === 'story' ? 'New story' : 'New photo post'}</RNText>
        <RNText style={{ width: 44, textAlign: 'right', fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.inkMuted }}>{step === 'compose' ? (cur?.kind === 'image' && cur.filter ? 'camera' : `${items.length}/${TEA_MAX_PHOTOS}`) : ''}</RNText>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          {step === 'source' ? (
            <View style={{ gap: 12 }}>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.ink }}>Where’s the pic coming from?</RNText>
              <Source icon="camera" title="Click from camera" sub="Filters, flash, front camera" onPress={() => { setNote(''); setStep('camera'); }} />
              <Source icon="image" title="Upload from device" sub="Up to 10 photos or a video, any shape" onPress={upload} />
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Bunk3d only sees the photos and videos you pick.</RNText>
            </View>
          ) : null}

          {step === 'compose' && cur ? (
            <>
              {blocked === 'pending' ? <PendingCard /> : null}
              {blocked === 'muted' && my.mutedUntil ? <MutedCard until={my.mutedUntil} /> : null}
              {result && !result.ok ? <ResultCard r={result} onClose={() => setResult(null)} /> : null}

              <View style={{ alignSelf: 'center', width: '100%', maxWidth: 320 }}>
                <MediaTile media={{ ...cur, blurred: anonOn && blur }} style={{ width: '100%', aspectRatio: Math.min(1.91, Math.max(0.5625, cur.ratio)), borderRadius: 20 }} iconSize={40} />
                {anonOn && blur ? <RNText style={{ position: 'absolute', left: 10, top: 10, fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime, backgroundColor: color.violet, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }}>FACES BLURRED</RNText> : null}
              </View>
              {items.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
                  {items.map((m, i) => (
                    <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i === idx ? 'Selected' : 'Select'} ${i + 1}: ${m.alt}`} onPress={() => setIdx(i)} style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: i === idx ? color.lime : 'transparent' }}>
                      <MediaTile media={m} style={{ flex: 1 }} iconSize={16} />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              {cur.kind === 'video' ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>Video · stories max {STORY_VIDEO_MAX_SECONDS} s and {STORY_VIDEO_MAX_BYTES / 1024 / 1024} MB.</RNText> : null}
              {videoErr ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.error }}>{videoErr}</RNText> : null}

              <View style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: 16, padding: 3 }} accessibilityLabel="Post as">
                <Seg label={`Post as ${my.first}`} on={!anonOn} onPress={() => { setAnon(false); if (!community) setStory(true); }} />
                <Seg label="Anonymously" on={anonOn} violet locked={anonLocked || community} onPress={() => { if (!anonLocked && !community) { setAnon(true); setStory(false); setFeed(true); } }} />
              </View>
              {anonLocked ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Icon name="lock" size={16} color={color.violet} />
                  <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted }}>Anon unlocks at <RNText style={{ fontFamily: 'Inter_800ExtraBold', color: color.anonInk }}>20 karma</RNText> and a 7-day-old account. You’re at {my.status?.karma ?? 0} karma, day {my.status?.accountAgeDays ?? 0}.</RNText>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>POST TO</RNText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Dest label="Feed" on={feed} accent={anonOn ? color.violet : color.lime} onPress={() => { if (feed && !storyOn) return; setFeed(!feed); }} />
                  <Dest label="Story" on={storyOn} disabled={anonOn || community} accent={color.lime} onPress={() => { if (storyOn && !feed) return; setStory(!storyOn); }} />
                </View>
                {anonOn ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Anonymous posts go to the Tea feed only. Stories always show your name.</RNText> : null}
                {community ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Community posts can’t go to your story.</RNText> : null}
              </View>

              {feed ? (
                <View style={{ gap: 8 }}>
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>TOPIC <RNText style={{ color: color.hot }}>*</RNText></RNText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{topics.map((t) => <Chip key={t} label={t} selected={t === topic} onPress={() => setTopic(t)} />)}</View>
                </View>
              ) : null}

              {storyOn ? (
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  <Chip label="Campus" selected={audience === 'campus'} onPress={() => setAudience('campus')} />
                  <Chip label="Close connections" selected={audience === 'close'} onPress={() => setAudience('close')} />
                </View>
              ) : null}

              <TextInput accessibilityLabel="Caption" placeholder="Add a caption" placeholderTextColor={color.inkMuted} value={caption} onChangeText={setCaption} multiline style={{ minHeight: 48, backgroundColor: color.surface, borderRadius: 14, padding: 14, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 15 }} />
              {anonOn ? (
                <Pressable accessibilityRole="switch" accessibilityLabel={`Blur faces ${blur ? 'on' : 'off'}`} accessibilityState={{ checked: blur }} onPress={() => setBlur((b) => !b)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
                  <Icon name="teaBlur" size={18} color={color.anonInk} /><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.anonInk }}>Blur faces: {blur ? 'on' : 'off'}</RNText>
                </Pressable>
              ) : null}
              <View style={{ gap: 6 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.inkMuted }}>ALT TEXT · FOR SCREEN READERS</RNText>
                <TextInput accessibilityLabel="Alt text" placeholder="Describe the photo" placeholderTextColor={color.inkMuted} value={alt} onChangeText={setAlt} style={{ minHeight: 44, backgroundColor: color.surface, borderRadius: 12, paddingHorizontal: 14, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 14 }} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Retake" onPress={() => setStep(cur.filter ? 'camera' : 'source')} style={{ minHeight: 44, justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.inkMuted }}>{cur.filter ? 'Retake' : 'Pick different'}</RNText></Pressable>
              <PrimaryCta label={cta} onPress={share} disabled={!ready} loading={busy} />
            </>
          ) : null}

          {step === 'done' ? (
            <View style={{ gap: 14 }}>
              {result?.ok && result.status === 'with_mods' ? (
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 21, color: color.inkMuted }}>Your post is with the Mods. Our safety check flagged it. Two Campus Mods will look, usually within an hour.</RNText>
              ) : null}
              <View aria-hidden style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={28} color={color.onLime} stroke={3} /></View>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.ink }}>{result?.ok && result.status === 'with_mods' ? 'Sent for a quick look.' : 'Posted. It’s live.'}</RNText>
              <PrimaryCta label="See it in the feed" onPress={() => router.dismissTo('/tea')} />
              {storyOn ? <Pressable accessibilityRole="button" accessibilityLabel="View stories" onPress={() => router.dismissTo('/tea')} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.ink }}>View stories</RNText></Pressable> : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Source({ icon, title, sub, onPress }: { icon: 'camera' | 'image'; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 20, padding: 16, minHeight: 72 }}>
      <View aria-hidden style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} color={color.onLime} /></View>
      <View style={{ flex: 1 }}><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{title}</RNText><RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{sub}</RNText></View>
      <Icon name="chevronRight" size={18} color={color.inkMuted} />
    </Pressable>
  );
}
function Seg({ label, on, onPress, violet, locked }: { label: string; on: boolean; onPress: () => void; violet?: boolean; locked?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={locked ? `${label}, locked` : label} accessibilityState={{ selected: on, disabled: !!locked }} onPress={onPress} style={{ flex: 1, minHeight: 44, borderRadius: 13, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (violet ? color.violet : color.lime) : 'transparent' }}>
      {locked ? <Icon name="lock" size={14} color="#5A5A64" /> : null}
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: on ? color.onLime : locked ? '#5A5A64' : '#9A9AA5' }}>{label}</RNText>
    </Pressable>
  );
}
function Dest({ label, on, accent, onPress, disabled }: { label: string; on: boolean; accent: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={disabled ? `${label}, not available` : label} accessibilityState={{ checked: on, disabled: !!disabled }} onPress={disabled ? undefined : onPress} style={{ flex: 1, minHeight: 48, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? accent : color.surface, borderWidth: 1, borderColor: on ? accent : '#2E2E36' }}>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: on ? color.onLime : disabled ? '#4A4A54' : '#C9C9C3', textDecorationLine: disabled ? 'line-through' : 'none' }}>{on ? '✓ ' : ''}{label}</RNText>
    </Pressable>
  );
}

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Icon } from '@bunk3d/ui/native';
import { REPORT_REASONS, useApi, type ReportReason, type ReportTargetKind } from '@bunk3d/api';

const KINDS: ReportTargetKind[] = ['post', 'comment', 'note', 'story', 'user', 'dm', 'event', 'club', 'meetup', 'invite', 'gig', 'listing'];

/**
 * X3 Report sheet. Root route presented as a modal: `/report?targetKind=post&targetId=abc`.
 * The person reported is never told who reported. The reporter can also block.
 */
export default function Report() {
  const api = useApi();
  const p = useLocalSearchParams<{ targetKind?: string; targetId?: string }>();
  const targetKind = (KINDS as string[]).includes(p.targetKind ?? '') ? (p.targetKind as ReportTargetKind) : 'post';
  const targetId = p.targetId ?? '';
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/tea'));
  const send = async () => {
    if (!reason || busy) return;
    setBusy(true); setFailed(false);
    try {
      await api.safety.report({ targetKind, targetId, reason, note: note.trim() || undefined, alsoBlock: block });
      setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const backLabel = targetKind === 'post' || targetKind === 'comment' || targetKind === 'story' ? 'Back to Tea' : 'Back';

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(5,5,6,0.62)', justifyContent: 'flex-end' }}>
      <Stack.Screen options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close report sheet" onPress={close} style={{ flex: 1 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: color.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: '#2E2E36', maxHeight: '92%' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#3A3A42', alignSelf: 'center', marginBottom: 14 }} />
          {!done ? (
            <View>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, letterSpacing: -0.6, color: color.ink }}>What’s wrong with it?</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted, marginTop: 4, marginBottom: 12 }}>They won’t know it was you.</RNText>
              <View accessibilityRole="radiogroup" accessibilityLabel="Report reason" style={{ gap: 6 }}>
                {REPORT_REASONS.map((r) => {
                  const on = reason === r.id;
                  return (
                    <Pressable key={r.id} accessibilityRole="radio" accessibilityLabel={r.label} accessibilityState={{ checked: on }} onPress={() => setReason(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: on ? color.lime : color.line, backgroundColor: on ? '#26262D' : 'transparent' }}>
                      <View aria-hidden style={{ width: 18, height: 18, borderRadius: 9, borderWidth: on ? 6 : 2, borderColor: on ? color.lime : '#4A4A54' }} />
                      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{r.label}</RNText>
                    </Pressable>
                  );
                })}
              </View>
              {reason === 'self_harm' ? (
                <View accessibilityRole="alert" style={{ marginTop: 10, backgroundColor: '#1A1626', borderWidth: 1, borderColor: color.violet, borderRadius: 14, padding: 12 }}>
                  <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 20, color: '#E4E4DE' }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', color: '#CDBEFF' }}>If you’re worried about someone — or yourself</RNText>, Tele-MANAS is free and 24×7: call <RNText style={{ fontFamily: 'Inter_800ExtraBold' }}>14416</RNText>. We’ll also flag this to our team right away.
                  </RNText>
                </View>
              ) : null}
              <TextInput accessibilityLabel="Add a note (optional)" placeholder="Add a note (optional)" placeholderTextColor={color.inkMuted} value={note} onChangeText={setNote} maxLength={300} style={{ marginTop: 10, height: 44, paddingHorizontal: 12, backgroundColor: color.bg, borderWidth: 1, borderColor: '#2E2E36', borderRadius: 12, color: color.ink, fontFamily: 'Inter_500Medium', fontSize: 14 }} />
              <Pressable accessibilityRole="checkbox" accessibilityLabel="Also block this user" accessibilityState={{ checked: block }} onPress={() => setBlock(!block)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginTop: 6 }}>
                <View aria-hidden style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: block ? color.lime : '#4A4A54', backgroundColor: block ? color.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {block ? <Icon name="check" size={14} color={color.onLime} stroke={3} /> : null}
                </View>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Also block this user</RNText>
              </Pressable>
              {failed ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error, marginTop: 6 }}>Couldn’t send that. Check your connection and try again.</RNText> : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Send report" accessibilityState={{ disabled: !reason || busy }} disabled={!reason || busy} onPress={send} style={{ marginTop: 8, minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: reason ? color.lime : '#2A2A31' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: reason ? color.onLime : '#6E6E78' }}>{busy ? 'Sending…' : 'Send report'}</RNText>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View aria-hidden style={{ width: 70, height: 70, borderRadius: 24, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
                <Icon name="check" size={34} color={color.onLime} stroke={3} />
              </View>
              <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, color: color.ink, marginTop: 16, marginBottom: 6, textAlign: 'center' }}>Got it. Thanks for looking out.</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 20, color: color.inkMuted, textAlign: 'center' }}>Campus Mods will review it. At 3 reports it’s hidden until they do. You’ll hear back in Notices.</RNText>
              <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={close} style={{ marginTop: 16, alignSelf: 'stretch', minHeight: 52, borderRadius: 16, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.onLime }}>{backLabel}</RNText>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

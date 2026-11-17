import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, Text as RNText, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, Icon, PrimaryCta, Screen, Spacer, StepHeader, StateCard, SkeletonList, ErrorState } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession } from '@bunk3d/api';
import { FieldLabel, OtpBoxes } from '@/features/onboarding/parts';

// A4 Verify campus: college email (instant) or student ID photo.
export default function Verify() {
  const api = useApi();
  const session = useSession();
  const campuses = useAsync(() => api.campuses.listLive(''), []);
  const campus = campuses.data?.find((c) => c.id === session?.campusId);
  const [mode, setMode] = useState<'email' | 'id'>('email');
  const [local, setLocal] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  // Set by staff review (backend phase); the mock never rejects.
  const idFailed = session?.verified === 'rejected';

  if (campuses.status === 'loading') return <Screen><StepHeader step={3} onBack={() => router.back()} /><SkeletonList rows={2} /></Screen>;
  if (campuses.status === 'error') return <Screen><StepHeader step={3} onBack={() => router.back()} /><ErrorState onRetry={campuses.reload} /></Screen>;

  const emailOk = campus?.verifyMethod === 'email';
  const sendCode = async () => { setBusy(true); await api.verification.sendEmailCode(local.trim()); setBusy(false); setSent(true); setCode(''); setWrong(false); };
  const verify = async () => {
    setBusy(true);
    const r = await api.verification.verifyEmailCode(code);
    setBusy(false);
    if (r.ok) router.push('/onboarding/profile'); else { setWrong(true); setCode(''); }
  };
  const snap = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const r = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled) { setPhoto(r.assets[0].uri); }
  };
  const submitId = async () => { setBusy(true); await api.verification.submitId(); setBusy(false); router.push('/onboarding/pending'); };

  return (
    <Screen>
      <StepHeader step={3} onBack={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: campus?.tint ?? color.lime, alignItems: 'center', justifyContent: 'center' }}>
          <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 11, color: color.onLime }}>{campus?.short ?? ''}</RNText>
        </View>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{campus?.name}</RNText>
      </View>
      <View style={{ marginTop: 16, marginBottom: 6 }}><H1>{'Prove you’re\na real student'}</H1></View>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: color.inkMuted, marginBottom: 18 }}>Takes 30 seconds with your college email.</RNText>
      <View style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: 16, padding: 4, gap: 4 }}>
        {(['email', 'id'] as const).map((m) => (
          <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => setMode(m)} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? color.lime : 'transparent' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: mode === m ? color.onLime : color.inkMuted }}>{m === 'email' ? 'College email' : 'Student ID'}</RNText>
          </Pressable>
        ))}
      </View>

      {mode === 'email' ? (
        emailOk ? (
          <>
            <View style={{ marginTop: 18 }}><FieldLabel>College email</FieldLabel></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 54, marginTop: 8, backgroundColor: color.surface, borderColor: color.lime, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 }}>
              <TextInput accessibilityLabel="College email name" value={local} onChangeText={(t) => { setLocal(t.replace(/@.*/, '').trim()); setSent(false); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="your.name" placeholderTextColor={color.inkMuted} style={{ flex: 1, color: color.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 15 }} />
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.inkMuted }}>@{campus?.emailDomain}</RNText>
            </View>
            {sent ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#123D2C', borderRadius: 12, padding: 12 }}>
                  <Icon name="check" size={16} color={color.success} />
                  <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.success }}>Code sent — check your inbox</RNText>
                </View>
                <View style={{ marginTop: 12 }}><OtpBoxes value={code} onChange={(v) => { setCode(v); setWrong(false); }} error={wrong} height={52} fontSize={20} radius={12} autoFocus /></View>
                {wrong ? <RNText accessibilityRole="alert" style={{ marginTop: 10, fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.error }}>Wrong code. Check your inbox and try again.</RNText> : null}
              </>
            ) : null}
            <Spacer />
            {sent ? <PrimaryCta label="Verify & continue" disabled={code.length !== 6} loading={busy} onPress={verify} /> : <PrimaryCta label="Send code" disabled={local.length < 2} loading={busy} onPress={sendCode} />}
          </>
        ) : (
          <>
            <View style={{ marginTop: 18 }}>
              <StateCard domain="ONBOARDING" kind="info" title="No college email here" body={`${campus?.name} verifies with a student ID photo.`} cta={{ label: 'Use Student ID', onPress: () => setMode('id') }} />
            </View>
            <Spacer />
          </>
        )
      ) : (
        <>
          {idFailed ? (
            <View style={{ marginTop: 18 }}>
              <StateCard domain="ONBOARDING" kind="err" title="ID didn’t pass" body="Blurry photo and the name didn’t match. Your profile is saved." cta={{ label: 'Retake photo', onPress: snap }} alt={{ label: 'College email', onPress: () => setMode('email') }} />
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Snap your student ID" onPress={snap} style={{ marginTop: 18, height: 200, borderWidth: 2, borderStyle: 'dashed', borderColor: '#4A4A54', borderRadius: 20, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={26} color={color.onLime} /></View>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{photo ? 'ID photo added. Tap to retake' : 'Snap your student ID'}</RNText>
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>Front side · name and college visible</RNText>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12 }}>
            <Icon name="lock" size={18} color={color.inkMuted} />
            <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: '#C9C9C3' }}>Only Bunk3d staff see it. Deleted 30 days after review. Usually checked within 24 hours.</RNText>
          </View>
          <Spacer />
          <PrimaryCta label="Submit ID" disabled={!photo} loading={busy} onPress={submitId} />
        </>
      )}
    </Screen>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, Icon, PrimaryCta, Screen, Spacer, StepHeader, StateCard } from '@bunk3d/ui/native';
import { useApi } from '@bunk3d/api';
import { FieldLabel, OtpBoxes, mmss, useCountdown } from '@/features/onboarding/parts';

// A2 Sign in + OTP. Also the returning-user "Welcome back" mode (?returning=1).
export default function SignIn() {
  const api = useApi();
  const returning = useLocalSearchParams<{ returning?: string }>().returning === '1';
  const [step, setStep] = useState<'start' | 'otp'>('start');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrongLeft, setWrongLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const left = useCountdown(24, sentAt);

  const digits = phone.replace(/\D/g, '');
  const pretty = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;

  const goIn = (r: Awaited<ReturnType<typeof api.auth.signInWithGoogle>>) => {
    if (r.ok) router.replace('/');
    else if (r.reason === 'locked') setLocked(r.retryInMinutes);
    else setWrongLeft(r.triesLeft);
  };
  const google = async () => { setBusy(true); goIn(await api.auth.signInWithGoogle({ returning })); setBusy(false); };
  const send = async () => { setBusy(true); await api.auth.sendOtp(digits); setBusy(false); setCode(''); setWrongLeft(null); setSentAt(Date.now()); setStep('otp'); };
  const verify = async () => { setBusy(true); const r = await api.auth.verifyOtp(digits, code, { returning }); setBusy(false); goIn(r); };
  const back = () => (step === 'otp' ? (setStep('start'), setWrongLeft(null), setLocked(null)) : router.back());

  return (
    <Screen>
      <StepHeader step={returning ? undefined : 1} label={returning ? 'WELCOME BACK' : undefined} progress={!returning} onBack={back} />
      {step === 'start' ? (
        <>
          <View style={{ marginTop: 34, marginBottom: 8 }}>{returning ? <H1 size={30}>{'Good to see\nyou again.'}</H1> : <H1 size={30}>{'Let’s get\nyou in.'}</H1>}</View>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21, color: color.inkMuted, marginBottom: 28 }}>Your number and email are never shown to anyone.</RNText>
          <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={busy} onPress={google} style={{ minHeight: 56, borderRadius: 16, backgroundColor: color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Icon name="google" color={color.bg} />
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.bg }}>Continue with Google</RNText>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#6E6E78' }}>OR USE YOUR NUMBER</RNText>
            <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
          </View>
          <FieldLabel>Mobile number</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ height: 56, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: color.surface, borderColor: '#2E2E36', borderWidth: 1, borderRadius: 14 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.ink }}>+91</RNText>
            </View>
            <TextInput
              accessibilityLabel="Mobile number"
              value={pretty}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              placeholder="98765 43210"
              placeholderTextColor="#6E6E78"
              style={{ flex: 1, height: 56, paddingHorizontal: 16, backgroundColor: color.surface, borderColor: color.lime, borderWidth: 1.5, borderRadius: 14, color: color.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 18, letterSpacing: 0.5 }}
            />
          </View>
          <Spacer />
          <PrimaryCta label="Send code" disabled={digits.length !== 10} loading={busy} onPress={send} />
        </>
      ) : locked !== null ? (
        <>
          <View style={{ marginTop: 34 }}>
            <StateCard
              domain="ONBOARDING" kind="err" title="Too many tries"
              body={`4 wrong codes. Try again in ${locked} minutes — or skip the SMS entirely.`}
              cta={{ label: 'Use Google', onPress: google }}
            />
          </View>
        </>
      ) : (
        <>
          <View style={{ marginTop: 34, marginBottom: 8 }}><H1 size={30}>{'Drop the\n6-digit code'}</H1></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: color.inkMuted }}>Sent to +91 {pretty} · </RNText>
            <Pressable accessibilityRole="button" accessibilityLabel="Change number" onPress={back} style={{ minHeight: 44, justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.lime }}>change</RNText>
            </Pressable>
          </View>
          <OtpBoxes value={code} onChange={(v) => { setCode(v); setWrongLeft(null); }} error={wrongLeft !== null} autoFocus />
          {wrongLeft !== null ? (
            <RNText accessibilityRole="alert" style={{ marginTop: 12, fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.error }}>
              Wrong code · {wrongLeft} {wrongLeft === 1 ? 'try' : 'tries'} left
            </RNText>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>Auto-reading SMS…</RNText>
            {left > 0 ? (
              <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: color.inkMuted }}>Resend in {mmss(left)}</RNText>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Resend code" onPress={send} style={{ minHeight: 44, justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>Resend code</RNText>
              </Pressable>
            )}
          </View>
          <Spacer />
          <PrimaryCta label="Verify" disabled={code.length !== 6} loading={busy} onPress={verify} />
        </>
      )}
    </Screen>
  );
}

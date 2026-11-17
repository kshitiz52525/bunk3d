import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text as RNText, TextInput, View } from 'react-native';
import { parseDob } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { H1, Icon, PrimaryCta, Screen, Spacer, StepHeader } from '@bunk3d/ui/native';
import { useApi } from '@bunk3d/api';
import { FieldLabel, Select } from '@/features/onboarding/parts';

const DEGREES = ['B.Tech', 'B.Sc', 'B.Com', 'BBA', 'BA', 'BCA', 'M.Tech', 'MBA', 'MCA'];
const DEPTS = ['CSE', 'ECE', 'EEE', 'Mech', 'Civil', 'AI & ML', 'IT', 'Other'];
const YEARS = ['1st', '2nd', '3rd', '4th', '5th'];

// A6 Profile basics, with the 18+ gate. Under 18: what was entered is deleted and "18+ for now" shows.
export default function Profile() {
  const api = useApi();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [check, setCheck] = useState<{ u: string; free: boolean } | null>(null);
  const free = check?.u === username ? check.free : null;
  const [degree, setDegree] = useState('');
  const [dept, setDept] = useState('');
  const [year, setYear] = useState('');
  const [dob, setDob] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [minor, setMinor] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    api.onboarding.getDraft().then((d) => {
      const p = d.profile;
      if (p.name) setName(p.name);
      if (p.username) setUsername(p.username);
      if (p.degree) setDegree(p.degree);
      if (p.dept) setDept(p.dept);
      if (p.year) setYear(p.year);
    });
  }, [api]);

  useEffect(() => {
    if (username.length < 3) return;
    const t = setTimeout(() => api.onboarding.isUsernameFree(username).then((f) => setCheck({ u: username, free: f })), 300);
    return () => clearTimeout(t);
  }, [api, username]);

  const maskDob = (t: string) => {
    const d = t.replace(/\D/g, '').slice(0, 8);
    const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
    return parts.join(' / ');
  };

  const ready = name.trim().length > 1 && username.length >= 3 && free === true && !!degree && !!dept && !!year && !!parseDob(dob);

  const next = async () => {
    setBusy(true);
    const r = await api.onboarding.saveProfile({ name: name.trim(), username, degree, dept, year, dob });
    setBusy(false);
    if (r.ok) router.push('/onboarding/interests');
    else if (r.reason === 'underage') { setName(''); setUsername(''); setDob(''); setDegree(''); setDept(''); setYear(''); setPhoto(null); setMinor(true); }
    else setInvalid(true);
  };
  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  if (minor) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
          <RNText style={{ backgroundColor: color.inkMuted, color: color.onLime, fontFamily: 'Inter_800ExtraBold', fontSize: 13, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, overflow: 'hidden', transform: [{ rotate: '-4deg' }] }}>18+ for now</RNText>
          <View style={{ marginTop: 18, marginBottom: 10 }}><H1 size={26}>Bunk3d is only for students 18 and over right now.</H1></View>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22, color: color.inkMuted }}>We’ve deleted what you entered. We’ll let you know if that changes — no hard feelings.</RNText>
        </View>
        <PrimaryCta label="Close" onPress={async () => { await api.auth.signOut(); router.replace('/welcome'); }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader step={4} onBack={() => router.back()} />
      <View style={{ marginTop: 30, marginBottom: 18 }}><H1>Who dis?</H1></View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add photo (optional)" onPress={pickPhoto} style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ rotate: '-4deg' }], boxShadow: `4px 4px 0 ${color.violet}` }}>
          {photo ? <Image source={{ uri: photo }} style={{ width: 96, height: 96 }} accessibilityIgnoresInvertColors /> : <Icon name="camera" size={32} color={color.onLime} />}
        </Pressable>
        <View style={{ flex: 1, gap: 10 }}>
          <TextInput accessibilityLabel="Full name" value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={color.inkMuted} textContentType="name" style={{ height: 52, paddingHorizontal: 14, backgroundColor: color.surface, borderColor: '#2E2E36', borderWidth: 1, borderRadius: 14, color: color.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 15 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 14, backgroundColor: color.surface, borderColor: free === false ? color.error : free ? color.success : '#2E2E36', borderWidth: 1, borderRadius: 14 }}>
            <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: color.inkMuted }}>@</RNText>
            <TextInput accessibilityLabel="Username" value={username} onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9._]/g, ''))} autoCapitalize="none" autoCorrect={false} placeholder="username" placeholderTextColor={color.inkMuted} style={{ flex: 1, minWidth: 0, color: color.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 15 }} />
            {free !== null ? <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: free ? color.success : color.error }}>{free ? 'free' : 'taken'}</RNText> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        <Select label="Degree" value={degree} options={DEGREES} onChange={setDegree} />
        <Select label="Dept" value={dept} options={DEPTS} onChange={setDept} />
        <Select label="Year" value={year} options={YEARS} onChange={setYear} />
      </View>
      <View style={{ marginTop: 18 }}><FieldLabel>Date of birth</FieldLabel></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 54, marginTop: 8, paddingHorizontal: 14, backgroundColor: color.surface, borderColor: '#2E2E36', borderWidth: 1, borderRadius: 14 }}>
        <TextInput accessibilityLabel="Date of birth, day month year" value={dob} onChangeText={(t) => { setDob(maskDob(t)); setInvalid(false); }} keyboardType="number-pad" placeholder="DD / MM / YYYY" placeholderTextColor={color.inkMuted} style={{ flex: 1, color: color.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 15 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="lock" size={14} color={color.violet} /><RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.violet }}>never shown</RNText></View>
      </View>
      {invalid ? <RNText accessibilityRole="alert" style={{ marginTop: 10, color: color.error, fontFamily: 'Inter_800ExtraBold', fontSize: 13 }}>Check your details and try again.</RNText> : null}
      <Spacer />
      <PrimaryCta label="Next" disabled={!ready} loading={busy} onPress={next} />
    </Screen>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text as RNText, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, Icon, PrimaryCta, Screen, Spacer, StepHeader, SkeletonList, ErrorState, TextLink } from '@bunk3d/ui/native';
import { useApi, useAsync, type Waitlist } from '@bunk3d/api';

// A3 Choose college (+ waitlist). The waitlist card is S1 "Your college isn't live yet".
export default function College() {
  const api = useApi();
  const [q, setQ] = useState('');
  const [wait, setWait] = useState<Waitlist | null>(null);
  const list = useAsync(() => api.campuses.listLive(q), [q]);

  const pick = async (id: string) => { await api.campuses.select(id); router.push('/verify'); };
  const request = async () => setWait(await api.campuses.requestWaitlist(q.trim() || 'My college'));

  if (wait) {
    return (
      <Screen>
        <StepHeader step={2} onBack={() => setWait(null)} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <RNText style={{ alignSelf: 'flex-start', backgroundColor: color.violet, color: color.onLime, fontFamily: 'Inter_800ExtraBold', fontSize: 13, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, overflow: 'hidden', transform: [{ rotate: '-4deg' }] }}>you’re on the list</RNText>
          <View style={{ marginTop: 18, marginBottom: 10 }}><H1 size={30}>We’ll ping you when your campus drops.</H1></View>
          <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22, color: color.inkMuted }}>Bunk3d opens one campus at a time. Get 25 classmates on the waitlist and you jump the queue.</RNText>
          <View style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.ink }}>{wait.college}</RNText>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>{wait.count} / {wait.target}</RNText>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: color.line, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (wait.count / wait.target) * 100)}%`, height: '100%', backgroundColor: color.lime }} />
            </View>
          </View>
        </View>
        <PrimaryCta label="Share invite link" onPress={() => Share.share({ message: 'Get Bunk3d to open at our campus. College happens outside class.' })} />
        <TextLink label="Back to list" onPress={() => setWait(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader step={2} onBack={() => router.back()} />
      <View style={{ marginTop: 30, marginBottom: 18 }}><H1>{'Where do you\nbunk class?'}</H1></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 14, backgroundColor: color.surface, borderColor: '#3A3A42', borderWidth: 1.5, borderRadius: 16 }}>
        <Icon name="search" color={color.inkMuted} />
        <TextInput accessibilityLabel="Search colleges" value={q} onChangeText={setQ} placeholder="Search your college" placeholderTextColor={color.inkMuted} style={{ flex: 1, color: color.ink, fontFamily: 'Inter_600SemiBold', fontSize: 15 }} />
      </View>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.4, color: color.inkMuted, marginTop: 18, marginBottom: 8 }}>LIVE ON BUNK3D</RNText>
      {list.status === 'loading' ? <SkeletonList rows={2} /> : null}
      {list.status === 'error' ? <ErrorState onRetry={list.reload} /> : null}
      {list.status === 'ready' ? (
        <View style={{ gap: 8 }}>
          {list.data.map((c) => (
            <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}, ${c.city}`} onPress={() => pick(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 68 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
                <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 13, color: color.onLime }}>{c.short}</RNText>
              </View>
              <View style={{ flex: 1 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{c.name}</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted }}>{c.city} · {c.verifyMethod === 'email' ? 'college email works' : 'ID upload'}</RNText>
              </View>
              <Icon name="chevronRight" color={color.inkMuted} />
            </Pressable>
          ))}
          {list.data.length === 0 ? (
            <RNText style={{ textAlign: 'center', color: color.inkMuted, fontFamily: 'Inter_500Medium', fontSize: 14, paddingVertical: 20 }}>No match. Bunk3d is live at 2 colleges for now.</RNText>
          ) : null}
        </View>
      ) : null}
      <Spacer />
      <Pressable accessibilityRole="button" accessibilityLabel="My college isn’t here" onPress={request} style={{ minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>My college isn’t here</RNText>
      </Pressable>
    </Screen>
  );
}

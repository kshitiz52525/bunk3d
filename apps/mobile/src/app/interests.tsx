import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, PrimaryCta, Screen, Spacer, StepHeader } from '@bunk3d/ui/native';
import { useApi } from '@bunk3d/api';

const INTERESTS = ['Coding', 'Design', 'Startups', 'Cricket', 'Football', 'Gaming', 'Music', 'Dance', 'Memes', 'Photography', 'Fitness', 'Anime', 'Debate', 'Films'];
const GOALS = ['Find notes', 'Make friends', 'Join clubs', 'Go to events', 'Hackathon teams', 'Just vibe'];

function Chips({ list, sel, max, on, rot, onToggle }: { list: string[]; sel: string[]; max: number; on: string; rot?: boolean; onToggle: (l: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {list.map((l, n) => {
        const picked = sel.includes(l);
        const full = !picked && sel.length >= max;
        return (
          <Pressable key={l} accessibilityRole="button" accessibilityLabel={l} accessibilityState={{ selected: picked, disabled: full }} onPress={() => onToggle(l)} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 999, justifyContent: 'center', backgroundColor: picked ? on : color.surface, borderWidth: 1, borderColor: picked ? on : '#2E2E36', opacity: full ? 0.5 : 1, transform: [{ rotate: `${picked && rot ? (n % 2 ? 2 : -2) : 0}deg` }] }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: picked ? color.onLime : '#E4E4DE' }}>{l}</RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

// A7 Interests and goals. 3 to 10 interests, 1 to 4 goals.
export default function Interests() {
  const api = useApi();
  const [i, setI] = useState<string[]>([]);
  const [g, setG] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.onboarding.getDraft().then((d) => { setI(d.interests); setG(d.goals); }); }, [api]);
  const toggle = (arr: string[], set: (v: string[]) => void, l: string, max: number) =>
    set(arr.includes(l) ? arr.filter((x) => x !== l) : arr.length < max ? [...arr, l] : arr);
  const ok = i.length >= 3 && g.length >= 1;
  const next = async () => { setBusy(true); await api.onboarding.saveInterests(i, g); setBusy(false); router.push('/clubs'); };
  return (
    <Screen>
      <StepHeader step={5} onBack={() => router.back()} />
      <View style={{ marginTop: 30, marginBottom: 14 }}><H1>What’s your vibe?</H1></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>Interests</RNText>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: i.length >= 3 ? color.success : color.warning }}>{i.length} picked · 3 to 10</RNText>
      </View>
      <Chips list={INTERESTS} sel={i} max={10} on={color.lime} rot onToggle={(l) => toggle(i, setI, l, 10)} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>I’m here to…</RNText>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: g.length >= 1 ? color.success : color.warning }}>{g.length} picked · 1 to 4</RNText>
      </View>
      <Chips list={GOALS} sel={g} max={4} on={color.violet} onToggle={(l) => toggle(g, setG, l, 4)} />
      <Spacer />
      <PrimaryCta label="Next" disabled={!ok} loading={busy} onPress={next} />
    </Screen>
  );
}

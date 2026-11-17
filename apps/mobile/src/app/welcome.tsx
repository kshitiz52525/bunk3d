import { router } from 'expo-router';
import { Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Icon, PrimaryCta, Spacer, TextLink } from '@bunk3d/ui/native';

// A1 Welcome. "Get started" opens sign-up; "I already have an account" opens the returning-user mode.
export default function Welcome() {
  const bullets = [
    { icon: 'check', bg: '#123D2C', fg: color.success, text: 'Only verified students from your college' },
    { icon: 'mask', bg: color.anonTile, fg: color.violet, text: 'Post with your name or anonymously' },
    { icon: 'eyeOff', bg: '#3A1626', fg: color.hot, text: 'Not run by your college. They can’t see you.' },
  ] as const;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg, overflow: 'hidden' }}>
      <View style={{ height: 380, overflow: 'visible' }} aria-hidden>
        <View style={{ position: 'absolute', left: -30, top: 40, width: 470, height: 64, backgroundColor: color.lime, transform: [{ rotate: '-8deg' }], justifyContent: 'center', overflow: 'hidden' }}>
          <RNText numberOfLines={1} style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.onLime, letterSpacing: -0.5 }}> skip the lecture · not the tea · skip the lecture · not the tea</RNText>
        </View>
        <View style={{ position: 'absolute', left: -30, top: 138, width: 470, height: 46, backgroundColor: color.violet, transform: [{ rotate: '5deg' }], justifyContent: 'center', overflow: 'hidden' }}>
          <RNText numberOfLines={1} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.onLime, letterSpacing: 2 }}>  NOTES · PYQS · EVENTS · CLUBS · DMS · NOTES · PYQS · EVENTS</RNText>
        </View>
        <View style={{ position: 'absolute', left: 34, top: 208, width: 210, backgroundColor: color.surface, borderColor: '#2E2E36', borderWidth: 1, borderRadius: 18, padding: 14, paddingVertical: 12, transform: [{ rotate: '-3deg' }], boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: color.anonTile, alignItems: 'center', justifyContent: 'center' }}><Icon name="mask" size={16} color={color.violet} /></View>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.anonInk }}>Anonymous</RNText>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: color.inkMuted }}>· 2m</RNText>
          </View>
          <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18, color: color.ink, marginTop: 8 }}>who else is in the library pretending to study</RNText>
        </View>
        <View style={{ position: 'absolute', right: 26, top: 256, backgroundColor: color.lime, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, transform: [{ rotate: '6deg' }] }}>
          <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, color: color.onLime }}>▲ 412</RNText>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.onLime }}>UPVOTES</RNText>
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 22, paddingBottom: 14 }}>
        <RNText accessibilityRole="header" accessibilityLabel="Bunk3d" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 64, lineHeight: 58, letterSpacing: -3, color: color.ink }}>
          bunk<RNText style={{ color: color.lime }}>3</RNText>d
        </RNText>
        <RNText style={{ marginTop: 12, fontFamily: 'Unbounded_800ExtraBold', fontSize: 22, lineHeight: 26, letterSpacing: -0.6, color: color.ink }}>College happens{'\n'}outside class.</RNText>
        <View style={{ gap: 10, marginTop: 20 }}>
          {bullets.map((b) => (
            <View key={b.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: b.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={b.icon} size={14} color={b.fg} /></View>
              <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.ink, flexShrink: 1 }}>{b.text}</RNText>
            </View>
          ))}
        </View>
        <Spacer />
        <PrimaryCta label="Get started" onPress={() => router.push('/sign-in')} />
        <TextLink label="I already have an account" onPress={() => router.push({ pathname: '/sign-in', params: { returning: '1' } })} />
      </View>
    </SafeAreaView>
  );
}

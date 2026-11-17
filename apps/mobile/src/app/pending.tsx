import { router } from 'expo-router';
import { Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, Icon, PrimaryCta, Screen, Spacer, StepHeader, TextLink } from '@bunk3d/ui/native';

// A5 Verification pending (ID path).
export default function Pending() {
  return (
    <Screen>
      <StepHeader step={3} warn onBack={() => router.back()} />
      <View style={{ height: 230, marginTop: 8 }} aria-hidden>
        <View style={{ position: 'absolute', left: 90, top: 20, width: 220, height: 130, borderRadius: 18, backgroundColor: color.surface, borderColor: '#2E2E36', borderWidth: 1, transform: [{ rotate: '-6deg' }], padding: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: color.line }} />
          <View style={{ position: 'absolute', left: 74, top: 16, width: 110, height: 8, borderRadius: 4, backgroundColor: '#3A3A42' }} />
          <View style={{ position: 'absolute', left: 74, top: 34, width: 80, height: 8, borderRadius: 4, backgroundColor: '#3A3A42' }} />
          <View style={{ position: 'absolute', left: 14, top: 92, width: 100, height: 8, borderRadius: 4, backgroundColor: '#3A3A42' }} />
        </View>
        <View style={{ position: 'absolute', left: 190, top: 108, width: 74, height: 74, borderRadius: 37, backgroundColor: color.warning, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clock" size={34} color={color.onLime} />
        </View>
        <RNText style={{ position: 'absolute', left: 32, top: 138, backgroundColor: color.violet, color: color.onLime, fontFamily: 'Inter_800ExtraBold', fontSize: 13, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, overflow: 'hidden', transform: [{ rotate: '-4deg' }] }}>under review</RNText>
      </View>
      <H1>{'We’re checking\nyour ID'}</H1>
      <RNText style={{ marginTop: 8, fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, color: color.inkMuted }}>Usually within 24 hours. Finish your profile while you wait.</RNText>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
        <View style={{ flex: 1, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, padding: 14, gap: 6 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.success }}>YOU CAN</RNText>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, lineHeight: 23, color: color.ink }}>{'Finish profile\nRead notices\nBrowse public events'}</RNText>
        </View>
        <View style={{ flex: 1, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, padding: 14, gap: 6 }}>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: color.warning }}>AFTER VERIFY</RNText>
          <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, lineHeight: 23, color: color.inkMuted }}>{'Post & comment\nVote\nDM people'}</RNText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: '#3D2E0D', borderRadius: 14, padding: 14 }}>
        <Icon name="alert" size={18} color="#FFD58A" />
        <RNText style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 19, color: '#FFD58A' }}>A yellow banner stays on top of the app until you’re verified.</RNText>
      </View>
      <Spacer />
      <PrimaryCta label="Finish my profile" onPress={() => router.push('/profile')} />
      <TextLink label="Use college email instead" onPress={() => router.back()} />
    </Screen>
  );
}

import { router } from 'expo-router';
import { View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, PrimaryCta, Screen, Spacer, Text } from '@bunk3d/ui/native';
import { useApi, useSession } from '@bunk3d/api';

// Placeholder until Tea (T1) is built in the next milestone.
export default function FeedPlaceholder() {
  const api = useApi();
  const s = useSession();
  return (
    <Screen>
      <View style={{ marginTop: 40, gap: 12 }}>
        <H1>{'You’re in.'}</H1>
        <Text variant="body" style={{ color: color.inkMuted }}>Tea (T1) arrives in the next milestone. Verification: {s?.verified}.</Text>
      </View>
      <Spacer />
      <PrimaryCta label="Sign out" onPress={async () => { await api.auth.signOut(); router.replace('/welcome'); }} />
    </Screen>
  );
}

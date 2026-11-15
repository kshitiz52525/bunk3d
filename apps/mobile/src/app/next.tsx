import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text } from '@bunk3d/ui/native';
import { color, space } from '@bunk3d/ui';

// Proves real stack navigation: Back returns to whichever screen pushed this one.
export default function Next() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg, padding: space[4], gap: space[4] }}>
      <Text variant="section">Second screen</Text>
      <Button label="Back" kind="secondary" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

import { router } from 'expo-router';
import { View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, IconButton, Screen, Text } from '@bunk3d/ui/native';

/** Temporary stand-in for a screen that is not built yet. Replace the file, do not edit this. */
export function ComingSoon({ title, back = true }: { title: string; back?: boolean }) {
  return (
    <Screen>
      {back ? <View style={{ marginTop: 4 }}><IconButton icon="back" label="Back" onPress={() => router.back()} /></View> : null}
      <View style={{ marginTop: 24, gap: 8 }}>
        <H1>{title}</H1>
        <Text variant="body" style={{ color: color.inkMuted }}>This screen is being built.</Text>
      </View>
    </Screen>
  );
}

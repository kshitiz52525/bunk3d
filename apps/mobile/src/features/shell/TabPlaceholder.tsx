import { ScrollView, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { H1, Text, useChrome, useHeaderSpace, useTabBarSpace } from '@bunk3d/ui/native';

/** Temporary tab body. Shows how a tab screen pads for the floating header and tab bar and feeds scroll chrome. */
export function TabPlaceholder({ title }: { title: string }) {
  const { onScroll } = useChrome();
  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: useHeaderSpace(), paddingBottom: useTabBarSpace(), paddingHorizontal: 16 }} style={{ backgroundColor: color.bg }}>
      <View style={{ gap: 8 }}>
        <H1>{title}</H1>
        <Text variant="body" style={{ color: color.inkMuted }}>This tab is being built.</Text>
      </View>
    </ScrollView>
  );
}

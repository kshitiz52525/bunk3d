import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Card, Chip, Input, Skeleton, Sticker, Text, Wordmark } from '@bunk3d/ui/native';
import { color, space } from '@bunk3d/ui';

// Dev-only gallery for the M0 primitives. Replaced by A1 Welcome in M2.
export default function Gallery() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <Wordmark size={32} />
        <Text variant="title">College happens outside class.</Text>
        <Text variant="lead" style={{ color: color.inkMuted }}>Verified students only.</Text>
        <Banner kind="pending" text="Verification pending" />
        <Banner kind="offline" text="You’re offline" />
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Chip label="All" selected />
          <Chip label="Academics" />
          <Chip label="Placements" />
        </View>
        <Card>
          <Text variant="section">Card</Text>
          <Text variant="body" style={{ color: color.inkMuted }}>Surface, 20px radius, line border.</Text>
          <View style={{ height: space[3] }} />
          <Skeleton height={14} width="60%" />
        </Card>
        <Sticker label="college happens outside class" />
        <Input label="Phone number" placeholder="Phone number" />
        <Button label="Next screen" sticker onPress={() => router.push('/next')} />
        <Button label="Secondary" kind="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

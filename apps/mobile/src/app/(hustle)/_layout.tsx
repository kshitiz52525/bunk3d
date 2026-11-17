import { Redirect, Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ChromeProvider, TabBar, type TabItem } from '@bunk3d/ui/native';
import { useSession } from '@bunk3d/api';
import { HustleHeader } from '@/features/shell/HustleHeader';

const ITEMS: TabItem[] = [
  { key: 'gigs', label: 'Gigs', icon: 'briefcase' },
  { key: 'my-work', label: 'My Work', icon: 'clipboard' },
  { key: 'swap', label: 'Swap', icon: 'swap' },
  { key: 'bag', label: 'My Bag', icon: 'bag' },
];

// The Hustle: hidden until the campus reaches wave 3 (no swipe, no tabs, nothing).
export default function HustleLayout() {
  const session = useSession();
  if (!session || session.wave < 3) return <Redirect href="/" />;
  return (
    <ChromeProvider>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <Tabs
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
          tabBar={(p) => <TabBar items={ITEMS} accent={color.violet} active={p.state.routes[p.state.index].name} onSelect={(k) => router.navigate(`/${k}` as never)} />}
        >
          {ITEMS.map((t) => <Tabs.Screen key={t.key} name={t.key} />)}
        </Tabs>
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <SafeAreaView edges={['top']} pointerEvents="box-none"><HustleHeader title="The Hustle" /></SafeAreaView>
        </View>
      </View>
    </ChromeProvider>
  );
}

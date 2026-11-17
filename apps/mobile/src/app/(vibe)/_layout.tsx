import { Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ChromeProvider, TabBar, type TabItem } from '@bunk3d/ui/native';
import { VibeHeader } from '@/features/shell/VibeHeader';

const ITEMS: TabItem[] = [
  { key: 'tea', label: 'Tea', icon: 'cup' },
  { key: 'study', label: 'Study', icon: 'book' },
  { key: 'poppin', label: 'Poppin’', icon: 'ticket' },
  { key: 'crew', label: 'Crew', icon: 'users' },
  { key: 'discover', label: 'Discover', icon: 'compass' },
];

// The Vibe: five tabs, one shared header. Detail screens are pushed on the root stack so Back returns here.
export default function VibeLayout() {
  return (
    <ChromeProvider>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <Tabs
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
          tabBar={(p) => (
            <TabBar items={ITEMS} active={p.state.routes[p.state.index].name.replace('/index', '')} onSelect={(k) => router.navigate(`/${k}` as never)} />
          )}
        >
          {ITEMS.map((t) => <Tabs.Screen key={t.key} name={t.key} />)}
        </Tabs>
        <VibeHeaderOverlay />
      </View>
    </ChromeProvider>
  );
}

/** The header floats above the tab content; screens pad their top by `useHeaderSpace()`. */
function VibeHeaderOverlay() {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <SafeAreaView edges={['top']} pointerEvents="box-none"><VibeHeader /></SafeAreaView>
    </View>
  );
}

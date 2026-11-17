import { ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color } from '@bunk3d/ui';
import { useApi, useAsync } from '@bunk3d/api';
import { AsyncBody, Avatar, Btn, TopBar } from '@/features/you/ui';

/** Blocked users (from Settings). Blocked people never see you. */
export default function Blocked() {
  const api = useApi();
  const s = useAsync(() => api.safety.blockedUsers(), []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        <TopBar title="Blocked users" />
        <View style={{ marginTop: 12, gap: 8 }}>
          <AsyncBody state={s} empty={{ when: (d) => d.length === 0, title: 'No one blocked.', body: 'People you block can’t see you or message you.', action: { label: 'Back to settings', onPress: () => router.back() } }}>
            {(list) => list.map((u) => (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: 12 }}>
                <Avatar initials={u.initials} tint="#33333B" />
                <RNText style={{ flex: 1, fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{u.name}</RNText>
                <Btn label="Unblock" kind="ghost" small onPress={async () => { await api.safety.unblockUser(u.id); s.reload(); }} />
              </View>
            ))}
          </AsyncBody>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

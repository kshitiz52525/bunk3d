import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, SkeletonList, StateCard } from '@bunk3d/ui/native';
import { useApi, useAsync, type PersonHit } from '@bunk3d/api';
import { Avatar, F, T } from '../crew/parts';

/** Pick who to message or share a photo with. Strangers are allowed: the first message becomes a request. */
export function RecipientPicker({ onPick, cta }: { onPick: (p: PersonHit) => Promise<'limit' | void>; cta: string }) {
  const api = useApi();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const people = useAsync(() => api.dm.searchPeople(q), [q]);
  const quota = useAsync(() => api.dm.requestQuota(), [limit]);

  async function pick(p: PersonHit) {
    setBusy(p.userId);
    try {
      if ((await onPick(p)) === 'limit') setLimit(true);
    } finally { setBusy(null); }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 8 }}>
        <TextInput accessibilityLabel="Search people" value={q} onChangeText={setQ} placeholder="Search by name" placeholderTextColor={color.inkMuted} autoCorrect={false} style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, color: color.ink, fontFamily: F.body, fontSize: 15 }} />
        {quota.status === 'ready' ? <T size={12} c={color.inkMuted}>{`${quota.data.remaining} of ${quota.data.limit} new requests left today. People you share a club with don’t count.`}</T> : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 6 }}>
        {limit && quota.status === 'ready' ? (
          <StateCard domain="DMS" kind="wait" title="Request limit hit" body={`${quota.data.limit} new DM requests a day. Resets at midnight. Existing chats work as normal.`} cta={{ label: 'OK', onPress: () => setLimit(false) }} />
        ) : null}
        {people.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {people.status === 'error' ? <ErrorState onRetry={people.reload} /> : null}
        {people.status === 'ready' && people.data.length === 0 ? <EmptyState title="No one found." body="Try another name." action={{ label: 'Clear search', onPress: () => setQ('') }} /> : null}
        {people.status === 'ready' ? people.data.map((p) => (
          <Pressable key={p.userId} accessibilityRole="button" accessibilityLabel={`${cta} ${p.name}${p.sharesClub ? '' : ', sends a message request'}`} accessibilityState={{ busy: busy === p.userId }} onPress={() => pick(p)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: busy === p.userId ? 0.6 : 1 }}>
            <Avatar initials={p.initials} tint={p.tint} size={44} />
            <View style={{ flex: 1 }}>
              <T size={15} f="bold">{p.name}</T>
              <T size={12} c={color.inkMuted}>{p.sharesClub ? 'Shares a club with you' : 'No shared club · goes as a request'}</T>
            </View>
          </Pressable>
        )) : null}
      </ScrollView>
    </View>
  );
}

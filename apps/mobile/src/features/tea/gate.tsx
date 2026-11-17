import { useState } from 'react';
import { Text, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { StateCard } from '@bunk3d/ui/native';
import { useApi, useAsync, useSession } from '@bunk3d/api';
import { goPending, untilText, useNow } from './util';

/** The caller's own Tea standing: verification, mute, karma (private) and the anon gate. */
export function useMyTea() {
  const api = useApi();
  const session = useSession();
  const status = useAsync(() => api.tea.myStatus(), [session?.verified]);
  const me = useAsync(() => api.you.me(), []);
  const now = useNow();
  const verified = session?.verified === 'verified';
  const mutedUntil = status.data?.mutedUntil ?? null;
  return {
    status: status.data, me: me.data, verified, mutedUntil, reload: status.reload,
    muted: mutedUntil !== null && mutedUntil > now,
    first: me.data?.name.split(' ')[0] ?? 'you',
  };
}

export function MutedCard({ until, onAppeal }: { until: number; onAppeal?: () => void }) {
  const [why, setWhy] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <StateCard domain="TEA" kind="err" title="Muted for 24 hours" body={`Strike 2 of 4. You can read and DM but can’t post or comment till ${untilText(until)}.`}
        cta={{ label: 'See why', onPress: () => setWhy((w) => !w) }} alt={onAppeal ? { label: 'Appeal', onPress: onAppeal } : undefined} />
      {why ? <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: color.inkMuted }}>Two of your posts were removed in the last 90 days. A second strike mutes you for 24 hours. Strikes expire after 90 days.</Text> : null}
    </View>
  );
}

export function PendingCard() {
  return (
    <View>
      <StateCard domain="TEA" kind="wait" title="Verification pending" body="You can read Tea, notices and public events. Posting, votes and DMs unlock when you’re verified." cta={{ label: 'Check status', onPress: goPending }} />
    </View>
  );
}

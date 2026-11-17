import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { router } from 'expo-router';
import { useApi, useAsync } from '@bunk3d/api';
import { AsyncView, Box, Cap, Display, Page, T, VIOLET, f } from '@/features/hustle/kit';

/** P4 Hustle portfolio. Earnings are never shown here. */
export default function PortfolioScreen() {
  const api = useApi();
  const pf = useAsync(() => api.hustle.getPortfolio(), []);
  return (
    <Page title="Hustle portfolio" right={<Pressable accessibilityRole="button" accessibilityLabel="Vibe profile" onPress={() => router.push('/me')} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><T size={13} weight="bold" c={VIOLET}>Vibe profile ›</T></Pressable>}>
      <AsyncView state={pf} skeletonRows={3}>
        {(p) => (
          <>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ fontFamily: f.display, fontSize: 20, color: color.onLime }}>{p.initials}</RNText></View>
              <View style={{ flex: 1 }}>
                <T size={18} weight="bold">{p.name}</T>
                <T size={12} c={color.inkMuted}>{p.line}</T>
                <T size={12} weight="bold" c={color.success}>{p.verified ? 'Verified student' : 'Verification pending'}{p.payoutDone ? ' · payout set up' : ''}</T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Box style={{ flex: 1 }}><Display size={20}>{p.gigsApproved}</Display><T size={11} c={color.inkMuted}>gigs approved</T></Box>
              <Box style={{ flex: 1 }}><Display size={20}>{p.payerRating === null ? '—' : p.payerRating}</Display><T size={11} c={color.inkMuted}>{p.payerRating === null ? 'no ratings yet' : 'payer rating'}</T></Box>
              <Box style={{ flex: 1 }}><Display size={20}>{p.onTimePct === null ? '—' : `${p.onTimePct}%`}</Display><T size={11} c={color.inkMuted}>{p.onTimePct === null ? 'on time, soon' : 'on time'}</T></Box>
            </View>
            <Cap>Skills</Cap>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {p.skills.map((s) => <View key={s.name} style={{ borderWidth: 1, borderColor: s.verified ? VIOLET : '#2E2E36', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}><T size={13} weight="semi" c={s.verified ? color.anonInk : '#C9C9C3'}>{s.verified ? '✓ ' : ''}{s.name}</T></View>)}
            </View>
            <Cap>Verified work · from approved gigs</Cap>
            {p.work.length === 0 ? <T size={13} c={color.inkMuted}>Approved gigs show up here.</T> : p.work.map((w) => <Box key={w.id}><T size={11} weight="bold" c={color.success}>✓ {w.by}</T><T size={14} weight="bold">{w.title}</T></Box>)}
            <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}><T size={14} weight="bold">Public link</T><T size={12} c={color.inkMuted}>{p.publicLink ? `${p.publicUrl} · anyone with the link` : 'Off · only payers you apply to can see this'}</T></View>
              <Pressable accessibilityRole="switch" accessibilityLabel="Public portfolio link" accessibilityState={{ checked: p.publicLink }} onPress={async () => { await api.hustle.setPortfolioPublic(!p.publicLink); pf.reload(); }}
                style={{ width: 52, height: 44, justifyContent: 'center' }}>
                <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: p.publicLink ? VIOLET : '#2E2E36', justifyContent: 'center' }}><View style={{ width: 20, height: 20, borderRadius: 10, marginLeft: p.publicLink ? 28 : 4, backgroundColor: p.publicLink ? color.onLime : '#9A9AA5' }} /></View>
              </Pressable>
            </Box>
            <T size={12} c={color.inkMuted}>Earnings are never shown here. Anon posts are never linked to your portfolio.</T>
          </>
        )}
      </AsyncView>
    </Page>
  );
}

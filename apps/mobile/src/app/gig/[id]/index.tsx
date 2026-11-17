import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { useApi, useAsync } from '@bunk3d/api';
import { AsyncView, Box, Btn, Cap, Page, Pill, Row, SampleTag, T, TakeHomeCard, VIOLET, fmtWeekday } from '@/features/hustle/kit';

export default function GigDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const gig = useAsync(() => api.hustle.getGig(id), [id]);
  const [saved, setSaved] = useState<boolean | null>(null);
  const g = gig.status === 'ready' ? gig.data : null;
  const isSaved = saved ?? g?.saved ?? false;
  const toggle = async () => setSaved(await api.hustle.toggleSaveGig(id));
  const slots = g ? (g.slotsLeft === null ? 'Apply' : `Apply · ${g.slotsLeft} ${g.slotsLeft === 1 ? 'slot' : 'slots'} left`) : 'Apply';
  return (
    <Page
      title="Gig" sub={g ? `${g.payerName} · ${g.payerLabel}` : ''}
      right={g ? <Pressable accessibilityRole="button" accessibilityLabel={isSaved ? 'Saved. Tap to remove' : 'Save gig'} onPress={toggle} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: color.surfaceRaised, justifyContent: 'center' }}><T size={13} weight="bold" c={isSaved ? VIOLET : color.ink}>{isSaved ? 'Saved' : '+ Save'}</T></Pressable> : undefined}
      footer={g ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Ask" kind="ghost" onPress={() => router.push('/dms')} style={{ flex: 1 }} />
          {g.applicationId
            ? <Btn label="Applied. See My Work" kind="ghost" onPress={() => router.navigate('/my-work')} style={{ flex: 2.4 }} />
            : <Btn label={g.slotsLeft === 0 ? 'No slots left' : slots} kind="violet" disabled={g.slotsLeft === 0} onPress={() => router.push(`/gig/${id}/apply`)} style={{ flex: 2.4 }} />}
        </View>
      ) : undefined}
    >
      <AsyncView state={gig}>
        {(d) => (
          <>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {d.sponsored ? <Pill label="SPONSORED" bg={color.warning} /> : null}
              {d.payerVerified ? <Pill label="VERIFIED PAYER" bg={color.success} /> : null}
              {d.seed ? <SampleTag /> : null}
            </View>
            <T size={22} weight="bold" style={{ lineHeight: 28 }}>{d.title}</T>
            <TakeHomeCard th={d.takeHome} payUnit={d.payUnit} />
            <T size={12} c={color.inkMuted}>Your fee is locked when you apply and never goes above ₹1,000 a gig. 18% GST is added on the fee, never on your pay. {d.payerName} pays its own fee on top.</T>
            <Pressable accessibilityRole="link" accessibilityLabel="How fees work" onPress={() => router.push('/fees')} style={{ minHeight: 44, justifyContent: 'center' }}><T size={13} weight="bold" c={VIOLET}>How fees work ›</T></Pressable>
            <Box>
              <T size={13} c={color.inkMuted}>You deliver</T>
              {d.deliverables.map((x) => <T key={x} size={14} weight="semi" style={{ marginTop: 4 }}>• {x}</T>)}
              <View style={{ height: 1, backgroundColor: color.line, marginVertical: 10 }} />
              {d.deadlineAtMs ? <Row k="Deadline" v={fmtWeekday(d.deadlineAtMs)} /> : null}
              <Row k="Paid when" v={d.paidWhen} />
            </Box>
            {d.trust.length > 0 ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {d.trust.slice(0, 3).map((t) => (
                  <View key={t.label} style={{ flex: 1, backgroundColor: color.surface, borderRadius: 16, padding: 10, gap: 2, borderWidth: 1, borderColor: color.line, borderStyle: t.basis === 'claimed' ? 'dashed' : 'solid' }}>
                    <Cap c={t.basis === 'verified' ? color.success : color.inkMuted}>{t.basis}</Cap>
                    <T size={16} weight="bold">{t.value}</T>
                    <T size={11} c={color.inkMuted}>{t.label}</T>
                  </View>
                ))}
              </View>
            ) : null}
            {d.scopeNote ? <T size={12} c={color.inkMuted}>Note for this gig: {d.scopeNote}</T> : null}
            <T size={13} c={color.inkMuted}>Never pay to apply. Report anyone asking for a deposit.{' '}
              </T>
            <Btn label="Report this gig" kind="ghost" onPress={() => router.push(`/report?targetKind=gig&targetId=${d.id}`)} />
            {d.seed ? <T size={12} c={color.inkMuted}>Sample gig for development. Amounts are made up and not a real opportunity.</T> : null}
          </>
        )}
      </AsyncView>
    </Page>
  );
}

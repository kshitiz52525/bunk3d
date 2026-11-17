import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { formatPaise } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { HustleError, useApi, useAsync, type Availability } from '@bunk3d/api';
import { AsyncView, Btn, Cap, Page, Pill, T, VIOLET, f, pct } from '@/features/hustle/kit';

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const prev = useAsync(() => api.hustle.previewApplication(id), [id]);
  const [pitch, setPitch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [avail, setAvail] = useState<Availability>('yes');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ days: number | null } | null>(null);
  const ok = agree && pitch.trim().length > 10;

  if (done && prev.status === 'ready') {
    const p = prev.data;
    return (
      <Page title="Apply" sub={`${p.gigTitle} · ${formatPaise(p.payPaise)}`}>
        <View style={{ gap: 12, paddingTop: 30 }}>
          <Pill label="APPLIED" bg={VIOLET} />
          <T size={26} weight="bold">Shot sent.</T>
          <T size={14} c="#C9C9C3">{p.payerName}{done.days ? ` usually replies in ${done.days} days` : ' will reply here'}. If you’re picked, it moves to My Work. Applying never costs anything.</T>
          <Btn label="Go to My Work" kind="violet" onPress={() => router.replace('/my-work')} />
        </View>
      </Page>
    );
  }

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr(null);
    try {
      const a = await api.hustle.applyToGig({ gigId: id, pitch: pitch.trim(), portfolioIds: picked, availability: avail, scopeAccepted: agree });
      setDone({ days: a.replyDays });
    } catch (e) {
      setErr(e instanceof HustleError ? e.message : 'That didn’t send. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <Page title="Apply" sub={prev.status === 'ready' ? `${prev.data.gigTitle} · ${formatPaise(prev.data.payPaise)}` : ''}
      footer={<><Btn label="Send application" kind="violet" disabled={!ok} busy={busy} onPress={submit} />{err ? <T size={13} c={color.error}>{err}</T> : null}</>}>
      <AsyncView state={prev} skeletonRows={3}>
        {(p) => {
          const th = p.takeHome;
          const unit = p.payUnit ? ` per ${p.payUnit}` : '';
          return (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Cap>Why you</Cap><Cap>{pitch.length}/280</Cap></View>
              <TextInput accessibilityLabel="Your pitch" value={pitch} onChangeText={setPitch} maxLength={280} multiline placeholder="Tell them what you can do." placeholderTextColor={color.inkMuted}
                style={{ minHeight: 100, textAlignVertical: 'top', backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12, color: color.ink, fontFamily: f.reg, fontSize: 14 }} />
              <Cap>Attach from portfolio</Cap>
              <View style={{ gap: 8 }}>
                {p.attachable.map((a) => {
                  const on = picked.includes(a.id);
                  return (
                    <Pressable key={a.id} accessibilityRole="checkbox" accessibilityLabel={`${a.label}, ${a.tag}`} accessibilityState={{ checked: on }} onPress={() => setPicked(on ? picked.filter((x) => x !== a.id) : [...picked, a.id])}
                      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: on ? VIOLET : color.line, backgroundColor: on ? color.anonTile : color.surface }}>
                      <Pill label={a.tag} bg={color.line} fg="#C9C9C3" /><T size={14} weight="semi" style={{ flex: 1 }}>{a.label}{a.verified ? ' ✓' : ''}</T>
                    </Pressable>
                  );
                })}
              </View>
              {p.availabilityQuestion ? (
                <>
                  <Cap>{p.availabilityQuestion}</Cap>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([['yes', 'Yes, all day'], ['part', 'Part of it']] as const).map(([k, l]) => (
                      <Pressable key={k} accessibilityRole="button" accessibilityLabel={l} accessibilityState={{ selected: avail === k }} onPress={() => setAvail(k)}
                        style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: avail === k ? VIOLET : 'transparent', borderWidth: 1, borderColor: avail === k ? VIOLET : '#2E2E36' }}>
                        <T size={13} weight="bold" c={avail === k ? color.onLime : color.ink}>{l}</T>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              <Pressable accessibilityRole="checkbox" accessibilityLabel="I have read the scope and accept the pay" accessibilityState={{ checked: agree }} onPress={() => setAgree(!agree)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: agree ? VIOLET : '#4A4A54', backgroundColor: agree ? VIOLET : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>{agree ? <T size={14} weight="bold" c={color.onLime}>✓</T> : null}</View>
                <T size={13} c="#C9C9C3" style={{ flex: 1 }}>
                  I’ve read the scope. Pay is {formatPaise(p.payPaise)}{p.payUnit ? ` per ${p.payUnit}` : ' fixed'}. My {pct(th.feeRateBp)} Bunk3d fee ({formatPaise(th.feePaise)}, plus {formatPaise(th.gstPaise)} GST on it) is locked now, so I take home {formatPaise(th.takeHomePaise)}{unit} after {p.payerName} approves my proof. {p.scopeText}.
                </T>
              </Pressable>
              <T size={12} c={color.inkMuted}>No work starts until you accept. Applying is free.</T>
            </>
          );
        }}
      </AsyncView>
    </Page>
  );
}

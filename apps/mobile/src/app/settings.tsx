import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { ErrorState, SkeletonList } from '@bunk3d/ui/native';
import { useApi, useAsync, type NotificationPrefs } from '@bunk3d/api';
import { Btn, SectionLabel, Switch, TopBar } from '@/features/you/ui';

const TOGGLES: { key: keyof NotificationPrefs; label: string; sub?: (q: string) => string }[] = [
  { key: 'replies', label: 'Replies to my posts' },
  { key: 'dms', label: 'DMs & requests' },
  { key: 'notices', label: 'Notices from accounts I follow' },
  { key: 'events', label: 'Event reminders', sub: () => '24 h and 1 h before' },
  { key: 'quietHours', label: 'Quiet hours', sub: (q) => `${q} · safety alerts still come through` },
  { key: 'readReceipts', label: 'Read receipts in DMs', sub: () => 'Off means you can’t see theirs either' },
];

function clock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

function Row({ label, value, onPress, disabled }: { label: string; value?: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={`${label}${value ? ', ' + value : ''}`} accessibilityState={{ disabled: !onPress || disabled }} onPress={onPress} disabled={!onPress || disabled} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#222228' }}>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: disabled ? color.inkMuted : color.ink }}>{label}</RNText>
      {value ? <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.inkMuted }}>{value}</RNText> : null}
    </Pressable>
  );
}

/** P3 Settings: notifications, privacy and safety, your data, sign out. */
export default function Settings() {
  const api = useApi();
  const s = useAsync(() => api.you.settings(), []);
  const blocked = useAsync(() => api.safety.blockedUsers(), []);
  const [override, setOverride] = useState<NotificationPrefs | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletionAt, setDeletionAt] = useState<number | null | undefined>(undefined);
  const [err, setErr] = useState(false);
  const d = s.data;
  const prefs = override ?? d?.notifications;

  const flip = async (key: keyof NotificationPrefs, v: boolean) => {
    if (!prefs) return;
    setErr(false);
    setOverride({ ...prefs, [key]: v });
    try { setOverride((await api.you.updateSettings({ notifications: { [key]: v } })).notifications); } catch { setOverride(prefs); setErr(true); }
  };
  const signOut = async () => { await api.auth.signOut(); router.replace('/welcome'); };
  const del = async () => { try { setDeletionAt((await api.you.requestAccountDeletion()).deletionAt); setConfirmDelete(false); } catch { setErr(true); } };
  const undo = async () => { try { setDeletionAt((await api.you.cancelAccountDeletion()).deletionAt); } catch { setErr(true); } };
  const pending = deletionAt === undefined ? d?.deletionAt ?? null : deletionAt;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
        <TopBar title="Settings" />
        {s.status === 'loading' ? <SkeletonList rows={4} /> : null}
        {s.status === 'error' ? <ErrorState onRetry={s.reload} /> : null}
        {d && prefs ? (
          <View>
            <SectionLabel>NOTIFICATIONS</SectionLabel>
            <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line }}>
              {TOGGLES.map((t) => (
                <View key={t.key} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#222228' }}>
                  <View style={{ flex: 1 }}>
                    <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{t.label}</RNText>
                    {t.sub ? <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted, marginTop: 2 }}>{t.sub(`${clock(d.quietStart)} – ${clock(d.quietEnd)}`)}</RNText> : null}
                  </View>
                  <Switch on={prefs[t.key]} label={t.label} onChange={(v) => flip(t.key, v)} />
                </View>
              ))}
            </View>
            {err ? <RNText accessibilityRole="alert" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: color.error, marginTop: 8 }}>Couldn’t save that. Try again.</RNText> : null}

            <SectionLabel>PRIVACY & SAFETY</SectionLabel>
            <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line }}>
              <Row label="Blocked users" value={blocked.data ? `${blocked.data.length} ›` : ''} onPress={() => router.push('/blocked')} />
              <Row label="Community guidelines" value="Soon" disabled />
              <Row label="Privacy policy" value="Soon" disabled />
            </View>

            <SectionLabel>YOUR DATA</SectionLabel>
            <View style={{ backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.line }}>
              <Row label="Download my data" value="Soon" disabled />
              <Row label="Grievance officer" value="Soon" disabled />
              <Row label="Delete account" value="30-day grace" onPress={() => setConfirmDelete(true)} disabled={pending !== null} />
            </View>
            {pending !== null ? (
              <View accessibilityRole="alert" style={{ marginTop: 10, backgroundColor: '#3D2E0D', borderRadius: 12, padding: 12, gap: 8 }}>
                <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFD58A' }}>Your account is scheduled for deletion on {new Date(pending).toDateString()}. Sign in before then to keep it.</RNText>
                <Btn label="Undo deletion" kind="light" small onPress={undo} />
              </View>
            ) : null}
            {confirmDelete ? (
              <View accessibilityRole="alert" style={{ marginTop: 10, backgroundColor: color.surface, borderRadius: 16, borderWidth: 1, borderColor: color.error, padding: 14, gap: 10 }}>
                <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>Delete your account?</RNText>
                <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#C9C9C3' }}>It stays recoverable for 30 days. After that it’s gone for good.</RNText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="Keep my account" kind="ghost" small onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
                  <Btn label="Delete" kind="hot" small onPress={del} style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: 22 }}><Btn label="Sign out" kind="ghost" onPress={signOut} /></View>
            <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted, textAlign: 'center', marginTop: 18 }}>bunk3d v0.1 · not run by your college</RNText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

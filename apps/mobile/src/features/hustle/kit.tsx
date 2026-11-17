import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPaise, type TakeHome } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { ErrorState, IconButton, OfflineBanner, SkeletonList, type StateKind } from '@bunk3d/ui/native';
import type { AsyncState } from '@bunk3d/api';

export const VIOLET = color.violet;
export const f = { display: 'Unbounded_800ExtraBold', bold: 'Inter_800ExtraBold', semi: 'Inter_600SemiBold', reg: 'Inter_500Medium' } as const;
export const SOFT = '#C9C9C3';

// ---- dates (display only; the API supplies every timestamp) ----
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (ms: number) => `${new Date(ms).getDate()} ${MO[new Date(ms).getMonth()]}`;
export const fmtWeekday = (ms: number) => `${WD[new Date(ms).getDay()]} ${fmtDay(ms)}`;
export function fmtLeft(ms: number, nowMs = Date.now()) {
  const d = ms - nowMs;
  if (d <= 0) return 'now';
  const h = Math.ceil(d / 3_600_000);
  return h < 48 ? `${h}h` : `${Math.round(d / 86_400_000)} days`;
}
export function fmtAgo(ms: number, nowMs = Date.now()) {
  const m = Math.max(0, Math.round((nowMs - ms) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
export const pct = (bp: number) => `${bp / 100}%`;

// ---- online / offline ----
export function useOnline() {
  const [on, setOn] = useState(() => (globalThis as { navigator?: { onLine?: boolean } }).navigator?.onLine !== false);
  useEffect(() => {
    const w = (globalThis as { addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void; navigator?: { onLine?: boolean } });
    if (!w.addEventListener) return;
    const up = () => setOn(true);
    const down = () => setOn(false);
    w.addEventListener('online', up);
    w.addEventListener('offline', down);
    return () => { w.removeEventListener?.('online', up); w.removeEventListener?.('offline', down); };
  }, []);
  return on;
}

/** loading / error / ready for every list or detail. Offline shows the banner above whatever is ready. */
export function AsyncView<T>({ state, children, skeletonRows = 4 }: { state: AsyncState<T>; children: (data: T) => ReactNode; skeletonRows?: number }) {
  const online = useOnline();
  if (state.status === 'loading') return <SkeletonList rows={skeletonRows} />;
  if (state.status === 'error') return <ErrorState onRetry={state.reload} />;
  return (
    <>
      {!online ? <View style={{ marginBottom: 10 }}><OfflineBanner message="You’re offline. Showing what we last loaded." /></View> : null}
      {children(state.data)}
    </>
  );
}

// ---- text ----
export function T({ children, size = 14, weight = 'reg', c = color.ink, style, align }: { children: ReactNode; size?: number; weight?: keyof typeof f; c?: string; style?: StyleProp<object>; align?: 'left' | 'center' | 'right' }) {
  return <RNText style={[{ fontFamily: f[weight], fontSize: size, lineHeight: Math.round(size * 1.4), color: c, textAlign: align }, style]}>{children}</RNText>;
}
export const Cap = ({ children, c = color.inkMuted }: { children: ReactNode; c?: string }) => <T size={11} weight="bold" c={c} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{children}</T>;
export const Display = ({ children, size = 22, c = color.ink, style }: { children: ReactNode; size?: number; c?: string; style?: StyleProp<object> }) => (
  <RNText style={[{ fontFamily: f.display, fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -size / 28, color: c }, style]}>{children}</RNText>
);

export function Pill({ label, bg, fg = color.onLime }: { label: string; bg: string; fg?: string }) {
  return <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}><T size={10} weight="bold" c={fg} style={{ letterSpacing: 0.6 }}>{label}</T></View>;
}
/** Seed records are mock data; the UI says so. */
export const SampleTag = () => <Pill label="SAMPLE" bg={color.line} fg={SOFT} />;

export function Box({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 18, padding: 14 }, style]}>{children}</View>;
}

export function Btn({ label, onPress, kind = 'primary', disabled, busy, style }: { label: string; onPress: () => void; kind?: 'primary' | 'violet' | 'ghost' | 'danger'; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle> }) {
  const off = disabled || busy;
  const bg = off ? color.line : kind === 'primary' ? color.lime : kind === 'violet' ? VIOLET : kind === 'danger' ? color.hot : color.surfaceRaised;
  const fg = off ? '#6E6E78' : kind === 'ghost' ? color.ink : color.onLime;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off, busy: !!busy }} disabled={off} onPress={onPress}
      style={({ pressed }) => [{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: bg, opacity: pressed ? 0.88 : 1 }, style]}>
      <T size={15} weight="bold" c={fg}>{busy ? 'One moment…' : label}</T>
    </Pressable>
  );
}

export function Chips<K extends string>({ items, value, onChange, tone = 'ink' }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void; tone?: 'ink' | 'violet' }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ flexGrow: 0 }}>
      {items.map((it) => {
        const on = it.key === value;
        const bg = on ? (tone === 'ink' ? color.ink : VIOLET) : 'transparent';
        return (
          <Pressable key={it.key} accessibilityRole="button" accessibilityLabel={it.label} accessibilityState={{ selected: on }} onPress={() => onChange(it.key)}
            style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: bg, borderWidth: 1, borderColor: on ? bg : '#2E2E36' }}>
            <T size={13} weight="bold" c={on ? color.onLime : SOFT}>{it.label}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const back = () => (router.canGoBack() ? router.back() : router.replace('/gigs'));

/** Root-route page: Back (real stack back), title, scrolling body, optional sticky footer. */
export function Page({ title, sub, children, footer, right }: { title: string; sub?: string; children: ReactNode; footer?: ReactNode; right?: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <IconButton icon="back" label="Back" onPress={back} />
        <View style={{ flex: 1 }}>
          {sub ? <T size={12} weight="semi" c={color.inkMuted}>{sub}</T> : null}
          <RNText accessibilityRole="header" numberOfLines={2} style={{ fontFamily: f.display, fontSize: 20, lineHeight: 24, letterSpacing: -0.7, color: color.ink }}>{title}</RNText>
        </View>
        {right}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer ? <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, gap: 8, backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: color.line }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Row({ k, v, bold, c }: { k: string; v: string; bold?: boolean; c?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 }}>
      <T size={13} c={bold ? color.ink : SOFT} weight={bold ? 'bold' : 'reg'} style={{ flex: 1 }}>{k}</T>
      <T size={13} weight="bold" c={c ?? color.ink} style={{ flexShrink: 1, textAlign: 'right', maxWidth: '60%' }}>{v}</T>
    </View>
  );
}

/** Every amount shown as take-home: fee and GST are separate lines. Money comes from the API; this only formats. */
export function TakeHomeCard({ th, payUnit, compact }: { th: TakeHome; payUnit?: string | null; compact?: boolean }) {
  const ink = color.onViolet;
  return (
    <View style={{ backgroundColor: VIOLET, borderRadius: 20, padding: 14, gap: 3, boxShadow: `4px 4px 0 ${color.lime}` }}>
      <T size={11} weight="bold" c={ink} style={{ letterSpacing: 1 }}>{payUnit ? `YOU TAKE HOME PER ${payUnit.toUpperCase()}` : 'YOU TAKE HOME'}</T>
      <RNText style={{ fontFamily: f.display, fontSize: compact ? 26 : 34, color: ink, letterSpacing: -1 }}>{formatPaise(th.takeHomePaise)}</RNText>
      <T size={12} weight="semi" c={ink}>pay {formatPaise(th.payPaise)}{payUnit ? ` / ${payUnit}` : ' fixed'}</T>
      {th.waivedPaise > 0 ? <T size={12} weight="semi" c={ink}>{formatPaise(th.waivedPaise)} of this is in your first ₹1,000, no fee</T> : null}
      <T size={12} weight="semi" c={ink}>− {pct(th.feeRateBp)} Bunk3d fee {formatPaise(th.feePaise)}</T>
      <T size={12} weight="semi" c={ink}>− GST on fee {formatPaise(th.gstPaise)}</T>
    </View>
  );
}

export type { StateKind };

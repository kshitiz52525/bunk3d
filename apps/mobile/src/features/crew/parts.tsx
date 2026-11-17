import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text as RNText, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { color } from '@bunk3d/ui';
import { IconButton } from '@bunk3d/ui/native';

export const F = { display: 'Unbounded_800ExtraBold', body: 'Inter_500Medium', semi: 'Inter_600SemiBold', bold: 'Inter_800ExtraBold' } as const;

/** Small text helper: size, family, colour. */
export function T({ size = 14, f = 'body', c = color.ink, style, children, ...rest }: { size?: number; f?: keyof typeof F; c?: string; style?: StyleProp<TextStyle>; children: React.ReactNode } & Omit<React.ComponentProps<typeof RNText>, 'style' | 'children'>) {
  return <RNText {...rest} style={[{ fontFamily: F[f], fontSize: size, color: c }, style]}>{children}</RNText>;
}

/** Club tile: tint square with the short name in dark ink. */
export function ClubTile({ short, tint, size = 44 }: { short: string; tint: string; size?: number }) {
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <RNText numberOfLines={1} style={{ fontFamily: F.display, fontSize: Math.round(size * (short.length > 3 ? 0.2 : 0.26)), color: color.onLime }}>{short}</RNText>
    </View>
  );
}

export function Avatar({ initials, tint, size = 44, online }: { initials: string; tint: string; size?: number; online?: boolean }) {
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: F.display, fontSize: size * 0.3, color: color.onLime }}>{initials}</RNText>
      {online ? <View style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: color.success, borderWidth: 2, borderColor: color.bg }} /> : null}
    </View>
  );
}

/** Top bar for pushed screens: Back always pops the stack. */
export function BackBar({ title, right, children, titleSize = 18 }: { title?: string; right?: React.ReactNode; children?: React.ReactNode; titleSize?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
      <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/crew'))} />
      {children ?? (title ? <T size={titleSize} f="display" style={{ flex: 1 }} accessibilityRole="header">{title}</T> : <View style={{ flex: 1 }} />)}
      {right}
    </View>
  );
}

export function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: selected ? color.ink : 'transparent', borderWidth: 1, borderColor: selected ? color.ink : color.line }}>
      <T size={13} f="bold" c={selected ? color.bg : '#C9C9C3'}>{label}</T>
    </Pressable>
  );
}

export function Tag({ label, bg, fg, style }: { label: string; bg: string; fg: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }, style]}>
      <T size={11} f="bold" c={fg}>{label}</T>
    </View>
  );
}

// ---- time helpers (display only) ----
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (ms: number) => { const d = new Date(ms); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtShortDate = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtTime = (ms: number) => { const d = new Date(ms); const h = d.getHours(); return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
/** "2m", "1h", "Yesterday", "Mon", "3 Nov" */
export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return DAYS[new Date(ms).getDay()];
  return fmtShortDate(ms);
}

// ---- hooks ----
/** Reload when the API says something changed (Supabase Realtime later). */
export function useLive(subscribe: (fn: () => void) => () => void, reload: () => void) {
  const ref = useRef(reload);
  useEffect(() => { ref.current = reload; });
  useEffect(() => subscribe(() => ref.current()), [subscribe]);
}

type Net = { addEventListener?: (k: string, f: () => void) => void; removeEventListener?: (k: string, f: () => void) => void; navigator?: { onLine?: boolean } };

/** Browser online/offline (web). Native keeps `true` until a connectivity library is added. */
export function useOnline(): boolean {
  const [on, setOn] = useState(() => (globalThis as Net).navigator?.onLine ?? true);
  useEffect(() => {
    const w = globalThis as Net;
    if (!w.addEventListener) return;
    const up = () => setOn(true);
    const down = () => setOn(false);
    w.addEventListener('online', up);
    w.addEventListener('offline', down);
    return () => { w.removeEventListener?.('online', up); w.removeEventListener?.('offline', down); };
  }, []);
  return on;
}

/** "10 min ago" style text for the offline banner, from when data last loaded. */
export function useLoadedAgo(ready: boolean): () => string {
  const at = useRef<number | null>(null);
  useEffect(() => { if (ready) at.current = Date.now(); });
  return () => { const m = Math.max(1, Math.round((Date.now() - (at.current ?? Date.now())) / 60_000)); return `${m} min ago`; };
}

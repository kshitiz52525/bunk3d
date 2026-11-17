import { router } from 'expo-router';
import { Pressable, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '@bunk3d/ui';
import { EmptyState, ErrorState, IconButton, SkeletonList } from '@bunk3d/ui/native';
import type { AsyncState } from '@bunk3d/api';

/** Shared small pieces for the You, Discover and Safety screens. */

export function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingTop: 4 }}>
      <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/tea'))} />
      <View style={{ flex: 1 }}>
        {subtitle ? <RNText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{subtitle}</RNText> : null}
        <RNText accessibilityRole="header" numberOfLines={1} style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 20, letterSpacing: -0.6, color: color.ink }}>{title}</RNText>
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 1, color: color.inkMuted, marginTop: 18, marginBottom: 8 }}>{children}</RNText>;
}

/** Accessible on/off switch, 44px tall hit area. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => onChange(!on)} hitSlop={6} style={{ minHeight: 44, minWidth: 52, justifyContent: 'center' }}>
      <View style={{ width: 52, height: 32, borderRadius: 16, backgroundColor: on ? color.lime : '#33333B', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: on ? 23 : 3, width: 26, height: 26, borderRadius: 13, backgroundColor: on ? color.onLime : color.inkMuted }} />
      </View>
    </Pressable>
  );
}

export function Pill({ label, selected, onPress, tone = 'ink' }: { label: string; selected?: boolean; onPress: () => void; tone?: 'ink' | 'lime' }) {
  const on = tone === 'lime' ? color.lime : color.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: selected ? on : 'transparent', borderWidth: 1, borderColor: selected ? on : '#2E2E36' }}>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: selected ? color.onLime : '#C9C9C3' }}>{label}</RNText>
    </Pressable>
  );
}

export function Avatar({ initials, tint, size = 44 }: { initials: string; tint: string; size?: number }) {
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: size * 0.32, color: color.onLime }}>{initials}</RNText>
    </View>
  );
}

export function Btn({ label, onPress, kind = 'lime', disabled, style, small }: { label: string; onPress: () => void; kind?: 'lime' | 'ghost' | 'light' | 'hot'; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const bg = disabled ? '#2A2A31' : kind === 'lime' ? color.lime : kind === 'light' ? color.ink : kind === 'hot' ? color.hot : 'transparent';
  const fg = disabled ? '#6E6E78' : kind === 'ghost' ? color.ink : color.onLime;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[{ minHeight: small ? 44 : 54, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: '#2E2E36' }, style]}>
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: small ? 13 : 15, color: fg }}>{label}</RNText>
    </Pressable>
  );
}

/** Loading / error / empty wrapper for an async list or detail. */
export function AsyncBody<T>({ state, empty, children }: { state: AsyncState<T>; empty?: { when: (d: T) => boolean; title: string; body: string; action: { label: string; onPress: () => void } }; children: (d: T) => React.ReactNode }) {
  if (state.status === 'loading') return <SkeletonList rows={3} />;
  if (state.status === 'error') return <ErrorState onRetry={state.reload} />;
  if (empty?.when(state.data)) return <EmptyState title={empty.title} body={empty.body} action={empty.action} />;
  return <>{children(state.data)}</>;
}

/** Relative time like "20m", "1h", "2d" from an epoch ms. */
export function ago(at: number, now: number = Date.now()): string {
  const m = Math.max(0, Math.round((now - at) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

import React from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { color, radius, space } from '../tokens.generated';
import { pendingBanner } from '../theme';
import { Skeleton } from './primitives';

// S1-States. Every list has loading, error, offline and empty states, and an empty state is never a dead end.

export type StateKind = 'info' | 'wait' | 'err' | 'empty';
const KIND: Record<StateKind, { label: string; accent: string }> = {
  info: { label: 'INFO', accent: color.info },
  wait: { label: 'WAITING', accent: color.warning },
  err: { label: 'BLOCKED', accent: color.error },
  empty: { label: 'EMPTY', accent: color.inkMuted },
};

function Btn({ label, onPress, bg, fg, weight }: { label: string; onPress: () => void; bg: string; fg: string; weight: 'Inter_800ExtraBold' | 'Inter_600SemiBold' }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: bg, justifyContent: 'center' }}>
      <RNText style={{ fontFamily: weight, fontSize: 13, color: fg }}>{label}</RNText>
    </Pressable>
  );
}

/** Domain-tagged state card (S1 grid). `err` gets the pink primary button, others lime. */
export function StateCard({
  domain, kind, title, body, cta, alt,
}: {
  domain: string;
  kind: StateKind;
  title: string;
  body: string;
  cta: { label: string; onPress: () => void };
  alt?: { label: string; onPress: () => void };
}) {
  const k = KIND[kind];
  return (
    <View style={{ backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, color: color.inkMuted }}>{domain}</RNText>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime, backgroundColor: k.accent, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden' }}>{k.label}</RNText>
      </View>
      <RNText accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: color.ink }}>{title}</RNText>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: '#C9C9C3' }}>{body}</RNText>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        <Btn label={cta.label} onPress={cta.onPress} bg={kind === 'err' ? color.hot : color.lime} fg={color.onLime} weight="Inter_800ExtraBold" />
        {alt ? <Btn label={alt.label} onPress={alt.onPress} bg={color.line} fg={color.ink} weight="Inter_600SemiBold" /> : null}
      </View>
    </View>
  );
}

/** "That didn't load." with a Try again button. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'flex-start', gap: 10, padding: space[4] }}>
      <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.ink }}>That didn’t load.</RNText>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#C9C9C3' }}>Our bad, not yours.</RNText>
      <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: color.ink, justifyContent: 'center' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.bg }}>Try again</RNText>
      </Pressable>
    </View>
  );
}

/** Empty state: always one button. Defaults to the S1 sample copy; pass real copy per list. */
export function EmptyState({
  title = 'Nothing here yet.',
  body = 'Never a dead end — always one button.',
  action,
}: {
  title?: string;
  body?: string;
  action: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ alignItems: 'flex-start', gap: 10, padding: space[4] }}>
      <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.ink }}>{title}</RNText>
      <RNText style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#C9C9C3' }}>{body}</RNText>
      <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: color.lime, justifyContent: 'center' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.onLime }}>{action.label}</RNText>
      </Pressable>
    </View>
  );
}

/** Offline banner. `since` is real elapsed text ("10 min ago") supplied by the caller. */
export function OfflineBanner({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pendingBanner.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: pendingBanner.bg }}>{message}</RNText>
    </View>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={{ gap: 12, padding: space[4] }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: color.line }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton height={9} width="50%" />
            <Skeleton height={8} width="30%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export { radius };

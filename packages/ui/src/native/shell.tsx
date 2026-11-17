import React from 'react';
import { Pressable, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, space } from '../tokens.generated';
import { Icon } from './Icon';
import { textStyle } from '../theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: color.bg, paddingHorizontal: 22, paddingBottom: 14 }, style]}>{children}</SafeAreaView>
  );
}

/** Round 44px icon button. Always labelled. */
export function IconButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

/** Onboarding header: back, "STEP n OF 7", optional right action, and the 7-segment progress bar. */
export function StepHeader({
  step,
  label,
  onBack,
  right,
  progress = true,
  warn,
}: {
  step?: number;
  label?: string;
  onBack: () => void;
  right?: { label: string; onPress: () => void };
  progress?: boolean;
  /** Colours the current segment amber (verification pending). */
  warn?: boolean;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, marginTop: 4 }}>
        <IconButton icon="back" label="Back" onPress={onBack} />
        <RNText style={[textStyle('label'), { fontSize: 12, color: color.inkMuted, letterSpacing: 1 }]}>{label ?? `STEP ${step} OF 7`}</RNText>
        {right ? (
          <Pressable accessibilityRole="button" accessibilityLabel={right.label} onPress={right.onPress} style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
            <RNText style={[textStyle('meta'), { fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: color.inkMuted }]}>{right.label}</RNText>
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
      {progress && step ? (
        <View accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of 7`} style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < step ? (warn && i === step - 1 ? color.warning : color.lime) : color.line }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function H1({ children, size = 28 }: { children: React.ReactNode; size?: number }) {
  return (
    <RNText accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: size, lineHeight: size * 1.05, letterSpacing: -size / 28 * 1, color: color.ink }}>
      {children}
    </RNText>
  );
}

/** Big 56px bottom CTA with the hard violet sticker shadow. Label colour on lime is always dark. */
export function PrimaryCta({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: off ? color.surfaceRaised : color.lime,
        boxShadow: off ? undefined : `4px 4px 0 ${color.violet}`,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: off ? color.inkMuted : color.onLime }}>{label}</RNText>
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
      <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: color.ink }}>{label}</RNText>
    </Pressable>
  );
}

export function Spacer() {
  return <View style={{ flex: 1 }} />;
}

export { radius, space };

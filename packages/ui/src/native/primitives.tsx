import React from 'react';
import {
  Pressable,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { color, radius, space, tilt } from '../tokens.generated';
import { pendingBanner, textStyle, type TextStyleName } from '../theme';

const MIN_TARGET = 44;

export function Text({
  variant = 'body',
  style,
  ...rest
}: React.ComponentProps<typeof RNText> & { variant?: TextStyleName; style?: StyleProp<TextStyle> }) {
  return <RNText {...rest} style={[textStyle(variant), variant === 'label' && { textTransform: 'uppercase' }, style]} />;
}

/** `bunk3d` in lower case with a lime 3. Never tilted. */
export function Wordmark({ size = 24 }: { size?: number }) {
  const base = { ...textStyle('section'), fontSize: size, lineHeight: size * 1.1, letterSpacing: -size / 30 };
  return (
    <RNText accessibilityRole="header" accessibilityLabel="Bunk3d" style={base}>
      bunk<RNText style={{ color: color.lime }}>3</RNText>d
    </RNText>
  );
}

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  kind?: 'primary' | 'secondary';
  /** The one hard violet sticker shadow. At most one per view. */
  sticker?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, kind = 'primary', sticker, style, disabled, ...rest }: ButtonProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: MIN_TARGET,
          paddingHorizontal: space[6],
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primary ? color.lime : color.surfaceRaised,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        sticker && { boxShadow: `4px 4px 0 ${color.violet}`, transform: [{ rotate: `${tilt.left}deg` }] },
        style,
      ]}
    >
      {/* Label colour on the lime fill is always on-lime (dark). */}
      <RNText style={[textStyle('sticker'), { color: primary ? color.onLime : color.ink }]}>{label}</RNText>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        minHeight: MIN_TARGET,
        paddingHorizontal: space[4],
        borderRadius: radius.pill,
        justifyContent: 'center',
        backgroundColor: selected ? color.ink : 'transparent',
        borderWidth: 1,
        borderColor: selected ? color.ink : color.line,
      }}
    >
      <RNText style={[textStyle('meta'), { color: selected ? color.bg : color.ink }]}>{label}</RNText>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.line, padding: space[4] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Lime sticker with a slight tilt. Rotation is clamped to +-6 degrees. */
export function Sticker({ label, rotate = tilt.left }: { label: string; rotate?: number }) {
  const r = Math.max(-tilt.max, Math.min(tilt.max, rotate));
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: color.lime,
        borderRadius: radius.lg,
        paddingHorizontal: space[4],
        paddingVertical: space[2],
        transform: [{ rotate: `${r}deg` }],
        boxShadow: `4px 4px 0 ${color.violet}`,
      }}
    >
      <RNText style={[textStyle('sticker'), { color: color.onLime }]}>{label}</RNText>
    </View>
  );
}

export function Input({ label, style, ...rest }: TextInputProps & { label: string }) {
  return (
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={color.inkMuted}
      {...rest}
      style={[
        textStyle('body'),
        {
          minHeight: MIN_TARGET,
          paddingHorizontal: space[4],
          borderRadius: radius.md,
          backgroundColor: color.surface,
          borderWidth: 1,
          borderColor: color.line,
        },
        style,
      ]}
    />
  );
}

/** Pending-verification banner (yellow). Stays at the top of the Vibe until verified. */
export function Banner({ text, kind = 'pending' }: { text: string; kind?: 'pending' | 'offline' }) {
  const pending = kind === 'pending';
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: pending ? pendingBanner.bg : color.surfaceRaised,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
      }}
    >
      <RNText style={[textStyle('meta'), { color: pending ? pendingBanner.ink : color.ink }]}>{text}</RNText>
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | `${number}%` }) {
  return <View accessibilityElementsHidden style={{ height, width, borderRadius: radius.sm, backgroundColor: color.surfaceRaised }} />;
}

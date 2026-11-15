import { color, textStyles } from './tokens.generated';

// From HANDOFF §3: pending banner is #3D2E0D text on #FFD58A.
export const pendingBanner = { bg: '#FFD58A', ink: '#3D2E0D' } as const;

// Loaded in the app root via @expo-google-fonts.
export const fontFamily = {
  display: 'Unbounded_800ExtraBold',
  sans: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_800ExtraBold',
} as const;

export type TextStyleName = keyof typeof textStyles;

export function textStyle(name: TextStyleName) {
  const s = textStyles[name];
  const family =
    s.family === 'display'
      ? fontFamily.display
      : s.fontWeight === '800'
        ? fontFamily.sansBold
        : s.fontWeight === '600'
          ? fontFamily.sansSemi
          : fontFamily.sans;
  return {
    fontFamily: family,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    color: color.ink,
  };
}

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@bunk3d/ui';
import { Icon, IconButton } from '@bunk3d/ui/native';
import type { EventSummary } from '@bunk3d/api';

export const TINT: Record<EventSummary['tint'], { bg: string; ring: string }> = {
  lime: { bg: color.lime, ring: '#B8E020' },
  violet: { bg: color.violet, ring: '#9A7FF0' },
  sky: { bg: color.info, ring: '#3FAEE6' },
  pink: { bg: color.hot, ring: '#E8507F' },
  grey: { bg: '#3A3A42', ring: '#4A4A54' },
};

/** Root-route screen frame: safe area, back button (real stack Back), optional title block. */
export function RouteFrame({ title, subtitle, right, children, bg = color.bg }: { title?: string; subtitle?: string; right?: ReactNode; children: ReactNode; bg?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? <RNText numberOfLines={1} accessibilityRole="header" style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize: 16, color: color.ink }}>{title}</RNText> : null}
          {subtitle ? <RNText numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: color.inkMuted }}>{subtitle}</RNText> : null}
        </View>
        {right}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function Pill({ label, active, onPress, tone = 'ink' }: { label: string; active?: boolean; onPress?: () => void; tone?: 'ink' | 'lime' }) {
  const on = active ? (tone === 'lime' ? color.lime : color.ink) : 'transparent';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on, borderWidth: 1, borderColor: active ? on : color.line }}>
      <RNText style={{ fontFamily: active ? 'Inter_800ExtraBold' : 'Inter_600SemiBold', fontSize: 12, color: active ? color.onLime : '#C9C9C3' }}>{label}</RNText>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Check({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onToggle} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 44, paddingVertical: 4 }}>
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: checked ? color.lime : '#4A4A54', backgroundColor: checked ? color.lime : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {checked ? <Icon name="check" size={14} color={color.onLime} stroke={3} /> : null}
      </View>
      <RNText style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: '#C9C9C3' }}>{label}</RNText>
    </Pressable>
  );
}

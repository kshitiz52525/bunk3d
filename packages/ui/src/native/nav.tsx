import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, Text as RNText, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '../tokens.generated';
import { Icon, type IconName } from './Icon';

// ---- Scroll chrome (M3-Motion): header hides on scroll down, tab bar hides too. ----
type Chrome = { hidden: Animated.Value; onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void };
const ChromeCtx = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const hidden = useRef(new Animated.Value(0)).current; // 0 shown, 1 hidden
  const last = useRef(0);
  const state = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - last.current;
    last.current = y;
    const want = y > 80 && dy > 4 ? 1 : dy < -4 || y <= 20 ? 0 : state.current;
    if (want !== state.current) {
      state.current = want;
      Animated.timing(hidden, { toValue: want, duration: 220, useNativeDriver: true }).start();
    }
  }, [hidden]);
  const value = useMemo(() => ({ hidden, onScroll }), [hidden, onScroll]);
  return <ChromeCtx.Provider value={value}>{children}</ChromeCtx.Provider>;
}

/** Pass `onScroll` (and scrollEventThrottle={16}) to your list or ScrollView to hide chrome while scrolling down. */
export function useChrome(): Chrome {
  const c = useContext(ChromeCtx);
  const fallback = useRef({ hidden: new Animated.Value(0), onScroll: () => {} }).current;
  return c ?? fallback;
}

export type TabItem = { key: string; label: string; icon: IconName };

/** Bottom tab bar. The selected tab is a lime (Vibe) or violet (Hustle) pill with its label. */
export function TabBar({
  items, active, onSelect, accent = color.lime, hideOnScroll = true,
}: {
  items: TabItem[]; active: string; onSelect: (key: string) => void; accent?: string; hideOnScroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { hidden } = useChrome();
  const translateY = hideOnScroll ? hidden.interpolate({ inputRange: [0, 1], outputRange: [0, 110] }) : 0;
  return (
    <Animated.View
      accessibilityRole="tablist"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY }], backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: color.line, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, flexDirection: 'row', justifyContent: 'space-around' }}
    >
      {items.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => onSelect(t.key)} style={{ minHeight: 48, minWidth: 56, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? accent : 'transparent' }}>
              <Icon name={t.icon} size={22} color={on ? color.onLime : color.inkMuted} />
            </View>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: on ? color.ink : color.inkMuted }}>{t.label}</RNText>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

/** Height screens must leave at the bottom so content is not hidden behind the tab bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return 64 + Math.max(insets.bottom, 8);
}

/** Header that slides up with the chrome. */
export function HidingHeader({ children, height = 86 }: { children: React.ReactNode; height?: number }) {
  const { hidden } = useChrome();
  const translateY = hidden.interpolate({ inputRange: [0, 1], outputRange: [0, -height] });
  useEffect(() => {}, []);
  return <Animated.View style={{ transform: [{ translateY }], backgroundColor: color.bg, zIndex: 5 }}>{children}</Animated.View>;
}

/** Top padding tab screens need so content starts below the floating header. */
export function useHeaderSpace() {
  const insets = useSafeAreaInsets();
  return insets.top + 86;
}

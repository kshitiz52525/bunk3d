import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Text as RNText, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { Icon } from '@bunk3d/ui/native';

export function FieldLabel({ children }: { children: string }) {
  return <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: color.inkMuted }}>{children}</RNText>;
}

/** Six boxes backed by one invisible input, so SMS autofill and paste work. */
export function OtpBoxes({
  value, onChange, error, height = 60, fontSize = 24, radius = 14, autoFocus,
}: {
  value: string; onChange: (v: string) => void; error?: boolean; height?: number; fontSize?: number; radius?: number; autoFocus?: boolean;
}) {
  const ref = useRef<React.ElementRef<typeof TextInput>>(null);
  return (
    <Pressable accessibilityLabel="6-digit code" onPress={() => ref.current?.focus()}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const d = value[i] ?? '';
          const active = !error && i === Math.min(value.length, 5);
          const border = error ? color.error : active ? color.lime : d ? '#4A4A54' : '#2E2E36';
          return (
            <View key={i} style={{ flex: 1, height, borderRadius: radius, backgroundColor: color.surface, borderWidth: 2, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
              <RNText style={{ fontFamily: 'Unbounded_800ExtraBold', fontSize, color: error ? color.error : color.ink }}>{d}</RNText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        autoFocus={autoFocus}
        accessibilityLabel="6-digit code input"
        style={{ position: 'absolute', opacity: 0, width: '100%', height }}
      />
    </Pressable>
  );
}

/** Seconds left of `from`, counted from `sentAt` (ms). Ticks once a second. */
export function useCountdown(from: number, sentAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.min(from, Math.max(0, from - Math.floor((now - sentAt) / 1000)));
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Compact dropdown (DEGREE / DEPT / YEAR) that opens a bottom list. */
export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not set'}`}
        onPress={() => setOpen(true)}
        style={{ flex: 1, minHeight: 56, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: '#2E2E36', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }}
      >
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 0.6, color: color.inkMuted }}>{label.toUpperCase()}</RNText>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: value ? color.ink : color.inkMuted }}>{value || 'Pick'} ▾</RNText>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: color.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: 1.4, color: color.inkMuted, marginBottom: 8 }}>{label.toUpperCase()}</RNText>
            <FlatList
              data={options}
              keyExtractor={(o) => o}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="button" accessibilityLabel={item} onPress={() => { onChange(item); setOpen(false); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: color.ink }}>{item}</RNText>
                  {item === value ? <Icon name="check" color={color.lime} /> : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

import { Pressable, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import type { RadarMapProps } from './radarTypes';

/**
 * Web fallback: react-native-maps has no web support. Pins are laid out on a flat board from their real coordinates,
 * and every pin is still a working button. The native build shows the real map.
 */
export function RadarMap({ center, pins, you, onPin, height }: RadarMapProps) {
  // Fixed scale around the campus (about 2 km each way); farther places sit on the edge.
  const SPAN = 0.02;
  const clamp = (n: number) => Math.min(80, Math.max(4, n));
  const base = (lat: number, lng: number) => ({ x: clamp(50 + ((lng - center.lng) / SPAN) * 38), y: clamp(50 - ((lat - center.lat) / SPAN) * 38) });
  // Nudge pins that would land on top of each other so every one stays tappable.
  const placed: { id: string; x: number; y: number }[] = [];
  const crowd = (x: number, y: number) => Math.min(...placed.map((q) => Math.max(Math.abs(q.x - x) / 34, Math.abs(q.y - y) / 13)), 9);
  for (const p of pins) {
    const b = base(p.lat, p.lng);
    // Try the true spot first, then nearby ones, and keep the least crowded.
    const tries = [[0, 0], [0, 13], [0, -13], [28, 0], [-28, 0], [28, 13], [-28, -13], [0, 26], [0, -26], [28, -13], [-28, 13]].map(([dx, dy]) => ({ x: Math.min(70, Math.max(2, b.x + dx)), y: clamp(b.y + dy) }));
    const best = tries.find((t) => crowd(t.x, t.y) >= 1) ?? tries.reduce((m, t) => (crowd(t.x, t.y) > crowd(m.x, m.y) ? t : m));
    placed.push({ id: p.id, x: best.x, y: best.y });
  }
  const at = (id: string) => placed.find((q) => q.id === id)!;
  const pos = (lat: number, lng: number) => { const b = base(lat, lng); return { left: `${b.x}%` as const, top: `${b.y}%` as const }; };
  return (
    <View accessibilityLabel="Places and meetups near campus (flat map)" style={{ height, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: color.line, backgroundColor: '#111116' }}>
      <RNText style={{ position: 'absolute', right: 10, top: 8, fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>Flat map preview. The app shows the live map.</RNText>
      {pins.map((p, i) => (
        <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => onPin(p)} style={[{ position: 'absolute', minHeight: 44, justifyContent: 'center', transform: [{ rotate: `${(i % 3) - 1}deg` }] }, { left: `${at(p.id).x}%`, top: `${at(p.id).y}%` }]}>
          <View style={{ backgroundColor: p.tint, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }}>
            <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{p.name}</RNText>
          </View>
        </Pressable>
      ))}
      {you ? <View accessibilityLabel="You, approximate" style={[{ position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: color.lime, borderWidth: 3, borderColor: color.bg }, pos(you.lat, you.lng)]} /> : null}
    </View>
  );
}

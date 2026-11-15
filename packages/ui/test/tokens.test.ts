import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { color, radius, textStyles } from '../src/tokens.generated';
import { pendingBanner } from '../src/theme';

const src = JSON.parse(readFileSync(new URL('../../../brand/tokens.json', import.meta.url), 'utf8'));

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('tokens', () => {
  it('match brand/tokens.json dark values', () => {
    for (const t of src.color.tokens) {
      const key = t.name.replace(/-([a-z0-9])/g, (_: string, c: string) => c.toUpperCase());
      expect((color as Record<string, string>)[key]).toBe(typeof t.value === 'string' ? t.value : t.value.dark);
    }
  });
  it('match the HANDOFF §3 palette', () => {
    expect(color).toMatchObject({ bg: '#0D0D0F', surface: '#17171B', surfaceRaised: '#1F1F25', line: '#26262D', ink: '#F5F5F0', inkMuted: '#9A9AA5', lime: '#D4FF3A', violet: '#B49CFF', hot: '#FF6B9A', success: '#3DDC97', warning: '#FFB547' });
  });
  it('text on lime is on-lime (#0D0D0F), never white', () => {
    expect(color.onLime).toBe('#0D0D0F');
    expect(contrast(color.onLime, color.lime)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', color.lime)).toBeLessThan(4.5);
  });
  it('text pairs meet 4.5:1', () => {
    for (const bg of [color.bg, color.surface, color.surfaceRaised]) {
      expect(contrast(color.ink, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color.inkMuted, bg === color.surfaceRaised ? color.surface : bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(pendingBanner.ink, pendingBanner.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.anonInk, color.anonTile)).toBeGreaterThanOrEqual(4.5);
  });
  it('has radius and type scales', () => {
    expect(radius.lg).toBe(20);
    expect(textStyles.number.fontSize).toBe(48);
  });
});

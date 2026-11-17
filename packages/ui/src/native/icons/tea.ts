// Icons used only by the tea feature. Add entries here; do not edit base.ts or Icon.tsx.
// Path data, 24x24 stroke icons. Use circle()/rect() from './base' if helpful.
import { circle, rect } from './base';

export const teaIcons = {
  teaFlash: ['M13 3L5 13h6l-1 8 8-10h-6l1-8z'],
  teaFlip: ['M4 9a8 8 0 0 1 14-3l2 2', 'M20 4v4h-4', 'M20 15a8 8 0 0 1-14 3l-2-2', 'M4 20v-4h4'],
  teaPoll: [rect(4, 4, 16, 16, 3), 'M8 15v-3M12 15V8M16 15v-5'],
  teaMic: [rect(9, 3, 6, 11, 3), 'M5 11a7 7 0 0 0 14 0M12 18v3'],
  teaPhone: [rect(7, 3, 10, 18, 2), 'M11 18h2'],
  teaBlur: [circle(12, 12, 8), circle(12, 12, 4)],
} as const satisfies Record<string, readonly string[]>;

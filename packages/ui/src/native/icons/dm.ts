// Icons used only by the dm feature. Add entries here; do not edit base.ts or Icon.tsx.
// Path data, 24x24 stroke icons. Use circle()/rect() from './base' if helpful.
import { circle } from './base';

export const dmIcons = {
  dmCompose: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  dmRequest: ['M4 5h16v11H9l-5 4z', 'M12 8v4M12 14.5v.5'],
  dmInfo: [circle(12, 12, 9), 'M12 11v5M12 8h.01'],
  dmPhoto: ['M3 5h18v14H3z', circle(9, 10, 1.5), 'M3 17l5-4 4 3 3-2 6 4'],
} as const satisfies Record<string, readonly string[]>;

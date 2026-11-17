// Icons used only by the poppin feature. Add entries here; do not edit base.ts or Icon.tsx.
// Path data, 24x24 stroke icons. Use circle()/rect() from './base' if helpful.
export const poppinIcons = {
  poppinCheckCircle: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12.5l3 3 5-6'],
} as const satisfies Record<string, readonly string[]>;

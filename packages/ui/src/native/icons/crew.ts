// Icons used only by the crew feature. Add entries here; do not edit base.ts or Icon.tsx.
// Path data, 24x24 stroke icons. Use circle()/rect() from './base' if helpful.
import { circle } from './base';

export const crewIcons = {
  crewPin: ['M12 17v5', 'M5 17h14l-2-5V4H7v8z'],
  crewBellOff: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10 21h4', 'M3 3l18 18'],
  crewHash: ['M5 9h14M5 15h14M10 4L8 20M16 4l-2 16'],
  crewUpload: ['M12 16V5M7 10l5-5 5 5', 'M5 19h14'],
  crewInfo: [circle(12, 12, 9), 'M12 11v5M12 8h.01'],
} as const satisfies Record<string, readonly string[]>;

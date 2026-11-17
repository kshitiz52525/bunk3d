import type { RadarPin } from '@bunk3d/api';

export type RadarMapProps = {
  center: { lat: number; lng: number };
  pins: RadarPin[];
  /** The caller's approximate position, or null when ghost mode hides them. */
  you: { lat: number; lng: number } | null;
  onPin: (p: RadarPin) => void;
  height: number;
};

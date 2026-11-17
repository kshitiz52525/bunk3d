import { color } from '@bunk3d/ui';
import { formatPaise } from '@bunk3d/core';
import type { TaskRow } from '@bunk3d/api';
import { Tag } from './parts';

export const STATUS: Record<TaskRow['status'], { label: string; color: string }> = {
  assigned: { label: 'Waiting on you', color: color.warning },
  revision: { label: 'Waiting on you', color: color.warning },
  accepted: { label: 'Accepted', color: color.info },
  working: { label: 'In progress', color: color.info },
  review: { label: 'In review', color: color.violet },
  approved: { label: 'Approved ✓', color: color.success },
};

export function RewardTag({ r }: { r: TaskRow['reward'] }) {
  if (r.kind === 'xp') return <Tag label={`+${r.xp} XP`} bg={color.modTile} fg={color.modInk} />;
  if (r.kind === 'paid') return <Tag label={`Paid · ${formatPaise(r.payPaise)}`} bg={color.lime} fg={color.onLime} />;
  return <Tag label="Certificate" bg={color.line} fg={color.ink} />;
}


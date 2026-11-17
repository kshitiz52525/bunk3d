// Swap rules. Bunk3d never handles Swap money: students meet on campus and pay in person.
// Banned: weapons, medicines, notes-for-cash on exams.
export type BannedReason = 'weapons' | 'medicines' | 'exam_notes';

const RULES: { reason: BannedReason; re: RegExp }[] = [
  { reason: 'weapons', re: /\b(gun|guns|pistol|revolver|rifle|knife|knives|dagger|sword|ammo|ammunition|explosive|firearm|air ?gun|pepper spray|taser)\b/i },
  { reason: 'medicines', re: /\b(medicine|medicines|tablet|tablets|capsule|capsules|pills?|prescription|syrup|antibiotic|painkiller|steroid|inhaler|drugs?)\b/i },
  { reason: 'exam_notes', re: /\b(exam|paper|question paper|answer key|leaked|leak)\b.*\b(notes|paper|answers?|key)\b|\b(notes|answers?)\b.*\b(for|before)\b.*\b(exam|internals?|semester)\b|\bleaked\b/i },
];

export const BANNED_COPY: Record<BannedReason, string> = {
  weapons: 'Weapons can’t be listed on Swap.',
  medicines: 'Medicines can’t be listed on Swap.',
  exam_notes: 'Notes for cash on exams can’t be listed on Swap.',
};

/** First banned category found in the text, or null. A simple keyword screen; moderation reviews the rest. */
export function bannedListingReason(text: string): BannedReason | null {
  for (const r of RULES) if (r.re.test(text)) return r.reason;
  return null;
}

export const SWAP_CATEGORIES = ['Books', 'Gear', 'Rides', 'Hostel'] as const;
export const SWAP_CONDITIONS = ['New', 'Like new', 'Good', 'Used'] as const;
export type SwapCategory = (typeof SWAP_CATEGORIES)[number];
export type SwapCondition = (typeof SWAP_CONDITIONS)[number];

export const SWAP_MAX_PHOTOS = 5;

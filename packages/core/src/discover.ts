// Discover rules: Spark invites, Radar location sharing, meetup spot reveal (HANDOFF section 4, Discover).
// Everything here is pure; the mock API and later the backend call these.

export const INVITES_PER_DAY = 3;
export const INVITE_EXPIRY_HOURS = 48;
/** The day rolls over at midnight India time. */
export const IST_OFFSET_MIN = 330;
const MIN = 60_000;
const HOUR = 3600_000;

function istDayKey(ts: number): number {
  return Math.floor((ts + IST_OFFSET_MIN * MIN) / (24 * HOUR));
}

/** Invites left today (3 a day, counted per India calendar day). `sentAt` are epoch ms of every invite sent. */
export function invitesLeft(sentAt: readonly number[], now: number): number {
  const today = istDayKey(now);
  const used = sentAt.filter((t) => istDayKey(t) === today).length;
  return Math.max(0, INVITES_PER_DAY - used);
}

export function canSendInvite(sentAt: readonly number[], now: number): boolean {
  return invitesLeft(sentAt, now) > 0;
}

/** Next midnight in India time, epoch ms: when the quota resets. */
export function inviteQuotaResetsAt(now: number): number {
  return (istDayKey(now) + 1) * 24 * HOUR - IST_OFFSET_MIN * MIN;
}

export type InviteDraft = { plan?: string; spot?: string; time?: string };
/** An invite is a concrete plan: what, where and when are all required. A bare "hey" is refused. */
export function inviteIsConcrete(d: InviteDraft): boolean {
  return !!d.plan?.trim() && !!d.spot?.trim() && !!d.time?.trim();
}

export const INVITE_MESSAGE_MAX = 140;

export function inviteExpiresAt(sentAt: number): number {
  return sentAt + INVITE_EXPIRY_HOURS * HOUR;
}
export function inviteHoursLeft(sentAt: number, now: number): number {
  return Math.max(0, Math.ceil((inviteExpiresAt(sentAt) - now) / HOUR));
}

// ---- approximate location -------------------------------------------------

export const APPROX_METERS = 150;
const M_PER_DEG_LAT = 111_320;

export type LatLng = { lat: number; lng: number };

/**
 * Snap a position to a grid of about 150 m so the exact point is never shared.
 * Every position in the same cell returns the same point (the cell centre), so the output cannot be
 * averaged back toward the real position. The real position is within about 106 m of the result.
 */
export function approximateLocation(p: LatLng, meters: number = APPROX_METERS): LatLng {
  const dLat = meters / M_PER_DEG_LAT;
  const row = Math.floor(p.lat / dLat);
  const centreLat = (row + 0.5) * dLat;
  // Use the cell's own latitude for the longitude step so every point in a row shares one grid.
  const cosCell = Math.max(0.01, Math.cos((centreLat * Math.PI) / 180));
  const stepLng = meters / (M_PER_DEG_LAT * cosCell);
  const col = Math.floor(p.lng / stepLng);
  return { lat: round6(centreLat), lng: round6((col + 0.5) * stepLng) };
}
function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/** Haversine distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- location sharing -----------------------------------------------------

export const SHARE_MINUTES = [15, 30, 60] as const;
export type ShareMinutes = (typeof SHARE_MINUTES)[number];
export function isShareMinutes(n: number): n is ShareMinutes {
  return (SHARE_MINUTES as readonly number[]).includes(n);
}
export const SHARE_EXTEND_MINUTES = 15;
/** A share never runs longer than an hour from now, however often it is extended. */
export const SHARE_MAX_REMAINING_MINUTES = 60;

export type LocationShare = {
  ownerId: string;
  /** Only these people can ever see the owner. Empty means nobody. */
  personIds: readonly string[];
  expiresAt: number;
};

export function shareIsActive(s: LocationShare | null | undefined, now: number): boolean {
  return !!s && s.personIds.length > 0 && now < s.expiresAt;
}

export function startShare(ownerId: string, personIds: readonly string[], minutes: number, now: number): LocationShare | null {
  if (!isShareMinutes(minutes) || personIds.length === 0) return null;
  return { ownerId, personIds: [...new Set(personIds)], expiresAt: now + minutes * MIN };
}

/** Add 15 minutes, never past an hour from now. Returns the share unchanged if it already ended. */
export function extendShare(s: LocationShare, now: number): LocationShare {
  if (!shareIsActive(s, now)) return s;
  const cap = now + SHARE_MAX_REMAINING_MINUTES * MIN;
  return { ...s, expiresAt: Math.min(cap, s.expiresAt + SHARE_EXTEND_MINUTES * MIN) };
}

export function minutesLeft(s: LocationShare, now: number): number {
  return Math.max(0, Math.ceil((s.expiresAt - now) / MIN));
}

/**
 * Can `viewerId` see where `owner` is? Only people the owner picked, only while the share is active,
 * and ghost mode (on by default) hides the owner from the campus map but never blocks a person they picked.
 */
export function canSeeLocation(viewerId: string, share: LocationShare | null | undefined, now: number): boolean {
  return shareIsActive(share, now) && !!share && share.personIds.includes(viewerId) && viewerId !== share.ownerId;
}

// ---- meetup spot ----------------------------------------------------------

export const SPOT_REVEAL_HOURS_BEFORE = 1;

export function spotRevealAt(startsAt: number): number {
  return startsAt - SPOT_REVEAL_HOURS_BEFORE * HOUR;
}

/** The exact spot is shown only to the host and approved people, and only from 1 hour before the start. */
export function exactSpotVisible(i: { isHost: boolean; approved: boolean; startsAt: number; now: number }): boolean {
  if (i.isHost) return true;
  return i.approved && i.now >= spotRevealAt(i.startsAt);
}

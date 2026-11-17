// Pure rules for Crew HQ (events, check-in) and Ops (verification, strikes, wave gate).
// Names are prefixed so they never clash with other domains' rules.

// ---------- Rotating ticket QR (about every minute) ----------
export const QR_PERIOD_MS = 60_000;

export function qrWindow(nowMs: number, periodMs = QR_PERIOD_MS): number {
  return Math.floor(nowMs / periodMs);
}

/** Non-cryptographic 2x32-bit FNV-1a mix. The backend replaces it with an HMAC; the shape stays the same. */
function mix(input: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    a = Math.imul(a ^ input.charCodeAt(i), 0x01000193) >>> 0;
    b = Math.imul(b + input.charCodeAt(i) + a, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export function qrToken(ticketId: string, secret: string, nowMs: number, periodMs = QR_PERIOD_MS): string {
  const w = qrWindow(nowMs, periodMs);
  return `${ticketId}.${w}.${mix(`${secret}|${ticketId}|${w}`)}`;
}

export type QrCheck = { ticketId: string | null; valid: boolean };

/** Accepts the current and the previous window only (clock skew and slow scans), so screenshots go stale. */
export function verifyQr(token: string, secretFor: (ticketId: string) => string | undefined, nowMs: number, periodMs = QR_PERIOD_MS): QrCheck {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return { ticketId: null, valid: false };
  const [ticketId, w, sig] = parts as [string, string, string];
  const secret = secretFor(ticketId);
  if (!secret) return { ticketId, valid: false };
  const win = Number(w);
  const now = qrWindow(nowMs, periodMs);
  if (!Number.isInteger(win) || (win !== now && win !== now - 1)) return { ticketId, valid: false };
  return { ticketId, valid: mix(`${secret}|${ticketId}|${win}`) === sig };
}

// ---------- Check-in decision (E5 / CH5) ----------
export type ScanResult = 'checked_in' | 'already_used' | 'wrong_event' | 'not_registered';

export type ScanTicket = { ticketId: string; eventId: string };

export function decideScan(i: {
  eventId: string;
  qrValid: boolean;
  ticket: ScanTicket | undefined;
  alreadyCheckedIn: boolean;
}): ScanResult {
  if (!i.qrValid || !i.ticket) return 'not_registered';
  if (i.ticket.eventId !== i.eventId) return 'wrong_event';
  if (i.alreadyCheckedIn) return 'already_used';
  return 'checked_in';
}

export type QueuedScan = { ticketId: string; scannedAtMs: number; scannerId: string };

/** Offline sync: for each ticket the earliest scan is the check-in; later scans are duplicates. */
export function mergeOfflineScans(already: ReadonlySet<string>, queued: readonly QueuedScan[]): { accepted: QueuedScan[]; duplicates: QueuedScan[] } {
  const sorted = [...queued].sort((a, b) => a.scannedAtMs - b.scannedAtMs);
  const seen = new Set(already);
  const accepted: QueuedScan[] = [];
  const duplicates: QueuedScan[] = [];
  for (const s of sorted) {
    if (seen.has(s.ticketId)) duplicates.push(s);
    else { seen.add(s.ticketId); accepted.push(s); }
  }
  return { accepted, duplicates };
}

// ---------- Create event (E4 / CH4) ----------
export type EventDraft = {
  title: string;
  category: string;
  startsAtMs: number;
  endsAtMs: number;
  venue: string;
  capacity: number;
  rsvpDeadlineMs: number;
  ticketType: 'free' | 'paid';
  pricePaise: number;
};

export type DraftIssue = { field: keyof EventDraft; message: string };

export function validateEventDraft(d: EventDraft, opts: { paidAllowed: boolean }): DraftIssue[] {
  const out: DraftIssue[] = [];
  if (!d.title.trim()) out.push({ field: 'title', message: 'Add a title.' });
  if (!d.category) out.push({ field: 'category', message: 'Pick a category.' });
  if (!d.venue.trim()) out.push({ field: 'venue', message: 'Add a venue.' });
  if (!Number.isFinite(d.startsAtMs)) out.push({ field: 'startsAtMs', message: 'Set a start time.' });
  if (!Number.isFinite(d.endsAtMs) || d.endsAtMs <= d.startsAtMs) out.push({ field: 'endsAtMs', message: 'The end has to be after the start.' });
  if (!Number.isInteger(d.capacity) || d.capacity < 1) out.push({ field: 'capacity', message: 'Capacity has to be at least 1.' });
  if (!Number.isFinite(d.rsvpDeadlineMs) || d.rsvpDeadlineMs > d.startsAtMs) out.push({ field: 'rsvpDeadlineMs', message: 'RSVPs have to close before the event starts.' });
  if (d.ticketType === 'paid') {
    if (!opts.paidAllowed) out.push({ field: 'ticketType', message: 'Paid events open when your campus reaches wave 3.' });
    if (!Number.isInteger(d.pricePaise) || d.pricePaise < 100) out.push({ field: 'pricePaise', message: 'Set a price of at least Rs 1.' });
  }
  return out;
}

// ---------- Ops: verification photos ----------
export const ID_PHOTO_RETENTION_DAYS = 30;
export const ID_PHOTO_URL_TTL_SEC = 300;

export function idPhotoDeleteAtMs(decidedAtMs: number): number {
  return decidedAtMs + ID_PHOTO_RETENTION_DAYS * 86_400_000;
}

// ---------- Ops: strikes (1 warning, 2 mute 24h, 3 ban 7d, 4 removed; expire after 90 days) ----------
export const OPS_STRIKE_EXPIRY_DAYS = 90;
export type StrikeOutcome = 'warning' | 'mute_24h' | 'ban_7d' | 'removed';

export function activeStrikeCount(strikeDatesMs: readonly number[], nowMs: number): number {
  return strikeDatesMs.filter((t) => nowMs - t < OPS_STRIKE_EXPIRY_DAYS * 86_400_000).length;
}

export function strikeOutcome(activeCount: number): StrikeOutcome | null {
  if (activeCount <= 0) return null;
  return (['warning', 'mute_24h', 'ban_7d', 'removed'] as const)[Math.min(activeCount, 4) - 1] ?? null;
}

// ---------- Mod votes: two matching decide, a split goes to ops ----------
export type OpsModVote = 'remove' | 'keep';
export function modVerdict(votes: readonly OpsModVote[]): OpsModVote | 'escalate' | 'pending' {
  const r = votes.filter((v) => v === 'remove').length;
  const k = votes.length - r;
  if (r >= 2) return 'remove';
  if (k >= 2) return 'keep';
  return r >= 1 && k >= 1 ? 'escalate' : 'pending';
}

// ---------- Ops: campus wave gate (wave 3) ----------
export type Wave3GateInput = {
  day7RetentionPct: number;
  weeklyActives: number;
  legalSignoff: boolean;
  caSignoff: boolean;
  /** Set by the owner. null means not decided yet, which keeps the gate closed. */
  minDay7RetentionPct: number | null;
  minWeeklyActives: number | null;
};
export type Wave3GateCheck = { key: 'retention' | 'actives' | 'legal' | 'ca'; ok: boolean; note?: string };

export function wave3Gate(i: Wave3GateInput): { open: boolean; checks: Wave3GateCheck[] } {
  const checks: Wave3GateCheck[] = [
    i.minDay7RetentionPct === null
      ? { key: 'retention', ok: false, note: 'Threshold not set by the owner' }
      : { key: 'retention', ok: i.day7RetentionPct >= i.minDay7RetentionPct },
    i.minWeeklyActives === null
      ? { key: 'actives', ok: false, note: 'Threshold not set by the owner' }
      : { key: 'actives', ok: i.weeklyActives >= i.minWeeklyActives },
    { key: 'legal', ok: i.legalSignoff },
    { key: 'ca', ok: i.caSignoff },
  ];
  return { open: checks.every((c) => c.ok), checks };
}

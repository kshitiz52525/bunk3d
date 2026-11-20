import type { StaffRole } from '@bunk3d/core';

// Console staff sign-in. Two steps: email + password, then a 6-digit code sent to the email.
// Backend phase: Supabase Auth (password + email OTP, with MFA required for finance and ops roles).

/** What a staff member is allowed to see: their own club, campus, brand or vendor. Never global unless ops or finance. */
export type StaffScope = { clubId?: string; campusId?: string; brandId?: string; vendorId?: string };

export type StaffIdentity = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  scope: StaffScope;
};

export type StaffChallenge = { challengeId: string; emailHint: string };

export type StaffSignInResult =
  | { ok: true; challenge: StaffChallenge }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'locked'; retryInMinutes: number };

export type StaffVerifyResult =
  | { ok: true; staff: StaffIdentity }
  | { ok: false; reason: 'wrong'; triesLeft: number }
  | { ok: false; reason: 'locked'; retryInMinutes: number }
  | { ok: false; reason: 'expired' };

export interface StaffApi {
  /** Public. Rate-limited per account and per IP server side. The error never says whether the email exists. */
  signIn(input: { email: string; password: string }): Promise<StaffSignInResult>;
  /** Public. 4 wrong codes lock the account for 10 minutes. A challenge lives 10 minutes. */
  verifyCode(input: { challengeId: string; code: string }): Promise<StaffVerifyResult>;
  /** Authenticated staff. Used to re-read the signed-in staff member's current role and scope. */
  getStaff(staffId: string): Promise<StaffIdentity | null>;
}

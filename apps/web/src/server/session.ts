// Signed, httpOnly staff session cookie. Web Crypto only, so it also runs in the proxy.
// Backend phase: replace with the Supabase session; keep the same SessionPayload shape for the UI.
import { SESSION_HOURS, isStaffRole, type StaffRole } from '@bunk3d/core';

export const SESSION_COOKIE = 'bunk3d_staff';

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: StaffRole;
  scope: { clubId?: string; campusId?: string; brandId?: string; vendorId?: string };
  iat: number;
  exp: number;
};

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.STAFF_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('STAFF_SESSION_SECRET (32+ characters) must be set in production');
  return 'dev-only-secret-change-me-dev-only-secret'; // development only
}

const b64 = (bytes: ArrayBuffer | Uint8Array) => {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(p: Omit<SessionPayload, 'iat' | 'exp'>, now = Date.now()): Promise<{ token: string; maxAgeSeconds: number }> {
  const maxAgeSeconds = SESSION_HOURS * 3600;
  const payload: SessionPayload = { ...p, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + maxAgeSeconds };
  const body = b64(enc.encode(JSON.stringify(payload)));
  const sig = b64(await crypto.subtle.sign('HMAC', await key(), enc.encode(body)));
  return { token: `${body}.${sig}`, maxAgeSeconds };
}

export async function verifySession(token: string | undefined, now = Date.now()): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), unb64(sig) as BufferSource, enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64(body))) as SessionPayload;
    if (!isStaffRole(p.role) || typeof p.sub !== 'string' || p.exp * 1000 < now) return null;
    return p;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: maxAgeSeconds,
});

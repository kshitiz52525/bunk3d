import { homePath } from '@bunk3d/core';
import { cookieOptions, SESSION_COOKIE, signSession } from '@/server/session';
import { staffApi, sameOrigin } from '@/server/staff-api';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { challengeId?: unknown; code?: unknown } | null;
  if (!body || typeof body.challengeId !== 'string' || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    return Response.json({ ok: false, reason: 'wrong', triesLeft: 0 }, { status: 400 });
  }
  const r = await staffApi().verifyCode({ challengeId: body.challengeId, code: body.code });
  if (!r.ok) return Response.json(r, { status: r.reason === 'locked' ? 429 : 401, headers: { 'Cache-Control': 'no-store' } });
  const { token, maxAgeSeconds } = await signSession({ sub: r.staff.id, name: r.staff.name, email: r.staff.email, role: r.staff.role, scope: r.staff.scope });
  const res = Response.json({ ok: true, home: homePath(r.staff.role) }, { headers: { 'Cache-Control': 'no-store' } });
  res.headers.append('Set-Cookie', serialize(SESSION_COOKIE, token, cookieOptions(maxAgeSeconds)));
  return res;
}

function serialize(name: string, value: string, o: ReturnType<typeof cookieOptions>) {
  return `${name}=${value}; Path=${o.path}; Max-Age=${o.maxAge}; HttpOnly; SameSite=Lax${o.secure ? '; Secure' : ''}`;
}

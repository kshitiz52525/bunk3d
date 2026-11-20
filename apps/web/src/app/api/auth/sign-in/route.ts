import { staffApi, sameOrigin } from '@/server/staff-api';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 200 || body.password.length > 200) {
    return Response.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }
  const r = await staffApi().signIn({ email: body.email, password: body.password });
  return Response.json(r, { status: r.ok ? 200 : r.reason === 'locked' ? 429 : 401, headers: { 'Cache-Control': 'no-store' } });
}

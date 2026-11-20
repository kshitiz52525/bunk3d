import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/server/session';

/** Current staff session, verified server side. The UI reads this; it never decodes the cookie itself. */
export async function GET() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return Response.json({ staff: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ staff: { id: s.sub, name: s.name, email: s.email, role: s.role, scope: s.scope, expiresAt: s.exp * 1000 } }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse, type NextRequest } from 'next/server';
import { canAccess, consoleOfPath, homePath } from '@bunk3d/core';
import { SESSION_COOKIE, verifySession } from '@/server/session';

// Optimistic gate: no valid session -> /login; a signed-in role may only open its own console.
// Real enforcement is the data layer (RLS in the backend phase); this keeps the wrong console from rendering.
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL(homePath(session.role), req.url)) : NextResponse.next();
  }
  const target = consoleOfPath(pathname);
  if (!target) return NextResponse.next();
  if (!session) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (!canAccess(session.role, target)) return NextResponse.redirect(new URL(homePath(session.role), req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/crew-hq/:path*', '/college-hq/:path*', '/collab-hq/:path*', '/vendor/:path*', '/finance/:path*', '/ops/:path*'],
};

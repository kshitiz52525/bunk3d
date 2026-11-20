import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { homePath } from '@bunk3d/core';
import { SESSION_COOKIE, verifySession } from '@/server/session';

// There is no public landing page on the console site: go to your console, or sign in.
export default async function Home() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  redirect(s ? homePath(s.role) : '/login');
}

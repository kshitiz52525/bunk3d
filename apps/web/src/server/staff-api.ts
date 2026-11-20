// The server-side staff auth adapter. Frontend phase: the mock. Backend phase: the Supabase adapter.
import { createMockApi, type StaffApi } from '@bunk3d/api/server';

const g = globalThis as { __bunk3dStaffApi?: StaffApi };
export function staffApi(): StaffApi {
  // Cached on globalThis so dev hot reloads keep lockout counters and challenges.
  return (g.__bunk3dStaffApi ??= createMockApi({ latencyMs: 0 }).staff);
}

/** Same-origin check for state-changing requests (CSRF defence in depth; the cookie is also SameSite=Lax). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser callers
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}

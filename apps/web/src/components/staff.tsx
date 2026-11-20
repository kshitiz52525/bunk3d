'use client';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ROLE_LABELS, type StaffRole } from '@bunk3d/core';

export type Staff = { id: string; name: string; email: string; role: StaffRole; scope: { clubId?: string; campusId?: string; brandId?: string; vendorId?: string }; expiresAt: number };
type State = { status: 'loading' } | { status: 'out' } | { status: 'in'; staff: Staff };

const Ctx = createContext<{ state: State; signOut: () => Promise<void> } | null>(null);

/** Reads the server-verified session. A 401 (expired or cleared cookie) sends the user to sign in. */
export function StaffProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: 'loading' });
  // Fetch on first load, and again after navigation while not signed in (e.g. right after the sign-in form succeeds).
  const signedIn = state.status === 'in';
  useEffect(() => {
    if (signedIn) return;
    let live = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) { setState({ status: 'out' }); return; }
        const j = (await r.json()) as { staff: Staff };
        setState({ status: 'in', staff: j.staff });
      })
      .catch(() => live && setState({ status: 'out' }));
    return () => { live = false; };
  }, [pathname, signedIn]);
  // Expire in the browser at the moment the server-side session ends.
  useEffect(() => {
    if (state.status !== 'in') return;
    const ms = state.staff.expiresAt - Date.now();
    // Full page load so all in-memory state is dropped.
    const t = setTimeout(() => { window.location.replace('/login?expired=1'); }, Math.max(ms, 0));
    return () => clearTimeout(t);
  }, [state]);
  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {});
    window.location.replace('/login'); // full load: drops all in-memory state and cached pages
  }, []);
  return <Ctx.Provider value={{ state, signOut }}>{children}</Ctx.Provider>;
}

export function useStaffState() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStaff must be used inside <StaffProvider>');
  return c;
}

/** The signed-in staff member. Only call inside a console, where the proxy guarantees a session. */
export function useStaff(): Staff | null {
  const { state } = useStaffState();
  return state.status === 'in' ? state.staff : null;
}

/** Name, role and sign out, for the bottom of every console sidebar. */
export function AccountMenu() {
  const { state, signOut } = useStaffState();
  if (state.status !== 'in') return <div className="account" aria-busy="true"><span className="muted">Loading account</span></div>;
  const s = state.staff;
  return (
    <div className="account">
      <div className="who">
        <span className="avatar" aria-hidden>{s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
        <span><strong>{s.name}</strong><br /><span className="muted">{ROLE_LABELS[s.role]}</span></span>
      </div>
      <button type="button" className="btn ghost" onClick={signOut}>Sign out</button>
    </div>
  );
}

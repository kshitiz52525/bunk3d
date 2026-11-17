'use client';
import { useState } from 'react';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, Card, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../../_console/blocks';

// OP5 Roles
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsRoles(), []);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ person: '', role: '', scope: '' });
  const run = async (fn: () => Promise<unknown>, m: string) => {
    setBusy(true);
    try { await fn(); say(m); state.reload(); return true; } catch { say('Fill in person, role and scope.', true); return false; } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(rows) => (
        <>
          <Eyebrow>OP5</Eyebrow>
          <PageHead title="Roles" sub="Who holds which role, and where." actions={<><SeedTag /><Btn onClick={() => setOpen((o) => !o)}>+ Assign role</Btn></>} />
          {toast}
          {open ? <Card title="Assign role"><form className="form" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.opsAssignRole(f), 'Role assigned.')) { setF({ person: '', role: '', scope: '' }); setOpen(false); } }}>
            <label>Person<input value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} /></label>
            <label>Role<input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="e.g. Campus Mod" /></label>
            <label>Scope<input value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} placeholder="e.g. campus: name" /></label>
            <div className="row"><Btn type="submit" disabled={busy || !online}>Assign</Btn><Btn kind="ghost" onClick={() => setOpen(false)}>Cancel</Btn></div>
          </form></Card> : null}
          <div style={{ marginTop: 16 }}><Table head={['PERSON', 'ROLE', 'SCOPE', 'GRANTED BY', 'ACTION']} empty={<><strong className="display">No roles assigned.</strong><Btn onClick={() => setOpen(true)}>+ Assign role</Btn></>}
            rows={rows.map((r) => [r.person, r.role, r.scope, r.grantedBy, <Btn key="a" kind="ghost" disabled={busy || !online} onClick={() => run(() => api.opsRevokeRole(r.id), 'Role revoked.')}>Revoke</Btn>])} /></div>
        </>
      )}
    </Async>
  );
}

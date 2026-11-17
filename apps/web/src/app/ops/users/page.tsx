'use client';
import { useState } from 'react';
import { OPS_STRIKE_EXPIRY_DAYS } from '@bunk3d/core';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../../_console/blocks';

const outcome = { warning: 'Next: warning', mute_24h: 'Next: 24h mute', ban_7d: 'Next: 7-day ban', removed: 'Removed' } as const;

// OP3 Users and strikes
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsUsers(), []);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, m: string) => {
    setBusy(true);
    try { await fn(); say(m); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(users) => (
        <>
          <Eyebrow>OP3</Eyebrow>
          <PageHead title="Users & strikes" sub={`1 = warning, 2 = 24h mute, 3 = 7-day ban, 4 = removed. Strikes expire after ${OPS_STRIKE_EXPIRY_DAYS} days.`} actions={<SeedTag />} />
          {toast}
          <Table head={['USER', 'CAMPUS', `STRIKES (${OPS_STRIKE_EXPIRY_DAYS} D)`, 'STATUS', 'ACTIONS']} empty={<><strong className="display">No users flagged.</strong><p className="muted">Users with strikes show up here.</p></>}
            rows={users.map((u) => [u.handle, u.campus, `${u.activeStrikes}${u.outcome ? ` · ${outcome[u.outcome]}` : ''}`, u.status,
              <span key="a" className="row">
                <Btn kind="ghost" disabled={busy || !online} onClick={() => run(() => api.opsAddStrike(u.id), `Strike added to ${u.handle}.`)}>Add strike</Btn>
                <Btn kind="ghost" disabled={busy || !online} onClick={() => run(() => api.opsLiftMute(u.id), `Mute lifted for ${u.handle}.`)}>Lift mute</Btn>
                <Btn kind="danger" disabled={busy || !online} onClick={() => run(() => api.opsPermanentBan(u.id), `${u.handle} permanently banned.`)}>Permanent ban</Btn>
              </span>])} />
        </>
      )}
    </Async>
  );
}

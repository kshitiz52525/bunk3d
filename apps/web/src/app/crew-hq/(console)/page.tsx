'use client';
import Link from 'next/link';
import { useState } from 'react';
import { formatPaise } from '@bunk3d/core';
import { useApi, useAsync } from '@bunk3d/api';
import { PageHead } from '@/components/kit';
import { Async, Eyebrow, Kpis, TableDetail, useToast, useOnline } from '../../_console/blocks';
import { useClub } from '../_components/club';

// CH1 Dashboard
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewDashboard(club.id), [club.id]);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Async state={state}>
      {(d) => (
        <>
          <Eyebrow>CH1 · WAVE 1</Eyebrow>
          <PageHead title={`${club.name} at a glance`} sub="Everything that needs a lead today. Fund balance appears once your campus reaches wave 3." actions={<Link className="linkbtn" href="/crew-hq/events/new">+ New event</Link>} />
          {toast}
          <Kpis items={[
            { label: 'MEMBERS', value: String(d.members), sub: 'verified students' },
            { label: 'JOIN REQUESTS', value: String(d.joinRequests), sub: `oldest ${d.oldestRequestDays} days` },
            { label: 'OPEN TASKS', value: String(d.openTasks), sub: 'not done yet' },
            { label: 'CLUB FUND', value: d.fundBalancePaise === null ? 'Wave 3' : formatPaise(d.fundBalancePaise), sub: d.fundBalancePaise === null ? 'appears when your campus reaches wave 3' : 'view only · Finance releases' },
          ]} />
          <TableDetail cols={['ALERT', 'WHAT', 'WHEN', 'ACTION']} rows={d.alerts} busy={busy || !online}
            emptyNode={<div className="empty"><strong className="display">Nothing needs you today.</strong><p className="muted">Create an event to get started.</p><Link className="linkbtn" href="/crew-hq/events/new">+ New event</Link></div>}
            onAction={async (r, a) => {
              setBusy(true);
              try { say((await api.crewRunAction(club.id, r.id, a)).message); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
            }} />
        </>
      )}
    </Async>
  );
}

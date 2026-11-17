'use client';
import Link from 'next/link';
import { useState } from 'react';
import { formatPaise } from '@bunk3d/core';
import { useApi, useAsync } from '@bunk3d/api';
import { Badge, Btn, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, Kpis, useToast, useOnline } from '../../../_console/blocks';
import { useClub } from '../../_components/club';

const fmt = (ms: number) => new Date(ms).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const collegeTone = { pending: 'warn', approved: 'ok', not_needed: 'muted', not_requested: 'muted' } as const;
const collegeLabel = { pending: 'Pending', approved: 'Approved', not_needed: 'Not needed', not_requested: 'Not requested' } as const;

// CH4 Events
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewEvents(club.id), [club.id]);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const publish = async (id: string) => {
    setBusy(true);
    try { say((await api.crewPublishResults(club.id, id)).message); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(v) => (
        <>
          <Eyebrow>CH4 · WAVE 1</Eyebrow>
          <PageHead title="Events" sub="Create, take registrations, manage teams, publish results and certificates. Paid events need wave 3." actions={<Link className="linkbtn" href="/crew-hq/events/new">+ Create event</Link>} />
          {toast}
          <Kpis items={[{ label: 'UPCOMING', value: String(v.upcoming), sub: '' }, { label: 'REGISTERED', value: String(v.registered), sub: 'across events' }, { label: 'WAITLIST', value: String(v.waitlist), sub: '' }]} />
          <Table head={['EVENT', 'DATE', 'TYPE', 'REGISTERED', 'COLLEGE OK', 'RESULTS']} empty={<><strong className="display">No events yet.</strong><p className="muted">Create your first one.</p><Link className="linkbtn" href="/crew-hq/events/new">+ Create event</Link></>}
            rows={v.events.map((e) => [
              <b key="t">{e.title}</b>, fmt(e.startsAtMs),
              e.ticketType === 'paid' && e.pricing ? `Paid · ${formatPaise(e.pricing.pricePaise)}` : 'Free',
              `${e.registered} / ${e.capacity}`,
              <Badge key="c" tone={collegeTone[e.collegeOk]}>{collegeLabel[e.collegeOk]}</Badge>,
              e.status === 'results_published' ? <Badge key="r" tone="ok">Published</Badge> : <Btn key="r" kind="ghost" disabled={busy || !online} onClick={() => publish(e.id)}>Publish results</Btn>,
            ])} />
        </>
      )}
    </Async>
  );
}

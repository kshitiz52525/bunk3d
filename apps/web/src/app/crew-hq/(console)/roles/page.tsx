'use client';
import { useState } from 'react';
import { useApi, useAsync } from '@bunk3d/api';
import { Card, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, Kpis, useToast, useOnline } from '../../../_console/blocks';
import { useClub } from '../../_components/club';

const label = { yes: 'Yes', no: 'No', view: 'View' } as const;

// CH3 Roles and permissions
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewRoles(club.id), [club.id]);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const set = async (pid: string, who: 'coordinator' | 'member', v: 'yes' | 'no' | 'view') => {
    setBusy(true);
    try { say((await api.crewSetPermission(club.id, pid, who, v)).message); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(r) => (
        <>
          <Eyebrow>CH3 · WAVE 1</Eyebrow>
          <PageHead title="Roles & permissions" sub="Lead, coordinator, member. Handing over admin needs college verification from wave 4." />
          {toast}
          <Kpis items={[{ label: 'LEADS', value: String(r.leads), sub: `max ${r.maxLeads}` }, { label: 'COORDINATORS', value: String(r.coordinators), sub: '' }, { label: 'MEMBERS', value: String(r.members), sub: '' }, { label: 'HANDOVER', value: r.handoverEnabled ? 'Available' : 'Wave 4', sub: 'needs college verification' }]} />
          <Table head={['PERMISSION', 'LEAD', 'COORDINATOR', 'MEMBER', 'NOTE']} rows={r.permissions.map((p) => [
            <b key="l">{p.label}</b>, label[p.lead],
            <select key="c" aria-label={`${p.label}, coordinator`} value={p.coordinator} disabled={busy || !online || p.id === 'p5'} onChange={(e) => set(p.id, 'coordinator', e.target.value as 'yes')}><option value="yes">Yes</option><option value="view">View</option><option value="no">No</option></select>,
            <select key="m" aria-label={`${p.label}, member`} value={p.member} disabled={busy || !online || p.id === 'p5'} onChange={(e) => set(p.id, 'member', e.target.value as 'yes')}><option value="yes">Yes</option><option value="view">View</option><option value="no">No</option></select>,
            <span key="n" className="muted">{p.note}</span>,
          ])} />
          <div style={{ marginTop: 16 }}><Card title="Admin handover"><p className="muted" style={{ margin: 0 }}>The new lead is only active once the college confirms them. Available from wave 4.</p></Card></div>
        </>
      )}
    </Async>
  );
}

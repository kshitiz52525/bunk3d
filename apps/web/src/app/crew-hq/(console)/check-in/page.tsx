'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApi, useAsync, type ScanResultKind } from '@bunk3d/api';
import { Badge, Empty, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, Kpis } from '../../../_console/blocks';
import { useClub } from '../../_components/club';

const R: Record<ScanResultKind, [string, 'ok' | 'warn' | 'err']> = { checked_in: ['Valid', 'ok'], already_used: ['Already used', 'warn'], wrong_event: ['Wrong event', 'err'], not_registered: ['Not registered', 'err'] };
const time = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// CH5 Check-in scanner (console side). The scanner itself is a phone page at /crew-hq/scanner.
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const events = useAsync(() => api.crewEvents(club.id), [club.id]);
  const router = useRouter();
  const [pick, setPick] = useState<string | null>(null);
  return (
    <Async state={events}>
      {({ events: list }) => {
        const ev = list.find((e) => e.id === pick) ?? list[0];
        if (!ev) return <Empty title="No events to check in." body="Create an event first." action={{ label: 'Create event', onClick: () => router.push('/crew-hq/events/new') }} />;
        return <CheckIn clubId={club.id} eventId={ev.id} list={list.map((e) => ({ id: e.id, title: e.title }))} onPick={setPick} />;
      }}
    </Async>
  );
}

function CheckIn({ clubId, eventId, list, onPick }: { clubId: string; eventId: string; list: { id: string; title: string }[]; onPick: (id: string) => void }) {
  const api = useApi().console;
  const state = useAsync(() => api.crewCheckIn(clubId, eventId), [clubId, eventId]);
  return (
    <>
      <Eyebrow>CH5 · WAVE 1</Eyebrow>
      <PageHead title="Check-in scanner" sub="Opens on a phone browser with the camera. Green or red result, live count, works offline and syncs later."
        actions={<Link className="linkbtn" href={`/crew-hq/scanner?event=${encodeURIComponent(eventId)}`}>Open on my phone</Link>} />
      <label className="lbl" style={{ display: 'grid', gap: 6, marginBottom: 16, maxWidth: 360 }}>Event
        <select value={eventId} onChange={(e) => onPick(e.target.value)}>{list.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <Async state={state}>
        {(v) => (
          <>
            <Kpis items={[{ label: 'CHECKED IN', value: String(v.checkedIn), sub: `of ${v.registered}` }, { label: 'REJECTED', value: String(v.rejected), sub: 'wrong event / used / not registered' }, { label: 'OFFLINE QUEUE', value: String(v.offlineQueue), sub: 'held on each phone until it syncs' }, { label: 'SCANNERS', value: String(v.scanners), sub: 'volunteers' }]} />
            <Table head={['TIME', 'NAME', 'TICKET', 'RESULT', 'SCANNER']} empty={<><strong className="display">No scans yet.</strong><p className="muted">Open the scanner on a phone at the door.</p><Link className="linkbtn" href={`/crew-hq/scanner?event=${encodeURIComponent(eventId)}`}>Open on my phone</Link></>}
              rows={v.log.map((l) => [time(l.atMs), l.holder ?? '-', l.ticketId, <Badge key="r" tone={R[l.result][1]}>{R[l.result][0]}</Badge>, l.scannerName])} />
          </>
        )}
      </Async>
    </>
  );
}

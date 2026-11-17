'use client';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { decideScan, verifyQr } from '@bunk3d/core';
import { useApi, type ScanInput, type ScannerRoster, type ScanResultKind } from '@bunk3d/api';
import { Btn, Empty, ErrorBox, Loading } from '@/components/kit';
import { useOnline } from '../../_console/blocks';

// CH5 / E5: phone-browser scanner. Verifies against a downloaded roster, so it works offline; scans queue locally and sync later.
const SCANNER_ID = 'This phone';
const key = (e: string, k: string) => `bunk3d.scanner.${e}.${k}`;
const read = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb; } catch { return fb; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: still works in memory */ } };

const UI: Record<ScanResultKind, { title: string; cls: string; icon: string }> = {
  checked_in: { title: 'Checked in', cls: 'ok', icon: 'OK' },
  already_used: { title: 'Already used', cls: 'warn', icon: '!' },
  wrong_event: { title: 'Wrong event', cls: 'bad', icon: 'X' },
  not_registered: { title: 'Not registered', cls: 'bad', icon: 'X' },
};
type Shown = { kind: ScanResultKind; sub: string } | null;

function Scanner() {
  const api = useApi().console;
  const online = useOnline();
  const eventId = useSearchParams().get('event');
  const [roster, setRoster] = useState<ScannerRoster | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready' | 'norost'>('loading');
  const [queue, setQueue] = useState<ScanInput[]>([]);
  const [used, setUsed] = useState<Record<string, number>>({});
  const [shown, setShown] = useState<Shown>(null);
  const [code, setCode] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<'off' | 'on' | 'unavailable'>('off');

  const load = useCallback(async () => {
    if (!eventId) return;
    const cached = read<ScannerRoster | null>(key(eventId, 'roster'), null);
    const q = read<ScanInput[]>(key(eventId, 'queue'), []);
    const u = read<Record<string, number>>(key(eventId, 'used'), {});
    let next: ScannerRoster | null = cached;
    let st: 'ready' | 'error' | 'norost' = cached ? 'ready' : navigator.onLine ? 'error' : 'norost';
    try {
      if (!navigator.onLine) throw new Error('offline');
      next = await api.scannerRoster(eventId);
      write(key(eventId, 'roster'), next);
      st = 'ready';
    } catch { /* keep cached roster if any */ }
    setQueue(q); setUsed(u); setRoster(next); setStatus(st);
  }, [api, eventId]);
  const retry = () => { setStatus('loading'); void load(); };
  // Initial roster load from the API or the offline cache.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // Sync queued scans whenever we are online.
  useEffect(() => {
    if (!eventId || !online || !queue.length || status !== 'ready') return;
    let live = true;
    api.scannerSync(eventId, queue).then((r) => {
      if (!live) return;
      setQueue([]); write(key(eventId, 'queue'), []);
      setSyncMsg(`Synced ${r.accepted} check-in${r.accepted === 1 ? '' : 's'}${r.duplicates ? `, ${r.duplicates} repeat` : ''}.`);
    }, () => live && setSyncMsg('Sync failed. It will retry.'));
    return () => { live = false; };
  }, [api, eventId, online, queue, status]);

  const handle = useCallback((raw: string) => {
    if (!roster || !eventId) return;
    const now = Date.now();
    const q = verifyQr(raw, (id) => roster.tickets.find((t) => t.ticketId === id)?.secret, now, roster.qrPeriodMs);
    const t = roster.tickets.find((x) => x.ticketId === q.ticketId);
    const before = t?.checkedInAtMs ?? used[t?.ticketId ?? ''];
    const kind = decideScan({ eventId, qrValid: q.valid, ticket: t && { ticketId: t.ticketId, eventId: t.eventId }, alreadyCheckedIn: before != null });
    if (kind === 'checked_in' && t) {
      const nu = { ...used, [t.ticketId]: now }; const nq = [...queue, { ticketId: t.ticketId, scannedAtMs: now, scannerId: SCANNER_ID }];
      setUsed(nu); setQueue(nq); write(key(eventId, 'used'), nu); write(key(eventId, 'queue'), nq);
    }
    const sub = {
      checked_in: t?.holder ?? '',
      already_used: `Scanned at ${new Date(before ?? now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`,
      wrong_event: `This ticket is for ${t?.eventTitle ?? 'another event'}`,
      not_registered: 'Old or screenshot code. Ask them to reopen the ticket.',
    }[kind];
    setShown({ kind, sub });
    setCode('');
  }, [roster, eventId, used, queue]);

  // Camera + BarcodeDetector where the browser has them; otherwise typed entry stays available.
  useEffect(() => {
    if (camera !== 'on') return;
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) return;
    let stream: MediaStream | null = null; let stop = false; let last = '';
    const det = new BD({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(async (s) => {
      stream = s;
      const v = videoRef.current; if (!v) return;
      v.srcObject = s; await v.play();
      const tick = async () => {
        if (stop) return;
        try { const r = await det.detect(v); const val = r[0]?.rawValue; if (val && val !== last) { last = val; handle(val); setTimeout(() => { last = ''; }, 2500); } } catch { /* frame not ready */ }
        setTimeout(tick, 250);
      };
      void tick();
    }, () => setCamera('unavailable'));
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [camera, handle]);

  if (!eventId) return <div className="scan"><Empty title="No event chosen." body="Open the scanner from Check-in scanner in Crew HQ." /><Link className="linkbtn" href="/crew-hq/check-in">Back to Crew HQ</Link></div>;
  if (status === 'loading') return <div className="scan"><Loading /></div>;
  if (status === 'error') return <div className="scan"><ErrorBox onRetry={retry} /></div>;
  if (status === 'norost' || !roster) return <div className="scan"><Empty title="You are offline." body="Connect once to download the check-in list. After that the scanner works without a signal." action={{ label: 'Try again', onClick: retry }} /></div>;

  const inCount = roster.tickets.filter((t) => t.eventId === eventId && (t.checkedInAtMs != null || used[t.ticketId] != null)).length;
  const r = shown ? UI[shown.kind] : null;
  return (
    <main className="scan">
      <header>
        <Link href="/crew-hq/check-in" className="chip" aria-label="Close scanner" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Close</Link>
        <div style={{ flex: 1 }}><b>{roster.event.title}</b><div className="muted">Check-in · {roster.event.door}</div></div>
        <div><div className="count mono">{inCount}</div><div className="label" style={{ textAlign: 'right' }}>/ {roster.totalRegistered} in</div></div>
      </header>
      <div className="viewfinder">
        {camera === 'on' ? <video ref={videoRef} muted playsInline aria-label="Camera" /> : (
          <div style={{ textAlign: 'center', padding: 16 }}>
            {camera === 'unavailable' ? <p className="muted">Camera is not available here. Type the ticket code below.</p> : <p className="muted">Point the camera at the ticket QR.</p>}
            {camera !== 'unavailable' ? <Btn onClick={() => setCamera('BarcodeDetector' in window && !!navigator.mediaDevices ? 'on' : 'unavailable')}>Start camera</Btn> : null}
          </div>
        )}
      </div>
      <div className={`result ${r ? r.cls : 'idle'}`} role="status" aria-live="assertive">
        <span className="ic" aria-hidden="true">{r ? r.icon : '...'}</span>
        <div><div className="display" style={{ fontSize: 20 }}>{r ? r.title : 'Ready to scan'}</div><div>{shown ? shown.sub : 'Codes change about every minute, so screenshots fail.'}</div></div>
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) handle(code); }}>
        <input aria-label="Ticket code" placeholder="Type or paste the ticket code" value={code} onChange={(e) => setCode(e.target.value)} style={{ flex: 1 }} />
        <Btn type="submit">Check</Btn>
      </form>
      <div className="row">
        <span className={online ? 'pill' : 'pill off'} role="status">{online ? (queue.length ? `Syncing ${queue.length}` : 'Online · synced') : `Offline · ${queue.length} to sync`}</span>
        {syncMsg ? <span className="muted" role="status">{syncMsg}</span> : null}
      </div>
    </main>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="scan"><Loading /></div>}><Scanner /></Suspense>;
}

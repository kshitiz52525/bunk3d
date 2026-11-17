'use client';
import { useState } from 'react';
import { useApi, useAsync, type GateCheckKey, type OpsCampus } from '@bunk3d/api';
import { Badge, Btn, Card, Empty, PageHead } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../../_console/blocks';

const NAMES: Record<GateCheckKey, string> = { retention: 'Day-7 retention', actives: 'Weekly actives', legal: 'Legal sign-off', ca: 'CA sign-off' };

// OP4 Campuses, waves and flags. Wave 3 gate: day-7 retention, weekly actives, legal and CA sign-off.
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsCampuses(), []);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, m?: string) => {
    setBusy(true);
    try { const r = (await fn()) as { ok?: boolean; reason?: string } | undefined; if (r && r.ok === false) say(r.reason ?? 'Not allowed.', true); else if (m) say(m); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  const value = (c: OpsCampus, k: GateCheckKey) => k === 'retention' ? `${c.gate.day7RetentionPct}%${c.gate.minDay7RetentionPct === null ? '' : ` (needs ${c.gate.minDay7RetentionPct}%)`}`
    : k === 'actives' ? `${c.gate.weeklyActives.toLocaleString('en-IN')}${c.gate.minWeeklyActives === null ? '' : ` (needs ${c.gate.minWeeklyActives.toLocaleString('en-IN')})`}`
    : (k === 'legal' ? c.gate.legalSignoff : c.gate.caSignoff) ? 'Signed off' : 'Waiting';
  return (
    <Async state={state}>
      {(cs) => (
        <>
          <Eyebrow>OP4</Eyebrow>
          <PageHead title="Campuses, waves & flags" sub="Wave 3 (The Hustle and money) opens only when every gate check passes." actions={<SeedTag />} />
          {toast}
          {!cs.length ? <Empty title="No campuses yet." body="Campuses appear here once they are added." /> : (
            <div className="campus">
              {cs.map((c) => (
                <Card key={c.id}>
                  <h2 style={{ fontSize: 18 }}>{c.name}</h2>
                  <div className="muted">{c.status} · {c.domain ?? 'ID upload only'} · {c.verified.toLocaleString('en-IN')} verified</div>
                  <div className="wavechips">{([1, 2, 3, 4] as const).map((w) => <Badge key={w} tone={c.waves[w] ? 'ok' : 'muted'}>{`Wave ${w} ${c.waves[w] ? 'on' : 'off'}`}</Badge>)}</div>
                  <ul className="gate" aria-label={`${c.name} wave 3 gate`}>
                    {c.gateResult.checks.map((g) => <li key={g.key}><span>{NAMES[g.key]}</span><span className={g.ok ? 't-ok' : 't-warn'}>{value(c, g.key)}{g.note ? ` · ${g.note}` : ''}{g.ok ? ' · met' : ''}</span></li>)}
                  </ul>
                  <div className="note">Campus Mods: {c.mods.have} / {c.mods.of} · Notice account: {c.noticeAccount} · Seeded notes: {c.seededNotes}</div>
                  <div className="actions">
                    <Btn kind="ghost" disabled={busy || !online} onClick={() => run(() => api.opsSetSignoff(c.id, 'legal', !c.gate.legalSignoff), 'Legal sign-off updated.')}>{c.gate.legalSignoff ? 'Remove legal sign-off' : 'Record legal sign-off'}</Btn>
                    <Btn kind="ghost" disabled={busy || !online} onClick={() => run(() => api.opsSetSignoff(c.id, 'ca', !c.gate.caSignoff), 'CA sign-off updated.')}>{c.gate.caSignoff ? 'Remove CA sign-off' : 'Record CA sign-off'}</Btn>
                    <Btn disabled={busy || !online} onClick={() => run(() => api.opsSetWave(c.id, 3, !c.waves[3]), c.waves[3] ? 'Wave 3 turned off.' : 'Wave 3 turned on.')}>{c.waves[3] ? 'Turn wave 3 off' : 'Turn wave 3 on'}</Btn>
                    <Btn kind="ghost" disabled={busy || !online} onClick={() => run(() => api.opsAssignCampusMod(c.id), 'Campus Mod assigned.')}>Assign Campus Mod</Btn>
                  </div>
                  {!c.gateResult.open && !c.waves[3] ? <div className="note">Wave 3 stays closed until every check above is met.</div> : null}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Async>
  );
}

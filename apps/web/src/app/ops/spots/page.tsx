'use client';
import { useState } from 'react';
import { useApi, useAsync, type RadarSpot } from '@bunk3d/api';
import { Btn, Card, PageHead } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../../_console/blocks';

type Draft = Omit<RadarSpot, 'seed' | 'id'> & { id?: string };
const blank: Draft = { name: '', category: '', hours: '', crowdOverride: 'Auto (check-ins)', photos: 0 };

// OP6 Radar spots
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsSpots(), []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Async state={state}>
      {(spots) => {
        const cur = draft ?? (spots[0] ? { ...spots[0] } : null);
        return (
          <>
            <Eyebrow>OP6</Eyebrow>
            <PageHead title="Radar spots" sub="Crowd shows how recently it was updated. No student location is ever stored." actions={<><SeedTag /><Btn onClick={() => setDraft({ ...blank })}>+ Drop a new spot</Btn></>} />
            {toast}
            <div className="split">
              <Card title="Spots"><div className="actions" style={{ marginTop: 0 }}>
                {spots.length === 0 ? <p className="muted">No spots yet. Drop the first one.</p> : spots.map((s) => <button key={s.id} type="button" className="chip" aria-pressed={cur?.id === s.id} onClick={() => setDraft({ ...s })}>{s.name}</button>)}
              </div></Card>
              {cur ? (
                <Card title={cur.id ? cur.name : 'New spot'}><form className="form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await api.opsSaveSpot(cur); say('Spot saved.'); setDraft(null); state.reload(); } catch { say('Add a name to save the spot.', true); } finally { setBusy(false); } }}>
                  <label>Name<input value={cur.name} onChange={(e) => setDraft({ ...cur, name: e.target.value })} /></label>
                  <label>Category<input value={cur.category} onChange={(e) => setDraft({ ...cur, category: e.target.value })} /></label>
                  <label>Hours<input value={cur.hours} onChange={(e) => setDraft({ ...cur, hours: e.target.value })} /></label>
                  <label>Crowd override<select value={cur.crowdOverride} onChange={(e) => setDraft({ ...cur, crowdOverride: e.target.value })}><option>Auto (check-ins)</option><option>Quiet</option><option>Busy</option></select></label>
                  <div className="note">Photos: {cur.photos} uploaded</div>
                  <div><Btn type="submit" disabled={busy || !online}>Save spot</Btn></div>
                </form></Card>
              ) : null}
            </div>
          </>
        );
      }}
    </Async>
  );
}

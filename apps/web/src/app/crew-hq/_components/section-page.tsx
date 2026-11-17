'use client';
import { useState } from 'react';
import { useApi, useAsync, type CrewSectionId } from '@bunk3d/api';
import { PageHead, Btn } from '@/components/kit';
import { Async, Eyebrow, Kpis, TableDetail, useToast, useOnline } from '../../_console/blocks';
import { useClub } from './club';

/** CH8-CH12: same layout, different section. */
export function SectionPage({ id }: { id: CrewSectionId }) {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewSection(club.id, id), [club.id, id]);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (rowId: string, action: string) => {
    setBusy(true);
    try { say((await api.crewRunAction(club.id, rowId, action)).message); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(s) => (
        <>
          <Eyebrow>{s.code} · WAVE {s.wave}</Eyebrow>
          <PageHead title={s.title} sub={s.description} actions={<Btn disabled={s.locked || !online || busy} onClick={() => run(s.id, s.primary)}>{s.primary}</Btn>} />
          {s.locked ? <div className="banner lock" role="status">{s.lockMessage}</div> : null}
          {toast}
          <Kpis items={s.kpis} />
          <TableDetail cols={s.cols} rows={s.rows} busy={s.locked || !online || busy} onAction={(r, a) => run(r.id, a)} />
        </>
      )}
    </Async>
  );
}

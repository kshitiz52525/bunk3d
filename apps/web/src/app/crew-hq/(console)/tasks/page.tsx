'use client';
import { useState } from 'react';
import { formatPaise } from '@bunk3d/core';
import { useApi, useAsync, type CrewHqTaskStatus } from '@bunk3d/api';
import { Btn, Empty, PageHead } from '@/components/kit';
import { Async, Eyebrow, Kpis, useToast, useOnline } from '../../../_console/blocks';
import { useClub } from '../../_components/club';

const COLS: { id: CrewHqTaskStatus; name: string }[] = [{ id: 'todo', name: 'To do' }, { id: 'in_progress', name: 'In progress' }, { id: 'review', name: 'Review' }, { id: 'done', name: 'Done' }];

// CH6 Tasks board
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewTasks(club.id), [club.id]);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const move = async (id: string, to: CrewHqTaskStatus) => {
    setBusy(true);
    try { await api.crewMoveTask(club.id, id, to); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(v) => (
        <>
          <Eyebrow>CH6 · WAVE 1</Eyebrow>
          <PageHead title="Tasks board" sub="Kanban for club work. Add XP or pay. Publish as gig opens a task to the whole campus." />
          {toast}
          <Kpis items={[{ label: 'OPEN', value: String(v.open), sub: '' }, { label: 'IN REVIEW', value: String(v.inReview), sub: '' }, { label: 'PAID TASKS', value: String(v.paid), sub: `${formatPaise(v.committedPaise)} committed` }, { label: 'DONE', value: String(v.doneThisMonth), sub: '' }]} />
          {!v.tasks.length ? <Empty title="No tasks yet." body="Add the first piece of club work." action={{ label: '+ New task', onClick: () => say('Task drafts open once the crew slice is connected.') }} /> : (
            <div className="kanban">
              {COLS.map((c, ci) => {
                const items = v.tasks.filter((t) => t.status === c.id);
                const next = COLS[ci + 1];
                return (
                  <section key={c.id} className="kancol" aria-label={c.name}>
                    <h2><span>{c.name.toUpperCase()}</span><span>{items.length}</span></h2>
                    {items.map((t) => (
                      <div key={t.id} className="kcard">
                        <b>{t.title}</b><span className="meta">{t.meta}</span><span className={t.paid ? 'badge ok' : 'badge'} style={{ justifySelf: 'start' }}>{t.tag}</span>
                        {next ? <Btn kind="ghost" disabled={busy || !online} onClick={() => move(t.id, next.id)}>{`Move to ${next.name}`}</Btn> : null}
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </Async>
  );
}

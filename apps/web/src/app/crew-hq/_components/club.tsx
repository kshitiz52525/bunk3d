'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useApi, useAsync, type CrewClub } from '@bunk3d/api';
import { Async, OfflineBar, SeedTag } from '../../_console/blocks';

const ClubCtx = createContext<CrewClub | null>(null);
export const useClub = (): CrewClub => {
  const c = useContext(ClubCtx);
  if (!c) throw new Error('useClub outside ClubProvider');
  return c;
};

/** Loads the clubs this lead manages and scopes every page to the chosen one. */
export function ClubProvider({ children }: { children: ReactNode }) {
  const api = useApi().console;
  const clubs = useAsync(() => api.crewClubs(), []);
  const [pick, setPick] = useState<string | null>(null);
  return (
    <>
      <OfflineBar />
      <Async state={clubs}>
        {(list) => {
          const club = list.find((c) => c.id === pick) ?? list[0];
          if (!club) return <div className="empty"><strong className="display">No club yet.</strong><p className="muted">Ask a lead to add you as a coordinator.</p></div>;
          return (
            <ClubCtx.Provider value={club}>
              <div className="clubbar">
                <label>Club <select aria-label="Club" value={club.id} onChange={(e) => setPick(e.target.value)}>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <span>{club.campus} · wave {club.wave}</span><span>{club.leadName} · lead</span><SeedTag />
              </div>
              {children}
            </ClubCtx.Provider>
          );
        }}
      </Async>
    </>
  );
}

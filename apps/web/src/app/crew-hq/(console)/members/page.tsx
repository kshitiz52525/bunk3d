'use client';
import { useState } from 'react';
import { useApi, useAsync, type CrewMember, type CrewHqRole } from '@bunk3d/api';
import { Btn, Card, Empty, PageHead } from '@/components/kit';
import { Async, Eyebrow, Kpis, useToast, useOnline } from '../../../_console/blocks';
import { useClub } from '../../_components/club';

const ROLES: CrewHqRole[] = ['lead', 'coordinator', 'member'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// CH2 Members and join requests (C3 Club admin)
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewMembers(club.id), [club.id]);
  const [sel, setSel] = useState<string | null>(null);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true);
    try { say((await fn()).message); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); say('Invite link copied.'); } catch { say('Could not copy. Select the link and copy it.', true); }
  };
  return (
    <Async state={state}>
      {({ members, inviteLink }) => {
        const pending = members.filter((m) => m.status === 'requested');
        const cur: CrewMember | undefined = members.find((m) => m.id === sel) ?? members[0];
        return (
          <>
            <Eyebrow>CH2 · WAVE 1</Eyebrow>
            <PageHead title="Members & join requests" sub="Approve or decline requests, remove members, invite by link." actions={inviteLink ? <Btn disabled={!online} onClick={() => copy(inviteLink.url)}>Copy invite link</Btn> : null} />
            {toast}
            <Kpis items={[
              { label: 'MEMBERS', value: String(members.filter((m) => m.status === 'active').length), sub: 'verified students' },
              { label: 'PENDING', value: String(pending.length), sub: 'requests' },
              { label: 'INVITE LINK', value: inviteLink ? 'Active' : 'Off', sub: inviteLink ? `expires in ${inviteLink.expiresInDays} days` : '' },
            ]} />
            {!members.length || !cur ? (
              <Empty title="No members yet." body="Share your invite link to get people in." action={inviteLink ? { label: 'Copy invite link', onClick: () => copy(inviteLink.url) } : undefined} />
            ) : (
              <div className="split">
                <div className="tablewrap"><table>
                  <thead><tr><th>NAME</th><th>YEAR · BRANCH</th><th>ROLE</th><th>JOINED</th><th>STATUS</th></tr></thead>
                  <tbody>{members.map((m) => (
                    <tr key={m.id} className={m.id === cur.id ? 'sel' : ''}>
                      <td><button type="button" className="cellbtn" aria-pressed={m.id === cur.id} onClick={() => setSel(m.id)}>{m.name}</button></td>
                      <td>{m.year} · {m.branch}</td><td>{m.role ? cap(m.role) : '-'}</td><td>{m.joined ?? '-'}</td>
                      <td className={m.status === 'requested' ? 't-warn' : 't-ok'}>{m.status === 'requested' ? `Requested ${m.requestedDaysAgo ?? 0}d ago` : 'Active'}</td>
                    </tr>))}</tbody></table></div>
                <Card><div className="detail">
                  <h2>{cur.name}</h2>
                  <div className="kv"><span>Year</span><b>{cur.year} yr {cur.branch}</b></div>
                  {cur.role ? <div className="kv"><span>Role</span><b>{cap(cur.role)}</b></div> : null}
                  {cur.note ? <div className="kv"><span>Note</span><b>{cur.note}</b></div> : null}
                  <div className="actions">
                    {cur.status === 'requested' ? (<>
                      <Btn disabled={busy || !online} onClick={() => act(() => api.crewDecideJoin(club.id, cur.id, 'approve'))}>Approve</Btn>
                      <Btn kind="ghost" disabled={busy || !online} onClick={() => act(() => api.crewDecideJoin(club.id, cur.id, 'decline'))}>Decline</Btn>
                    </>) : (<>
                      <label className="lbl">Change role
                        <select value={cur.role ?? 'member'} disabled={busy || !online} onChange={(e) => act(() => api.crewChangeRole(club.id, cur.id, e.target.value as CrewHqRole))}>
                          {ROLES.map((r) => <option key={r} value={r}>{cap(r)}</option>)}
                        </select></label>
                      <Btn kind="danger" disabled={busy || !online} onClick={() => act(() => api.crewRemoveMember(club.id, cur.id))}>Remove</Btn>
                    </>)}
                  </div>
                </div></Card>
              </div>
            )}
          </>
        );
      }}
    </Async>
  );
}

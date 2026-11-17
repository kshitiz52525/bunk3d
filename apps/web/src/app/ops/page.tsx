'use client';
import { useState } from 'react';
import { ID_PHOTO_RETENTION_DAYS } from '@bunk3d/core';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, Card, Empty, PageHead } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../_console/blocks';

// OP1 Verifications. ID photos are visible to Bunk3d staff only.
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsVerifications(), []);
  const [sel, setSel] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [expires, setExpires] = useState<number | null>(null);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const decide = async (id: string, d: 'approve' | 'reject') => {
    setBusy(true);
    try { await api.opsDecideVerification(id, d, reason); say(d === 'approve' ? 'Approved. The ID image is deleted automatically 30 days after this decision.' : 'Rejected. The student is told why.'); setReason(''); setRejecting(false); state.reload(); }
    catch { say(d === 'reject' ? 'Add a reason to reject.' : 'That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(all) => {
        const queue = all.filter((v) => !v.decision);
        const cur = queue.find((v) => v.id === sel) ?? queue[0];
        return (
          <>
            <Eyebrow>OP1</Eyebrow>
            <PageHead title="Verifications" sub="Every action here is written to the audit log." actions={<SeedTag />} />
            {toast}
            {!cur ? <Empty title="Queue is clear." body="New ID uploads show up here. Reviewed within about 24 hours." /> : (
              <div className="split">
                <div className="tablewrap"><table>
                  <thead><tr><th>STUDENT</th><th>CAMPUS</th><th>METHOD</th><th>WAITING</th></tr></thead>
                  <tbody>{queue.map((v) => (
                    <tr key={v.id} className={v.id === cur.id ? 'sel' : ''}>
                      <td><button type="button" className="cellbtn" aria-pressed={v.id === cur.id} onClick={() => { setSel(v.id); setExpires(null); setRejecting(false); }}>{v.student}</button></td>
                      <td>{v.campus}</td><td>{v.method}</td><td>{v.waitingHours} h</td>
                    </tr>))}</tbody></table></div>
                <Card><div className="detail">
                  <h2>{cur.student} · {cur.campus}</h2>
                  <div className="idbox" role="img" aria-label="Student ID image area">{expires ? `[ID image · signed URL, expires in ${Math.round(expires / 60)} min]` : 'ID image is hidden until you load it. Staff only.'}</div>
                  <div className="actions"><Btn kind="ghost" disabled={!online} onClick={async () => setExpires((await api.opsIdPhoto(cur.id)).expiresInSec)}>Load ID image</Btn></div>
                  <div className="note">{cur.nameMatches ? 'Name matches profile' : 'Name does not match profile'} · {cur.collegeMatches ? 'college matches' : 'college does not match'} · DOB on ID: {cur.dobYear} ({new Date().getFullYear() - cur.dobYear >= 18 ? '18+' : 'under 18'})</div>
                  {rejecting ? <label className="lbl" style={{ display: 'grid', gap: 6, marginTop: 10 }}>Reason (required)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this rejected?" /></label> : null}
                  <div className="actions">
                    <Btn disabled={busy || !online} onClick={() => decide(cur.id, 'approve')}>Approve</Btn>
                    {rejecting ? <Btn kind="danger" disabled={busy || !online || !reason.trim()} onClick={() => decide(cur.id, 'reject')}>Confirm reject</Btn> : <Btn kind="ghost" disabled={busy || !online} onClick={() => setRejecting(true)}>Reject with reason</Btn>}
                  </div>
                  <div className="note">Image auto-deletes {ID_PHOTO_RETENTION_DAYS} days after decision.</div>
                </div></Card>
              </div>
            )}
          </>
        );
      }}
    </Async>
  );
}

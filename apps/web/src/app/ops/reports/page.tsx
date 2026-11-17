'use client';
import { useState } from 'react';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, Card, Empty, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../../_console/blocks';

// OP2 Reports and escalations. Anonymous author lookup needs a reason and is logged.
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsEscalations(), []);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [reveal, setReveal] = useState('');
  const resolve = async (id: string, a: string) => {
    setBusy(true);
    try { await api.opsResolveEscalation(id, a); say(`${a} saved and written to the audit log.`); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(items) => {
        const open = items.filter((i) => !i.resolved);
        const t = target || open[0]?.id || '';
        return (
          <>
            <Eyebrow>OP2</Eyebrow>
            <PageHead title="Reports & escalations" sub="Split mod votes, severe safety flags and appeals. Two matching mod votes decide; a split lands here." actions={<SeedTag />} />
            {toast}
            <Table head={['ITEM', 'SOURCE', 'MOD VOTES', 'DUE', 'ACTIONS']} empty={<><strong className="display">Nothing to review.</strong><p className="muted">Escalations show up here when mods split or a flag is severe.</p></>}
              rows={open.map((i) => [<span key="i"><b>{i.label}</b> · {i.preview}</span>, i.source, i.votes, i.dueInHours === null ? '-' : i.dueInHours === 0 ? 'now' : `in ${i.dueInHours} h`,
                <span key="a" className="row">{i.actions.map((a) => <Btn key={a} kind="ghost" disabled={busy || !online} onClick={() => resolve(i.id, a)}>{a}</Btn>)}</span>])} />
            <div style={{ marginTop: 16 }}>
              {open.length === 0 ? <Empty title="No lookups to run." /> : (
                <Card title="Anonymous author lookup">
                  <form className="form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { const r = await api.opsAnonLookup(t, reason); setReveal(`${r.reveal} Logged as ${r.auditId}.`); setReason(''); } catch { say('Add a reason to look up an author.', true); } finally { setBusy(false); } }}>
                    <label>Item<select value={t} onChange={(e) => setTarget(e.target.value)}>{open.map((i) => <option key={i.id} value={i.id}>{i.label} · {i.preview}</option>)}</select></label>
                    <label>Reason (required)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required), e.g. report number, threat" /></label>
                    <div><Btn type="submit" kind="danger" disabled={busy || !online || !reason.trim()}>Reveal &amp; log</Btn></div>
                    {reveal ? <div className="banner ok" role="status">{reveal}</div> : null}
                  </form>
                </Card>
              )}
            </div>
          </>
        );
      }}
    </Async>
  );
}

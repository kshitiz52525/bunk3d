'use client';
import { useState } from 'react';
import { useApi, useAsync } from '@bunk3d/api';
import { Badge, Btn, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, SeedTag, useOnline, useToast } from '../../_console/blocks';

// OP7 Brand and campaign review
export default function Page() {
  const api = useApi().console;
  const online = useOnline();
  const state = useAsync(() => api.opsBrandReview(), []);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const decide = async (id: string, d: string) => {
    setBusy(true);
    try { await api.opsDecideBrand(id, d); say(`${d} saved and written to the audit log.`); state.reload(); } catch { say('That did not save. Try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(items) => (
        <>
          <Eyebrow>OP7</Eyebrow>
          <PageHead title="Brand & campaign review" sub="Policy check and funding before anything goes live." actions={<SeedTag />} />
          {toast}
          <Table head={['ITEM', 'TYPE', 'POLICY CHECK', 'FUNDING', 'DECISION']} empty={<><strong className="display">Nothing to review.</strong><p className="muted">Campaigns and brand verifications show up here.</p></>}
            rows={items.map((b) => [<b key="i">{b.item}</b>, b.type, b.policyCheck, b.funding,
              b.decided ? <Badge key="d" tone="info">{b.decided}</Badge> : <span key="d" className="row">{b.decisions.map((d, i) => <Btn key={d} kind={i === 0 ? 'primary' : 'ghost'} disabled={busy || !online} onClick={() => decide(b.id, d)}>{d}</Btn>)}</span>])} />
        </>
      )}
    </Async>
  );
}

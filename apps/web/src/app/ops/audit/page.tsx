'use client';
import { useApi, useAsync } from '@bunk3d/api';
import { Btn, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, SeedTag } from '../../_console/blocks';

// OP8 Audit log. Append-only: this page has no edit or delete.
export default function Page() {
  const api = useApi().console;
  const state = useAsync(() => api.opsAuditLog(), []);
  return (
    <Async state={state}>
      {(rows) => (
        <>
          <Eyebrow>OP8</Eyebrow>
          <PageHead title="Audit log" sub="Append-only. Entries cannot be edited or deleted." actions={<><SeedTag /><Btn kind="ghost" onClick={state.reload}>Refresh</Btn></>} />
          <Table head={['TIME', 'ACTOR', 'ACTION', 'REASON']} empty={<><strong className="display">No entries yet.</strong><p className="muted">Every action in this console is written here.</p></>}
            rows={rows.map((a) => [new Date(a.atMs).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), a.actor, a.action, a.reason])} />
        </>
      )}
    </Async>
  );
}

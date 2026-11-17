'use client';
import { useEffect, useState } from 'react';
import { useApi, useAsync, type CcConsole, type CcSection } from '@bunk3d/api';
import { Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, Stat } from '@/components/kit';
import './hq.css';

const toneClass = { plain: '', warn: 't-warn', ok: 't-ok', err: 't-err', muted: 't-muted' } as const;

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);
  return on;
}

/** One console page (CO / BR / VN / FI). All content and amounts come from the API; this only renders and sends actions. */
export function SectionView(p: { console: CcConsole; id: string }) {
  return <SectionBody key={`${p.console}/${p.id}`} {...p} />;
}

function SectionBody({ console: c, id }: { console: CcConsole; id: string }) {
  const api = useApi();
  const online = useOnline();
  const state = useAsync(() => api.console.ccSection(c, id), [c, id]);
  const [local, setLocal] = useState<CcSection | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const [busy, setBusy] = useState(false);

  const offline = !online && (
    <div className="hq-banner warn" role="status"><span>You’re offline · showing what was last loaded. Actions are paused until you’re back.</span></div>
  );
  if (state.status === 'loading') return <>{offline}<Loading /></>;
  if (state.status === 'error') return <>{offline}<ErrorBox onRetry={state.reload} /></>;
  const s = local ?? state.data;

  const run = async (action: string, rowId?: string) => {
    setBusy(true);
    try {
      const r = await api.console.ccAct({ console: c, sectionId: s.id, rowId, action });
      if (r.ok) { setLocal(r.section); setToast({ text: r.message, kind: 'ok' }); } else setToast({ text: r.message, kind: 'err' });
    } catch {
      setToast({ text: 'That didn’t go through. Our bad, not yours. Try again.', kind: 'err' });
    } finally { setBusy(false); }
  };

  const firstHl = Math.max(0, s.rows.findIndex((r) => r.highlight));
  const idx = Math.min(sel ?? firstHl, s.rows.length - 1);
  const row = s.rows[idx];
  return (
    <div className="hq-stack">
      {offline}
      <PageHead
        title={s.title}
        sub={s.desc}
        actions={<Btn onClick={() => run(s.primary)} disabled={busy || !online}>{s.primary}</Btn>}
      />
      <div className="hq-eyebrow"><span>{s.code} · WAVE {s.wave}</span><Badge tone="violet">Seed data: fake names and numbers</Badge></div>
      {s.lock ? <div className="hq-banner warn" role="status">{s.lock}</div> : null}
      {toast ? (
        <div className={`hq-banner ${toast.kind}`} role={toast.kind === 'err' ? 'alert' : 'status'}>
          <span>{toast.text}</span><button type="button" onClick={() => setToast(null)}>Dismiss</button>
        </div>
      ) : null}
      <div className="grid">{s.kpis.map((k) => <Stat key={k.label} label={k.label} value={k.value} note={k.sub || undefined} />)}</div>
      {s.rows.length === 0 ? (
        <Empty title="Nothing here yet." body="Never a dead end." action={{ label: s.primary, onClick: () => run(s.primary) }} />
      ) : (
        <div className="hq-split">
          <div className="hq-table">
            <div className="tablewrap">
              <table>
                <thead><tr>{s.cols.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>
                  {s.rows.map((r, i) => (
                    <tr key={r.id} className={`${i === idx ? 'sel' : ''} ${r.highlight ? 'hl' : ''}`} onClick={() => setSel(i)}>
                      {r.cells.map((cell, j) => (
                        <td key={j} className={toneClass[cell.tone]}>
                          {j === 0 ? <button type="button" className="hq-cellbtn" aria-pressed={i === idx} onClick={() => setSel(i)}>{cell.text}</button> : cell.text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {row ? (
            <aside className="hq-detail" aria-label="Details">
              <Card title={row.detail.title}>
                {row.resolved ? <p><Badge tone="ok">Done: {row.resolved}</Badge></p> : null}
                <dl>{row.detail.lines.map(([k, v]) => <div className="ln" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                {row.detail.actions.length ? (
                  <div className="hq-actions">
                    {row.detail.actions.map((a, i) => <Btn key={a} kind={i === 0 ? 'primary' : 'ghost'} disabled={busy || !online} onClick={() => run(a, row.id)}>{a}</Btn>)}
                  </div>
                ) : null}
                {row.detail.note ? <p className="muted" style={{ fontSize: 12 }}>{row.detail.note}</p> : null}
              </Card>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

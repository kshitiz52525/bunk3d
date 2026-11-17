'use client';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import type { AsyncState, DetailRow, Kpi } from '@bunk3d/api';
import { Btn, Card, Empty, ErrorBox, Loading } from '@/components/kit';
import './console.css';

/** Browser online state (S1 offline). */
const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
};
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return <div className="banner off" role="status">You are offline. What you see may be out of date, and changes cannot be saved until you reconnect.</div>;
}

/** loading / error / (offline error) / ready. Empty handling stays with the caller. */
export function Async<T>({ state, children }: { state: AsyncState<T>; children: (data: T) => ReactNode }) {
  const online = useOnline();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    if (!online) return <Empty title="You are offline." body="Reconnect to load this page." action={{ label: 'Try again', onClick: state.reload }} />;
    return <ErrorBox onRetry={state.reload} />;
  }
  return <>{children(state.data)}</>;
}

export function useToast(): [ReactNode, (m: string, error?: boolean) => void] {
  const [t, setT] = useState<{ m: string; error: boolean } | null>(null);
  const node = t ? (
    <div className={t.error ? 'banner err' : 'banner ok'} role={t.error ? 'alert' : 'status'}>
      <span>{t.m}</span><Btn kind="ghost" onClick={() => setT(null)}>Dismiss</Btn>
    </div>
  ) : null;
  return [node, (m, error = false) => setT({ m, error })];
}

export const SeedTag = () => <span className="seedtag" title="Placeholder data for the frontend phase">Seed data</span>;

export function Eyebrow({ children }: { children: ReactNode }) { return <div className="eyebrow">{children}</div>; }

export function Kpis({ items }: { items: Kpi[] }) {
  return (
    <div className="kpis">
      {items.map((k, i) => (
        <div key={k.label} className={i === 0 ? 'kpi first' : 'kpi'}>
          <div className="label">{k.label}</div><div className="v">{k.value}</div><div className="muted">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** Table on the left, detail card on the right (CH1, CH8-CH12). */
export function TableDetail({ cols, rows, onAction, busy, emptyNode }: {
  cols: string[]; rows: DetailRow[]; onAction: (row: DetailRow, action: string) => void; busy?: boolean; emptyNode?: ReactNode;
}) {
  const [sel, setSel] = useState(0);
  if (!rows.length) return <>{emptyNode ?? <Empty title="Nothing here yet." />}</>;
  const cur = rows[Math.min(sel, rows.length - 1)]!;
  return (
    <div className="split">
      <div className="tablewrap">
        <table>
          <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`${i === sel ? 'sel' : ''} ${r.highlight ? 'hl' : ''}`}>
                {r.cells.map((c, j) => (
                  <td key={j} className={c.tone !== 'plain' ? `t-${c.tone}` : undefined}>
                    {j === 0 ? <button type="button" className="cellbtn" aria-pressed={i === sel} onClick={() => setSel(i)}>{c.text}</button> : c.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <div className="detail">
          <h2>{cur.title}</h2>
          {cur.lines.map(([k, v]) => <div className="kv" key={k}><span>{k}</span><b>{v}</b></div>)}
          <div className="actions">
            {cur.actions.map((a, i) => <Btn key={a} kind={i === 0 ? 'primary' : 'ghost'} disabled={busy} onClick={() => onAction(cur, a)}>{a}</Btn>)}
          </div>
          {cur.note ? <div className="note">{cur.note}</div> : null}
        </div>
      </Card>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountMenu } from './staff';

// Shared console kit. Dark only; styled by the classes in globals.css (tokens from @bunk3d/ui).
export type NavItem = { href: string; label: string };

/** Console frame: sidebar + content. Each console's layout.tsx wraps its pages with this. */
export function ConsoleShell({ title, nav, children }: { title: string; nav: NavItem[]; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="shell">
      <aside className="side" aria-label={`${title} navigation`}>
        <div className="brand display">bunk<b>3</b>d <span>{title}</span></div>
        <nav>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined} className={path === n.href ? 'on' : ''}>{n.label}</Link>
          ))}
        </nav>
        <AccountMenu />
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

export const PageHead = ({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) => (
  <header className="pagehead"><div><h1 className="display">{title}</h1>{sub ? <p className="muted">{sub}</p> : null}</div><div className="row">{actions}</div></header>
);
export const Card = ({ children, title }: { children: ReactNode; title?: string }) => (<section className="card">{title ? <h2>{title}</h2> : null}{children}</section>);
export const Stat = ({ label, value, note }: { label: string; value: string; note?: string }) => (<div className="card stat"><div className="label">{label}</div><div className="display num">{value}</div>{note ? <div className="muted">{note}</div> : null}</div>);
export const Badge = ({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' | 'err' | 'info' | 'violet' }) => (<span className={`badge ${tone}`}>{children}</span>);
export const Btn = ({ children, onClick, kind = 'primary', disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' }) => (<button type={type} className={`btn ${kind}`} onClick={onClick} disabled={disabled}>{children}</button>);
export function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty?: ReactNode }) {
  if (!rows.length) return <div className="empty">{empty ?? 'Nothing here yet.'}</div>;
  return (<div className="tablewrap"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>);
}
/** S1 states for web lists. */
export const Loading = () => (<div className="skeleton" role="status" aria-label="Loading"><span /><span /><span /></div>);
export const ErrorBox = ({ onRetry }: { onRetry: () => void }) => (<div className="empty"><strong className="display">That didn’t load.</strong><p className="muted">Our bad, not yours.</p><Btn kind="ghost" onClick={onRetry}>Try again</Btn></div>);
export const Empty = ({ title = 'Nothing here yet.', body, action }: { title?: string; body?: string; action?: { label: string; onClick: () => void } }) => (<div className="empty"><strong className="display">{title}</strong>{body ? <p className="muted">{body}</p> : null}{action ? <Btn onClick={action.onClick}>{action.label}</Btn> : null}</div>);

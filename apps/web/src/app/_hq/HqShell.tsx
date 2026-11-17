'use client';
import { useApi, useAsync, type CcConsole } from '@bunk3d/api';
import { ConsoleShell } from '@/components/kit';
import { HQ, hrefFor } from './sections';

/** Console frame: sidebar entries come from the API (ccNav); every page is a real route. */
export function HqShell({ console: c, children }: { console: CcConsole; children: React.ReactNode }) {
  const api = useApi();
  const nav = useAsync(() => api.console.ccNav(c), [c]);
  const items = nav.status === 'ready' ? nav.data.map((n) => ({ href: hrefFor(c, n.id), label: `${n.code}  ${n.label}` })) : HQ[c].ids.map((id) => ({ href: hrefFor(c, id), label: id.toUpperCase() }));
  return <ConsoleShell title={HQ[c].title} nav={items}>{children}</ConsoleShell>;
}

'use client';
import { ConsoleShell } from '@/components/kit';
import { OfflineBar } from '../_console/blocks';

const OPS_NAV = [
  { href: '/ops', label: 'Verifications' },
  { href: '/ops/reports', label: 'Reports & escalations' },
  { href: '/ops/users', label: 'Users & strikes' },
  { href: '/ops/campuses', label: 'Campuses, waves & flags' },
  { href: '/ops/roles', label: 'Roles' },
  { href: '/ops/spots', label: 'Radar spots' },
  { href: '/ops/brands', label: 'Brand & campaign review' },
  { href: '/ops/audit', label: 'Audit log' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Ops" nav={OPS_NAV}><OfflineBar />{children}</ConsoleShell>;
}

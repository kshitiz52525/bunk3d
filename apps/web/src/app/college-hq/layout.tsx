'use client';
import { ConsoleShell } from '@/components/kit';

// College HQ console frame. Add nav entries as pages are built.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="College HQ" nav={[{ href: '/college-hq', label: 'Overview' }]}>{children}</ConsoleShell>;
}
